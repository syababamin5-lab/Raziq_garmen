import sys
import os
sys.path.append(os.path.join(os.getcwd(), "erp_api"))

from models import SessionLocal
import models
import datetime

db = SessionLocal()

# 1. Mock an OPEX submission for Cutting (51210)
print("Inserting mock OPEX for Cutting...")
tgl = datetime.datetime.now()
db.add(models.JurnalUmum(
    tanggal=tgl,
    kode_akun="51210",
    nama_akun="BTKL - Upah Cutting",
    keterangan="Test Opex Cutting",
    debit=1000000,
    kredit=0
))
db.add(models.JurnalUmum(
    tanggal=tgl,
    kode_akun="11110",
    nama_akun="Kas Tunai",
    keterangan="Test Opex Cutting",
    debit=0,
    kredit=1000000
))
db.commit()

# 2. Check the financial report data
from routers.laporan import get_saldo_sqlite
start = tgl.replace(day=1, hour=0, minute=0, second=0)
end = tgl.replace(hour=23, minute=59, second=59)

print("\n--- Saldo BTKL (512) ---")
v, d = get_saldo_sqlite(db, "512", start, end)
print(f"Total: {v}")
print(f"Detail: {d}")

print("\n--- Saldo BOP (513) ---")
v_bop, d_bop = get_saldo_sqlite(db, "513", start, end)
print(f"Total: {v_bop}")
print(f"Detail: {d_bop}")

# Cleanup
db.query(models.JurnalUmum).filter(models.JurnalUmum.keterangan == "Test Opex Cutting").delete()
db.commit()
