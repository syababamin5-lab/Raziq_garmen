import sys
import os
sys.path.append(os.path.join(os.getcwd(), "erp_api"))

from models import SessionLocal
import models
from sqlalchemy import func

db = SessionLocal()

print("--- Mencari Duplikasi Nama Akun di COA ---")
duplicates = db.query(
    models.AkunBukuBesar.nama_akun,
    func.count('*').label('cnt')
).group_by(
    models.AkunBukuBesar.nama_akun
).having(func.count('*') > 1).all()

for d in duplicates:
    print(f"Nama Akun: {d.nama_akun} | Jumlah: {d.cnt}")
    accounts = db.query(models.AkunBukuBesar).filter(models.AkunBukuBesar.nama_akun == d.nama_akun).all()
    for a in accounts:
        print(f"  Kode: {a.kode_akun} | Kategori: {a.kategori}")
