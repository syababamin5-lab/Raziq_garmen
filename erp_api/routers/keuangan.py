import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import get_db
import models
import schemas
from utils import merge_date_time

router = APIRouter(prefix="/api/keuangan", tags=["Keuangan & Arus Kas"])

@router.post("/terima-piutang", response_model=schemas.APIResponse)
def terima_piutang(payload: schemas.CollectionRequest, db: Session = Depends(get_db)):
    try:
        cust = db.query(models.Mitra).filter(models.Mitra.id == payload.customer_id).first()
        if not cust: return schemas.APIResponse(success=False, message="Customer tidak ditemukan")

        # Update Saldo Mitra
        cust.saldo_piutang = (cust.saldo_piutang or 0) - payload.nominal

        # Jurnal Umum
        kode_debit = "11110" if payload.sumber == "Kas Tunai" else "11120"
        nama_debit = "Kas Tunai" if payload.sumber == "Kas Tunai" else "BCA"
        
        waktu_bayar = merge_date_time(payload.tgl)
        
        db.add(models.JurnalUmum(
            tanggal=waktu_bayar, 
            kode_akun=kode_debit, nama_akun=nama_debit, 
            keterangan=f"Terima Piutang: {cust.nama_mitra} - {payload.keterangan}", 
            debit=payload.nominal, kredit=0
        ))
        db.add(models.JurnalUmum(
            tanggal=waktu_bayar, 
            kode_akun="11210", nama_akun="Piutang Usaha", 
            keterangan=f"Pelunasan: {cust.nama_mitra}", 
            debit=0, kredit=payload.nominal
        ))

        # ============================================================
        # FIFO MATCHING: Distribusikan pembayaran ke invoice Tempo
        # terlama terlebih dahulu (First In, First Out)
        # ============================================================
        sisa_bayar = float(payload.nominal)
        invoices_tempo = (
            db.query(models.HeaderPenjualan)
            .filter(
                models.HeaderPenjualan.nama_customer == cust.nama_mitra,
                models.HeaderPenjualan.status == "Tempo"
            )
            .order_by(
                models.HeaderPenjualan.tanggal.asc(),
                models.HeaderPenjualan.id.asc()
            )
            .all()
        )

        invoices_lunas_baru = []
        for inv in invoices_tempo:
            if sisa_bayar <= 0:
                break
            sisa_inv = inv.sisa_tagihan if (inv.sisa_tagihan is not None and inv.sisa_tagihan > 0) \
                       else max(0.0, inv.total_tagihan - (inv.uang_muka or 0.0))
            
            if sisa_bayar >= sisa_inv:
                # Invoice ini terlunasi penuh
                sisa_bayar -= sisa_inv
                inv.sisa_tagihan = 0.0
                inv.status = "Lunas"
                invoices_lunas_baru.append(inv.no_invoice)
            else:
                # Invoice terlunasi sebagian
                inv.sisa_tagihan = sisa_inv - sisa_bayar
                sisa_bayar = 0.0
        # ============================================================

        db.commit()

        # Buat pesan informatif
        msg = f"Penerimaan piutang {cust.nama_mitra} berhasil."
        if invoices_lunas_baru:
            msg += f" Invoice LUNAS: {', '.join(invoices_lunas_baru)}."

        return schemas.APIResponse(success=True, message=msg)
    except Exception as e:
        db.rollback()
        return schemas.APIResponse(success=False, message=str(e))

@router.get("/saldo", response_model=schemas.APIResponse)
def get_saldo_kas_bank(db: Session = Depends(get_db)):
    try:
        # Kalkulasi saldo dari ledger
        tunai = db.query(func.sum(models.JurnalUmum.debit - models.JurnalUmum.kredit)).filter(models.JurnalUmum.kode_akun == "11110").scalar() or 0
        bank = db.query(func.sum(models.JurnalUmum.debit - models.JurnalUmum.kredit)).filter(models.JurnalUmum.kode_akun == "11120").scalar() or 0

        return schemas.APIResponse(success=True, message="Success", data={"kas": tunai, "bank": bank})
    except Exception as e:
        return schemas.APIResponse(success=False, message=str(e))

