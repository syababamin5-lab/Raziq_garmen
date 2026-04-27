import sqlite3
import os

db_path = "d:/sistem_garmen/erp_api/garmen.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    tables = ["barang", "mitra", "jurnal_umum", "header_penjualan", "header_pembelian", "users"]
    for t in tables:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {t}")
            count = cursor.fetchone()[0]
            print(f"Table {t}: {count} rows")
        except Exception as e:
            print(f"Error checking {t}: {e}")
    conn.close()
else:
    print("Database file not found at", db_path)
