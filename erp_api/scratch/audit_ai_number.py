import os
import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import models

# Setup DB
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL")
if not SQLALCHEMY_DATABASE_URL:
    BASE_DIR = os.path.dirname(os.path.abspath("d:/sistem_garmen_v2/erp_api/models.py"))
    DB_PATH = os.path.join(BASE_DIR, "garmen.db")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

start_date = "2026-05-01"
end_date = "2026-06-01"

print(f"--- DATABASE AUDIT (May 2026) ---")

# 1. Total Pendapatan (4xxxx)
res_4 = db.execute(text(f"SELECT SUM(kredit - debit) FROM jurnal_umum WHERE kode_akun LIKE '4%' AND tanggal >= '{start_date}' AND tanggal < '{end_date}'")).scalar() or 0
print(f"Total 4xxxx (May): {res_4:,.2f}")

# 2. Total HPP (5xxxx)
res_5 = db.execute(text(f"SELECT SUM(debit - kredit) FROM jurnal_umum WHERE kode_akun LIKE '5%' AND tanggal >= '{start_date}' AND tanggal < '{end_date}'")).scalar() or 0
print(f"Total 5xxxx (May): {res_5:,.2f}")

# 3. Total Beban (6xxxx)
res_6 = db.execute(text(f"SELECT SUM(debit - kredit) FROM jurnal_umum WHERE kode_akun LIKE '6%' AND tanggal >= '{start_date}' AND tanggal < '{end_date}'")).scalar() or 0
print(f"Total 6xxxx (May): {res_6:,.2f}")

laba_may = res_4 - res_5 - res_6
print(f"Laba Bersih Simple (May): {laba_may:,.2f}")

print(f"\n--- DATABASE AUDIT (All Time) ---")
res_4_all = db.execute(text(f"SELECT SUM(kredit - debit) FROM jurnal_umum WHERE kode_akun LIKE '4%'")).scalar() or 0
res_5_all = db.execute(text(f"SELECT SUM(debit - kredit) FROM jurnal_umum WHERE kode_akun LIKE '5%'")).scalar() or 0
res_6_all = db.execute(text(f"SELECT SUM(debit - kredit) FROM jurnal_umum WHERE kode_akun LIKE '6%'")).scalar() or 0
print(f"Total 4xxxx (All): {res_4_all:,.2f}")
print(f"Total 5xxxx (All): {res_5_all:,.2f}")
print(f"Total 6xxxx (All): {res_6_all:,.2f}")
laba_all = res_4_all - res_5_all - res_6_all
print(f"Laba Bersih Simple (All): {laba_all:,.2f}")

# Check for the mysterious 4,199,942.25
if abs(laba_may - (-4199942.25)) < 100:
    print(f"\nMATCH FOUND: AI used May data with simple logic.")
elif abs(laba_all - (-4199942.25)) < 100:
    print(f"\nMATCH FOUND: AI used ALL TIME data with simple logic.")
else:
    print(f"\nNO MATCH FOUND for -4,199,942.25 in local DB.")

# Check for accounts starting with 5 that might be weird
print(f"\n--- 5xxxx Accounts Detail (May) ---")
details_5 = db.execute(text(f"SELECT kode_akun, nama_akun, SUM(debit) as d, SUM(kredit) as k FROM jurnal_umum WHERE kode_akun LIKE '5%' AND tanggal >= '{start_date}' AND tanggal < '{end_date}' GROUP BY kode_akun, nama_akun")).fetchall()
for r in details_5:
    print(f"  {r[0]} ({r[1]}): Debit={r[2]:,.2f}, Kredit={r[3]:,.2f}, Net={(r[2]-r[3]):,.2f}")

db.close()
