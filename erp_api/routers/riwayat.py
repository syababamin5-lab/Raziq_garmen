import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import get_db
import models
import schemas
import re

router = APIRouter(prefix="/api/riwayat", tags=["Riwayat & Void"])

@router.get("/transaksi")
def get_riwayat_transaksi(db: Session = Depends(get_db), limit: int = 100):
    data = db.query(models.JurnalUmum).order_by(models.JurnalUmum.tanggal.desc()).limit(limit).all()
    return {"success": True, "data": data}

@router.post("/void", response_model=schemas.APIResponse)
async def void_transaksi(payload: schemas.VoidRequest, db: Session = Depends(get_db)):
    try:
        jurnal = db.query(models.JurnalUmum).filter(models.JurnalUmum.id == payload.jurnal_id).first()
        if not jurnal: return schemas.APIResponse(success=False, message="Jurnal tidak ditemukan")
        
        ket = str(jurnal.keterangan)
        if any(x in ket for x in ["INV-", "PO-", "Retur"]):
            return schemas.APIResponse(success=False, message="Transaksi Faktur tidak bisa divoid manual. Gunakan Retur!")
        if "VOID" in ket:
            return schemas.APIResponse(success=False, message="Transaksi ini sudah berstatus VOID, tidak bisa divoid ulang!")

        pasangan = db.query(models.JurnalUmum).filter(models.JurnalUmum.keterangan == ket).all()
        alasan = payload.alasan or "Tanpa alasan"
        
        for p in pasangan:
            new_jurnal = models.JurnalUmum(
                tanggal=datetime.datetime.now(),
                kode_akun=p.kode_akun,
                nama_akun=p.nama_akun,
                keterangan=f"VOID: {ket} | Alasan: {alasan}",
                debit=p.kredit,
                kredit=p.debit
            )
            db.add(new_jurnal)
            
            # Balik saldo kasbon jika relevan
            if "Kasbon" in ket:
                match = re.search(r':\s*(.*)', ket)
                if match:
                    nama = match.group(1).strip()
                    karyawan = db.query(models.Karyawan).filter(models.Karyawan.nama_karyawan == nama).first()
                    if karyawan:
                        nom = p.debit if p.kode_akun == "11220" else p.kredit
                        if "Baru" in ket:
                             karyawan.saldo_kasbon -= nom
                        elif "Cicilan" in ket:
                             karyawan.saldo_kasbon += nom

            # Balik/Hapus Log Produksi jika relevan (agar dashboard sinkron)
            if "Cutting" in ket or "Jahit" in ket:
                # Cari log produksi dengan keterangan/sku yang mirip
                sku_match = re.search(r'\[SKU:([^\]]+)\]', ket) or re.search(r'pcs\s+(.*?)\s+\(Jahit\)', ket)
                if sku_match:
                    sku = sku_match.group(1).strip()
                    # Kita hapus log produksi terbaru untuk SKU ini yang divoid
                    log_p = db.query(models.ProductionLog).filter(models.ProductionLog.kode_sku == sku).order_by(models.ProductionLog.id.desc()).first()
                    if log_p:
                        db.delete(log_p)

        db.commit()
        return schemas.APIResponse(success=True, message=f"VOID '{ket}' berhasil. Jurnal pembalik otomatis telah dibuat.")
    except Exception as e:
        db.rollback()
        return schemas.APIResponse(success=False, message=str(e))


@router.delete("/hapus/{jurnal_id}", response_model=schemas.APIResponse)
def hapus_jurnal(jurnal_id: int, db: Session = Depends(get_db)):
    """
    HARD DELETE - Hanya untuk Super Admin.
    Menghapus SEMUA baris jurnal dengan keterangan yang sama secara permanen.
    Gunakan HANYA untuk data yang salah input total / typo.
    """
    try:
        jurnal = db.query(models.JurnalUmum).filter(models.JurnalUmum.id == jurnal_id).first()
        if not jurnal:
            return schemas.APIResponse(success=False, message="Jurnal tidak ditemukan")
        
        ket = str(jurnal.keterangan)
        if any(x in ket for x in ["INV-", "PO-"]):
            return schemas.APIResponse(
                success=False, 
                message="DITOLAK! Transaksi faktur tidak bisa dihapus langsung. Gunakan fitur Retur."
            )
        
        # Hapus semua pasangan jurnal dengan keterangan yang sama
        pasangan = db.query(models.JurnalUmum).filter(models.JurnalUmum.keterangan == ket).all()
        jumlah = len(pasangan)
        for p in pasangan:
            db.delete(p)
        
        db.commit()
        return schemas.APIResponse(
            success=True, 
            message=f"Berhasil menghapus {jumlah} baris jurnal '{ket}' secara permanen."
        )
    except Exception as e:
        db.rollback()
        return schemas.APIResponse(success=False, message=str(e))