@router.post("/bayar-utang", response_model=schemas.APIResponse)
def bayar_utang(payload: schemas.PaymentRequest, db: Session = Depends(get_db)):
    try:
        supp = db.query(models.Mitra).filter(models.Mitra.id == payload.supplier_id).first()
        if not supp: return schemas.APIResponse(success=False, message="Supplier tidak ditemukan")

        # Update Saldo
        supp.saldo_utang = (supp.saldo_utang or 0) - payload.nominal

        # Jurnal
        kode_kredit = "11110" if payload.sumber == "Kas Tunai" else "11120"
        nama_kredit = "Kas Tunai" if payload.sumber == "Kas Tunai" else "BCA"
        
        waktu_bayar = merge_date_time(payload.tgl)
        
        db.add(models.JurnalUmum(tanggal=waktu_bayar, kode_akun="21110", nama_akun="Utang Usaha", keterangan=f"Bayar Utang: {supp.nama_mitra}", debit=payload.nominal, kredit=0))
        db.add(models.JurnalUmum(tanggal=waktu_bayar, kode_akun=kode_kredit, nama_akun=nama_kredit, keterangan=f"Pelunasan ke {supp.nama_mitra} - {payload.keterangan}", debit=0, kredit=payload.nominal))

        db.commit()
        return schemas.APIResponse(success=True, message=f"Pembayaran utang ke {supp.nama_mitra} berhasil.")
    except Exception as e:
        db.rollback()
        return schemas.APIResponse(success=False, message=str(e))

@router.post("/mutasi", response_model=schemas.APIResponse)
def mutasi_kas(payload: schemas.MutationRequest, db: Session = Depends(get_db)):
    try:
        waktu_mutasi = merge_date_time(payload.tgl)
        if payload.jenis == "Setor Tunai":
            db.add(models.JurnalUmum(tanggal=waktu_mutasi, kode_akun="11120", nama_akun="BCA", keterangan="Setoran Kas ke Bank", debit=payload.nominal, kredit=0))
            db.add(models.JurnalUmum(tanggal=waktu_mutasi, kode_akun="11110", nama_akun="Kas Tunai", keterangan="Setoran Kas ke Bank", debit=0, kredit=payload.nominal))
        else:
            db.add(models.JurnalUmum(tanggal=waktu_mutasi, kode_akun="11110", nama_akun="Kas Tunai", keterangan="Penarikan Bank ke Kas", debit=payload.nominal, kredit=0))
            db.add(models.JurnalUmum(tanggal=waktu_mutasi, kode_akun="11120", nama_akun="BCA", keterangan="Penarikan Bank ke Kas", debit=0, kredit=payload.nominal))

        db.commit()
        return schemas.APIResponse(success=True, message=f"Mutasi {payload.jenis} berhasil dicatat.")
    except Exception as e:
        db.rollback()
        return schemas.APIResponse(success=False, message=str(e))

@router.post("/bayar-kasbon", response_model=schemas.APIResponse)
def bayar_kasbon(payload: schemas.KasbonPaymentRequest, db: Session = Depends(get_db)):
    try:
        kary = db.query(models.Karyawan).filter(models.Karyawan.id == payload.karyawan_id).first()
        if not kary: return schemas.APIResponse(success=False, message="Karyawan tidak ditemukan")
        
        kary.saldo_kasbon = (kary.saldo_kasbon or 0) - payload.nominal

        kode_debit = "11110" if payload.sumber == "Kas Tunai" else "11120"
        nama_debit = "Kas Tunai" if payload.sumber == "Kas Tunai" else "BCA"
        
        waktu_bayar = merge_date_time(payload.tgl)
        
        db.add(models.JurnalUmum(tanggal=waktu_bayar, kode_akun=kode_debit, nama_akun=nama_debit, keterangan=f"Cicilan Kasbon: {kary.nama_karyawan}", debit=payload.nominal, kredit=0))
        db.add(models.JurnalUmum(tanggal=waktu_bayar, kode_akun="11220", nama_akun="Piutang Karyawan", keterangan=f"Cicilan Kasbon: {kary.nama_karyawan}", debit=0, kredit=payload.nominal))

        db.commit()
        return schemas.APIResponse(success=True, message=f"Pembayaran kasbon {kary.nama_karyawan} berhasil.")
    except Exception as e:
        db.rollback()
        return schemas.APIResponse(success=False, message=str(e))
