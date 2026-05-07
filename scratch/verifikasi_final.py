"""
verifikasi_final.py - Konfirmasi saldo SOUNDTRAX sudah 0 di production
"""
import os
import psycopg2
import psycopg2.extras

DB_URL = os.environ.get("DATABASE_URL")
if DB_URL and DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

conn = psycopg2.connect(DB_URL)
cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

print("\n=== VERIFIKASI FINAL - SALDO PIUTANG SOUNDTRAX ===")
cur.execute("SELECT id, nama_mitra, saldo_piutang, saldo_utang FROM mitra WHERE UPPER(nama_mitra) LIKE '%SOUNDTRAX%'")
rows = cur.fetchall()
for r in rows:
    status = "BERSIH (0)" if r['saldo_piutang'] == 0 else f"MASIH ADA: {r['saldo_piutang']:,.0f}"
    print(f"  ID={r['id']} | {r['nama_mitra']} | saldo_piutang={r['saldo_piutang']:,.0f} --> {status}")

print("\n=== SEMUA CUSTOMER - SALDO PIUTANG ===")
cur.execute("SELECT nama_mitra, saldo_piutang FROM mitra WHERE kategori='Customer / Klien' ORDER BY saldo_piutang DESC")
rows = cur.fetchall()
for r in rows:
    tanda = " <-- NEGATIF!" if r['saldo_piutang'] < 0 else ""
    print(f"  {r['nama_mitra']:<30} | Rp {r['saldo_piutang']:>15,.0f}{tanda}")

cur.close()
conn.close()
print("\n=== SELESAI ===")
