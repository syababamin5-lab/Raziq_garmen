import sys
import os
sys.path.append(os.path.join(os.getcwd(), "erp_api"))

from models import SessionLocal
import models
import datetime

db = SessionLocal()
start_date = datetime.datetime(2026, 4, 1) 
end_date = datetime.datetime(2026, 5, 1)

print(f"--- Detail Jurnal Kepala 5 (April 2026) ---")
q = db.query(models.JurnalUmum).filter(
    models.JurnalUmum.kode_akun.startswith('5'),
    models.JurnalUmum.tanggal >= start_date,
    models.JurnalUmum.tanggal < end_date
)

jurnals = q.all()
totals = {}
for j in jurnals:
    val = (j.debit or 0) - (j.kredit or 0)
    key = f"{j.kode_akun} - {j.nama_akun}"
    totals[key] = totals.get(key, 0) + val

for k, v in sorted(totals.items()):
    print(f"{k}: Rp {v:,.0f}")
