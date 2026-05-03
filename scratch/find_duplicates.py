import sys
import os
sys.path.append(os.path.join(os.getcwd(), "erp_api"))

from models import SessionLocal
import models
from sqlalchemy import func

db = SessionLocal()

print("--- Investigasi Duplikasi Nominal di Jurnal ---")
# Cari nominal yang muncul lebih dari 2 kali di tanggal yang sama (karena 1 transaksi = 2 baris)
duplicates = db.query(
    models.JurnalUmum.tanggal,
    func.abs(models.JurnalUmum.debit + models.JurnalUmum.kredit).label('amount'),
    func.count('*').label('cnt')
).group_by(
    models.JurnalUmum.tanggal,
    'amount'
).having(func.count('*') > 2).all()

for d in duplicates:
    print(f"\nTanggal: {d.tanggal} | Nominal: {d.amount} | Jumlah Baris: {d.cnt}")
    rows = db.query(models.JurnalUmum).filter(
        models.JurnalUmum.tanggal == d.tanggal,
        func.abs(models.JurnalUmum.debit + models.JurnalUmum.kredit) == d.amount
    ).all()
    for r in rows:
        print(f"  ID: {r.id} | Akun: {r.kode_akun} | Nama: {r.nama_akun} | D: {r.debit} | K: {r.kredit} | Ket: {r.keterangan}")
