import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import get_db
import models
import schemas

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
        nama_debit = "Kas Tunai" if payload.sumber == "Kas Tunai" else "Kas di Bank"
        
        db.add(models.JurnalUmum(
            tanggal=datetime.datetime.now(), 
            kode_akun=kode_debit, nama_akun=nama_debit, 
            keterangan=f"Terima Piutang: {cust.nama_mitra} - {payload.keterangan}", 
            debit=payload.nominal, kredit=0
        ))
        db.add(models.JurnalUmum(
            tanggal=datetime.datetime.now(), 
            kode_akun="11210", nama_akun="Piutang Usaha", 
            keterangan=f"Pelunasan: {cust.nama_mitra}", 
            debit=0, kredit=payload.nominal
        ))
        
        db.commit()

        return schemas.APIResponse(success=True, message=f"Penerimaan piutang {cust.nama_mitra} berhasil.")
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
        nama_kredit = "Kas Tunai" if payload.sumber == "Kas Tunai" else "Kas di Bank"
        
        db.add(models.JurnalUmum(tanggal=datetime.datetime.now(), kode_akun="21110", nama_akun="Utang Usaha", keterangan=f"Bayar Utang: {supp.nama_mitra}", debit=payload.nominal, kredit=0))
        db.add(models.JurnalUmum(tanggal=datetime.datetime.now(), kode_akun=kode_kredit, nama_akun=nama_kredit, keterangan=f"Pelunasan ke {supp.nama_mitra} - {payload.keterangan}", debit=0, kredit=payload.nominal))

        db.commit()
        return schemas.APIResponse(success=True, message=f"Pembayaran utang ke {supp.nama_mitra} berhasil.")
    except Exception as e:
        db.rollback()
        return schemas.APIResponse(success=False, message=str(e))

@router.post("/mutasi", response_model=schemas.APIResponse)
def mutasi_kas(payload: schemas.MutationRequest, db: Session = Depends(get_db)):
    try:
        if payload.jenis == "Setor Tunai":
            db.add(models.JurnalUmum(tanggal=datetime.datetime.now(), kode_akun="11120", nama_akun="Kas di Bank", keterangan="Setoran Kas ke Bank", debit=payload.nominal, kredit=0))
            db.add(models.JurnalUmum(tanggal=datetime.datetime.now(), kode_akun="11110", nama_akun="Kas Tunai", keterangan="Setoran Kas ke Bank", debit=0, kredit=payload.nominal))
        else:
            db.add(models.JurnalUmum(tanggal=datetime.datetime.now(), kode_akun="11110", nama_akun="Kas Tunai", keterangan="Penarikan Bank ke Kas", debit=payload.nominal, kredit=0))
            db.add(models.JurnalUmum(tanggal=datetime.datetime.now(), kode_akun="11120", nama_akun="Kas di Bank", keterangan="Penarikan Bank ke Kas", debit=0, kredit=payload.nominal))

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
        nama_debit = "Kas Tunai" if payload.sumber == "Kas Tunai" else "Kas di Bank"
        
        db.add(models.JurnalUmum(tanggal=datetime.datetime.now(), kode_akun=kode_debit, nama_akun=nama_debit, keterangan=f"Cicilan Kasbon: {kary.nama_karyawan}", debit=payload.nominal, kredit=0))
        db.add(models.JurnalUmum(tanggal=datetime.datetime.now(), kode_akun="11220", nama_akun="Piutang Karyawan", keterangan=f"Cicilan Kasbon: {kary.nama_karyawan}", debit=0, kredit=payload.nominal))

        db.commit()
        return schemas.APIResponse(success=True, message=f"Pembayaran kasbon {kary.nama_karyawan} berhasil.")
    except Exception as e:
        db.rollback()
        return schemas.APIResponse(success=False, message=str(e))
