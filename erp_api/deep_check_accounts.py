import sqlite3
import os

db_path = "erp_api/garmen.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("--- DAFTAR AKUN TERKAIT PERSEDIAAN ---")
    cursor.execute("SELECT kode_akun, nama_akun FROM akun_buku_besar WHERE nama_akun LIKE '%Persediaan%' OR nama_akun LIKE '%Stok%'")
    print(cursor.fetchall())
    
    print("\n--- SALDO AKUN PERSEDIAAN ---")
    cursor.execute("""
        SELECT kode_akun, SUM(debit - kredit) as saldo 
        FROM jurnal_umum 
        GROUP BY kode_akun 
        HAVING saldo != 0
    """)
    balances = cursor.fetchall()
    for b in balances:
        cursor.execute("SELECT nama_akun FROM akun_buku_besar WHERE kode_akun = ?", (b[0],))
        nama = cursor.fetchone()
        print(f"Akun {b[0]} ({nama[0] if nama else 'N/A'}): Rp {b[1]:,.0f}")

    print("\n--- TRANSAKSI DENGAN KATA 'SALDO AWAL' ATAU 'BAJU' ---")
    cursor.execute("SELECT kode_akun, keterangan, debit, kredit FROM jurnal_umum WHERE keterangan LIKE '%Saldo Awal%' OR keterangan LIKE '%Baju%' OR keterangan LIKE '%Gudang%' LIMIT 20")
    for row in cursor.fetchall():
        print(row)

    conn.close()
else:
    print("DB not found")
