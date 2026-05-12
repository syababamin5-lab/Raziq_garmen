import sqlite3
db_path = r"D:\sistem_garmen_v2\garmen.db"
print(f"Checking ROOT DB: {db_path}")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT tanggal, keterangan, debit, kredit FROM jurnal_umum WHERE kode_akun LIKE '51199%'")
for row in cursor.fetchall():
    print(row)
conn.close()
