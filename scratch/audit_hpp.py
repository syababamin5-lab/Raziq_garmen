import sys
import os
# Tambahkan folder erp_api ke sys.path
sys.path.append(os.path.join(os.getcwd(), "erp_api"))

from models import SessionLocal
import models
from sqlalchemy import func
import datetime

db = SessionLocal()
# Coba Mei 2026 karena hari ini 3 Mei 2026
start_date = datetime.datetime(2026, 5, 1) 
end_date = datetime.datetime(2026, 6, 1)

def check_hpp(start, end):
    print(f"\n--- Audit HPP {start.strftime('%B %Y')} ---")
    
    accounts = {
        "5111": "Bahan Baku",
        "512": "BTKL",
        "513": "BOP",
        "51120": "Terjual",
        "51199": "Ikhtisar"
    }
    
    total_calc = 0
    for prefix, label in accounts.items():
        q = db.query(models.JurnalUmum).filter(
            models.JurnalUmum.kode_akun.startswith(prefix),
            models.JurnalUmum.tanggal >= start,
            models.JurnalUmum.tanggal < end
        )
        jurnals = q.all()
        val = 0
        for j in jurnals:
            val += (j.debit or 0) - (j.kredit or 0)
        
        print(f"{label} ({prefix}): Rp {val:,.0f}")
        if label == "Ikhtisar":
            total_calc -= val
        else:
            total_calc += val
            
    print(f"TOTAL HPP CALCULATED: Rp {total_calc:,.0f}")

# Cek April dan Mei
check_hpp(datetime.datetime(2026, 4, 1), datetime.datetime(2026, 5, 1))
check_hpp(datetime.datetime(2026, 5, 1), datetime.datetime(2026, 6, 1))
