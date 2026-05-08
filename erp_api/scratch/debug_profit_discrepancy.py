import os
import datetime
from sqlalchemy import create_engine, func, or_
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

def get_saldo(kode_prefix, start_date, end_date):
    query = db.query(models.JurnalUmum).filter(
        models.JurnalUmum.kode_akun.startswith(kode_prefix),
        models.JurnalUmum.tanggal >= start_date,
        models.JurnalUmum.tanggal < end_date
    )
    jurnals = query.all()
    total = 0
    for j in jurnals:
        val = (j.debit or 0) - (j.kredit or 0)
        if j.kode_akun.startswith(("2", "3", "4")):
            val = (j.kredit or 0) - (j.debit or 0)
        total += val
    return total

# Periode Mei 2026
start_date = datetime.datetime(2026, 5, 1)
end_date = datetime.datetime(2026, 6, 1)

print(f"--- ANALISIS DATA MEI 2026 ---")

# 1. Logic Report (laporan.py)
omzet = get_saldo("411", start_date, end_date)
baku = get_saldo("5111", start_date, end_date)
btkl = get_saldo("512", start_date, end_date)
bop = get_saldo("513", start_date, end_date)
ikhtisar = get_saldo("51199", start_date, end_date)
terjual = get_saldo("51120", start_date, end_date)
hpp_report = baku + btkl + bop + ikhtisar + terjual

beban_jual = get_saldo("61", start_date, end_date)
beban_admin = get_saldo("62", start_date, end_date)

laba_bersih_report = omzet - hpp_report - beban_jual - beban_admin

print(f"REPORT LOGIC:")
print(f"  Omzet (411): {omzet:,.0f}")
print(f"  HPP (5111, 512, 513, 51199, 51120): {hpp_report:,.0f}")
print(f"  Beban Jual (61): {beban_jual:,.0f}")
print(f"  Beban Admin (62): {beban_admin:,.0f}")
print(f"  Laba Bersih: {laba_bersih_report:,.0f}")

# 2. Logic AI (Naive / General)
# AI likely does: sum(4%) - sum(5%) - sum(6%)
all_4 = get_saldo("4", start_date, end_date)
all_5 = get_saldo("5", start_date, end_date)
all_6 = get_saldo("6", start_date, end_date)
laba_bersih_ai = all_4 - all_5 - all_6

print(f"\nAI LOGIC (GENERAL):")
print(f"  All 4xxxx: {all_4:,.0f}")
print(f"  All 5xxxx: {all_5:,.0f}")
print(f"  All 6xxxx: {all_6:,.0f}")
print(f"  Laba Bersih: {laba_bersih_ai:,.0f}")

# 3. Check for specific accounts that might cause discrepancy
print(f"\nDISCREPANCY CHECK:")
# Check for 5xxxx that are NOT in the report list
other_5 = db.query(models.JurnalUmum.kode_akun, models.JurnalUmum.nama_akun, func.sum(models.JurnalUmum.debit - models.JurnalUmum.kredit)).filter(
    models.JurnalUmum.kode_akun.startswith('5'),
    ~models.JurnalUmum.kode_akun.startswith('5111'),
    ~models.JurnalUmum.kode_akun.startswith('512'),
    ~models.JurnalUmum.kode_akun.startswith('513'),
    ~models.JurnalUmum.kode_akun.startswith('51199'),
    ~models.JurnalUmum.kode_akun.startswith('51120'),
    models.JurnalUmum.tanggal >= start_date,
    models.JurnalUmum.tanggal < end_date
).group_by(models.JurnalUmum.kode_akun, models.JurnalUmum.nama_akun).all()

if other_5:
    print(f"  Accounts in 5xxxx NOT included in Report HPP:")
    for code, name, val in other_5:
        print(f"    - {code} ({name}): {val:,.0f}")
else:
    print(f"  No other 5xxxx accounts found.")

# Check for 4xxxx that are NOT 411
other_4 = db.query(models.JurnalUmum.kode_akun, models.JurnalUmum.nama_akun, func.sum(models.JurnalUmum.kredit - models.JurnalUmum.debit)).filter(
    models.JurnalUmum.kode_akun.startswith('4'),
    ~models.JurnalUmum.kode_akun.startswith('411'),
    models.JurnalUmum.tanggal >= start_date,
    models.JurnalUmum.tanggal < end_date
).group_by(models.JurnalUmum.kode_akun, models.JurnalUmum.nama_akun).all()

if other_4:
    print(f"  Accounts in 4xxxx NOT included in Report Omzet:")
    for code, name, val in other_4:
        print(f"    - {code} ({name}): {val:,.0f}")

# Check for 6xxxx that are NOT 61 or 62
other_6 = db.query(models.JurnalUmum.kode_akun, models.JurnalUmum.nama_akun, func.sum(models.JurnalUmum.debit - models.JurnalUmum.kredit)).filter(
    models.JurnalUmum.kode_akun.startswith('6'),
    ~models.JurnalUmum.kode_akun.startswith('61'),
    ~models.JurnalUmum.kode_akun.startswith('62'),
    models.JurnalUmum.tanggal >= start_date,
    models.JurnalUmum.tanggal < end_date
).group_by(models.JurnalUmum.kode_akun, models.JurnalUmum.nama_akun).all()

if other_6:
    print(f"  Accounts in 6xxxx NOT included in Report Beban:")
    for code, name, val in other_6:
        print(f"    - {code} ({name}): {val:,.0f}")

db.close()
