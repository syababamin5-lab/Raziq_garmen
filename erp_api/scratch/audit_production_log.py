import sys
import os
import datetime
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker

# Paksa path ke folder erp_api
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import models

# Alamat database
DB_PATH = os.path.join(os.path.dirname(models.__file__), "garmen.db")
engine = create_engine(f"sqlite:///{DB_PATH}")
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

print(f"--- AUDIT DATABASE: {DB_PATH} ---")
print(f"File models berasal dari: {models.__file__}")
print(f"Daftar Atribut di models: {[a for a in dir(models) if not a.startswith('__')]}")

try:
    count = db.query(models.ProductionLog).count()
    print(f"Total baris di ProductionLog: {count}")
    
    logs = db.query(models.ProductionLog).order_by(models.ProductionLog.tanggal.desc()).limit(5).all()
    for l in logs:
        print(f"ID: {l.id} | Tgl: {l.tanggal} | SKU: {l.kode_sku} | Qty: {l.qty_hasil} | Div: {l.divisi}")
except Exception as e:
    print(f"ERROR SAAT QUERY: {e}")

db.close()
