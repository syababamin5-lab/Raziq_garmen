import sqlite3
db_path = "d:/sistem_garmen/erp_api/garmen.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT DISTINCT kategori FROM barang")
rows = cursor.fetchall()
print("Kategori in DB:", rows)
conn.close()
