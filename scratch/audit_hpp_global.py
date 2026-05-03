import sys
import os
sys.path.append(os.path.join(os.getcwd(), "erp_api"))

from models import SessionLocal
import models

db = SessionLocal()

print(f"--- Semua Saldo Akun Kepala 5 ---")
q = db.query(models.JurnalUmum).filter(models.JurnalUmum.kode_akun.startswith('5'))

totals = {}
for j in q.all():
    val = (j.debit or 0) - (j.kredit or 0)
    key = f"{j.kode_akun} - {j.nama_akun}"
    totals[key] = totals.get(key, 0) + val

for k, v in sorted(totals.items()):
    if v != 0:
        print(f"{k}: Rp {v:,.0f}")
