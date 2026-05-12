import os
import sqlite3

dbs = ["garmen.db", "erp.db", "erp_garment.db"]
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

for db_name in dbs:
    db_path = os.path.join(BASE_DIR, db_name)
    if not os.path.exists(db_path):
        continue
    
    print(f"\n--- Checking {db_name} ---")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Cek apakah tabel jurnal_umum ada
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='jurnal_umum'")
        if not cursor.fetchone():
            print("Table jurnal_umum not found.")
            continue
            
        cursor.execute("SELECT SUM(kredit - debit) FROM jurnal_umum WHERE kode_akun LIKE '51199%'")
        bal = cursor.fetchone()[0] or 0
        print(f"Saldo 51199: {bal}")
        
        cursor.execute("SELECT tanggal, keterangan, kredit FROM jurnal_umum WHERE kode_akun LIKE '51199%' ORDER BY id DESC LIMIT 1")
        last = cursor.fetchone()
        print(f"Last Transaction: {last}")
        
        conn.close()
    except Exception as e:
        print(f"Error checking {db_name}: {e}")
