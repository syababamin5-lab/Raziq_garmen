import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import get_db
import models
import schemas

from utils import merge_date_time

router = APIRouter(prefix="/api/karyawan", tags=["Manajemen Karyawan"])

@router.post("/kasbon-baru", response_model=schemas.APIResponse)
def tambah_kasbon(payload: schemas.KasbonLoanRequest, db: Session = Depends(get_db)):
    try:
        kary = db.query(models.Karyawan).filter(models.Karyawan.id == payload.karyawan_id).first()
        if not kary: return schemas.APIResponse(success=False, message="Karyawan tidak ditemukan")

        # 1. Update Saldo Kasbon
        kary.saldo_kasbon = (kary.saldo_kasbon or 0) + payload.nominal

        # 2. Jurnal Umum
        kode_kredit = "11110" if payload.sumber == "Kas Tunai" else "11120"
        nama_kredit = "Kas Tunai" if payload.sumber == "Kas Tunai" else "BCA"
        
        waktu_bayar = merge_date_time(payload.tgl)
        
        db.add(models.JurnalUmum(
            tanggal=waktu_bayar, 
            kode_akun="11220", nama_akun="Piutang Karyawan", 
            keterangan=f"Kasbon Baru: {kary.nama_karyawan}", debit=payload.nominal, kredit=0
        ))
        db.add(models.JurnalUmum(
            tanggal=waktu_bayar, 
            kode_akun=kode_kredit, nama_akun=nama_kredit, 
            keterangan=f"Keluar Kasbon: {kary.nama_karyawan}", debit=0, kredit=payload.nominal
        ))
        
        db.commit()

        return schemas.APIResponse(success=True, message=f"Pemberian kasbon {kary.nama_karyawan} berhasil tercatat.")
    except Exception as e:
        db.rollback()
        return schemas.APIResponse(success=False, message=str(e))
