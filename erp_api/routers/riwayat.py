import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import get_db
import models
import schemas
from utils import merge_date_time, format_rp
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
        waktu_void = merge_date_time(payload.tgl)
        
        for p in pasangan:
            new_jurnal = models.JurnalUmum(
                tanggal=waktu_void,
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

            # Balik/Hapus Log Produksi & Stok Inventori jika relevan
            if "Cutting" in ket or "Jahit" in ket:
                # Cari log produksi dengan keterangan/sku yang mirip
                sku_match = re.search(r'\[SKU:([^\]]+)\]', ket) or re.search(r'Masuk (\d+) pcs (.*?) \(Jahit\)', ket)
                if sku_match:
                    sku = sku_match.group(1).strip() if "SKU:" in ket else sku_match.group(2).strip()
                    qty_match = re.search(r'Cutting (\d+) pcs', ket) or re.search(r'Masuk (\d+) pcs', ket)
                    qty = int(qty_match.group(1)) if qty_match else 0
                    
                    # 1. Hapus log produksi terbaru untuk SKU ini
                    log_p = db.query(models.ProductionLog).filter(models.ProductionLog.kode_sku == sku).order_by(models.ProductionLog.id.desc()).first()
                    if log_p:
                        db.delete(log_p)
                    
                    # 2. Balik Stok Barang
                    barang = db.query(models.Barang).filter(models.Barang.kode_sku == sku).first()
                    if barang:
                        if "Jahit" in ket:
                            # Tadi masuk (nambah), sekarang kurangi
                            barang.stok_saat_ini -= qty
                        elif "Cutting" in ket:
                            # Tadi potong kain (tidak nambah stok baju, tapi ngurangin kain?)
                            # Cutting hanya mengurangi kain. Seharusnya kita balik stok kainnya.
                            # Tapi info kain_id tidak ada di jurnal. 
                            # Untuk saat ini kita fokus ke penyesuaian WIP (yang sudah beres di get_wip).
                            pass

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
        
        # Hapus hanya pasangan jurnal dengan keterangan DAN tanggal yang sama persis
        # Ini mencegah penghapusan massal jika ada mutasi dengan nominal & keterangan sama di waktu berbeda
        pasangan = db.query(models.JurnalUmum).filter(
            models.JurnalUmum.keterangan == ket,
            models.JurnalUmum.tanggal == jurnal.tanggal
        ).all()
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

@router.post("/fix-ovs08", response_model=schemas.APIResponse)
def fix_ovs08(db: Session = Depends(get_db)):
    """Maintenance endpoint to fix the OVS-08-JB issue and other data inconsistencies."""
    try:
        sku = "OVS-08-JB"
        # 1. Restore/Reactivate SKU
        item = db.query(models.Barang).filter(models.Barang.kode_sku == sku).first()
        if item:
            item.is_active = 1
        else:
            new_item = models.Barang(
                kode_sku=sku,
                nama_barang="Oversize cargo pendek",
                model_code="OVS-08",
                kategori="Barang Jadi (Baju)",
                satuan="Pcs",
                harga_jual=520000,
                harga_modal=39405,
                is_active=1,
                stok_saat_ini=0
            )
            db.add(new_item)
        
        # 2. Cleanup problematic VOID journals that doubled the WIP minus
        void_jurnals = db.query(models.JurnalUmum).filter(
            models.JurnalUmum.keterangan.like(f"%VOID%"),
            models.JurnalUmum.keterangan.like(f"%{sku}%")
        ).all()
        for j in void_jurnals:
            db.delete(j)
            
        db.commit()
        return schemas.APIResponse(success=True, message="Data SKU OVS-08-JB telah dipulihkan dan jurnal bermasalah telah dibersihkan.")
    except Exception as e:
        db.rollback()
        return schemas.APIResponse(success=False, message=str(e))
