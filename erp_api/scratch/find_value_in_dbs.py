import os
import sqlite3

target_value = 12316234
BASE_DIR = r"D:\sistem_garmen_v2"

for root, dirs, files in os.walk(BASE_DIR):
    for file in files:
        if file.endswith(".db"):
            db_path = os.path.join(root, file)
            try:
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                # Cari di jurnal_umum
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='jurnal_umum'")
                if cursor.fetchone():
                    cursor.execute("SELECT SUM(kredit - debit) FROM jurnal_umum WHERE kode_akun LIKE '51199%'")
                    res = cursor.fetchone()[0] or 0
                    if abs(res - target_value) < 1000: # Toleransi dikit
                        print(f"FOUND MATCH in {db_path}: Saldo={res}")
                conn.close()
            except:
                pass
