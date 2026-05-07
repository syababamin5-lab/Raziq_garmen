"""
investigasi_soundtrax.py
Telusuri kenapa saldo_piutang SOUNDTRAX bisa minus -14.680.000
Langsung dari database PostgreSQL production.
"""
import os
import sys

DB_URL = os.environ.get("DATABASE_URL")

if DB_URL:
    import psycopg2
    import psycopg2.extras
    if DB_URL.startswith("postgres://"):
        DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)
    print(f"[INFO] Menggunakan PostgreSQL Production")
    USE_POSTGRES = True
else:
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "erp_api", "garmen.db")
    print(f"[INFO] DATABASE_URL tidak ditemukan. Menggunakan SQLite lokal: {DB_PATH}")
    USE_POSTGRES = False

def run_query(cur, sql, params=None):
    if params:
        cur.execute(sql, params)
    else:
        cur.execute(sql)
    return cur.fetchall()

def fmt(val):
    try:
        return f"{float(val):,.0f}"
    except:
        return str(val)

def main():
    if USE_POSTGRES:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        def g(row, key): return row[key]
    else:
        import sqlite3 as _sq
        conn = _sq.connect(DB_PATH)
        conn.row_factory = _sq.Row
        cur = conn.cursor()
        def g(row, key): return row[key]

    print("\n" + "="*70)
    print("  INVESTIGASI SOUNDTRAX - SALDO PIUTANG NEGATIF")
    print("="*70)

    # 1. Data mitra SOUNDTRAX
    print("\n[1] DATA MITRA SOUNDTRAX di tabel `mitra`:")
    cur.execute("SELECT id, nama_mitra, kategori, saldo_piutang, saldo_utang, is_active FROM mitra WHERE UPPER(nama_mitra) LIKE '%SOUNDTRAX%'")
    rows = cur.fetchall()
    if not rows:
        print("  >> SOUNDTRAX tidak ditemukan di tabel mitra!")
    for r in rows:
        print(f"  ID={r['id']} | Nama={r['nama_mitra']} | Kategori={r['kategori']} | saldo_piutang={fmt(r['saldo_piutang'])} | saldo_utang={fmt(r['saldo_utang'])} | aktif={r['is_active']}")

    # 2. Invoice penjualan SOUNDTRAX
    print("\n[2] INVOICE PENJUALAN (header_penjualan) - SOUNDTRAX:")
    cur.execute("""
        SELECT id, no_invoice, tanggal, metode_bayar, tipe_transaksi,
               uang_muka, total_tagihan, status
        FROM header_penjualan
        WHERE UPPER(nama_customer) LIKE '%SOUNDTRAX%'
        ORDER BY tanggal DESC
    """)
    rows = cur.fetchall()
    if not rows:
        print("  >> Tidak ada invoice penjualan untuk SOUNDTRAX")
    for r in rows:
        print(f"  ID={r['id']} | {r['no_invoice']} | {r['tanggal']} | {r['metode_bayar']} | {r['tipe_transaksi']} | UM={fmt(r['uang_muka'])} | Total={fmt(r['total_tagihan'])} | Status={r['status']}")

    # 3. Semua jurnal menyebut SOUNDTRAX
    print("\n[3] SEMUA JURNAL UMUM yang menyebut SOUNDTRAX:")
    cur.execute("""
        SELECT id, tanggal, kode_akun, nama_akun, keterangan, debit, kredit
        FROM jurnal_umum
        WHERE UPPER(keterangan) LIKE '%SOUNDTRAX%'
        ORDER BY tanggal, id
    """)
    rows = cur.fetchall()
    if not rows:
        print("  >> Tidak ada jurnal yang menyebut SOUNDTRAX")
    total_debit = 0
    total_kredit = 0
    for r in rows:
        d = float(r['debit'] or 0)
        k = float(r['kredit'] or 0)
        total_debit += d
        total_kredit += k
        print(f"  JU_ID={r['id']} | {r['tanggal']} | Akun={r['kode_akun']} ({r['nama_akun']}) | D={fmt(d)} | K={fmt(k)} | Ket: {r['keterangan']}")
    print(f"\n  >>> TOTAL DEBIT: {fmt(total_debit)} | TOTAL KREDIT: {fmt(total_kredit)} | SELISIH (D-K): {fmt(total_debit - total_kredit)}")

    # 4. Ringkasan per akun
    print("\n[4] RINGKASAN PER AKUN untuk SOUNDTRAX:")
    cur.execute("""
        SELECT kode_akun, nama_akun,
               SUM(debit) as total_debit,
               SUM(kredit) as total_kredit,
               SUM(debit - kredit) as saldo
        FROM jurnal_umum
        WHERE UPPER(keterangan) LIKE '%SOUNDTRAX%'
        GROUP BY kode_akun, nama_akun
        ORDER BY kode_akun
    """)
    rows = cur.fetchall()
    if not rows:
        print("  >> Tidak ada")
    for r in rows:
        print(f"  Akun {r['kode_akun']} ({r['nama_akun']}) | D_total={fmt(r['total_debit'])} | K_total={fmt(r['total_kredit'])} | Saldo(D-K)={fmt(r['saldo'])}")

    # 5. Cek jurnal tidak balance per tanggal
    print("\n[5] DETEKSI KETIDAKSEIMBANGAN JURNAL per tanggal (SOUNDTRAX):")
    cur.execute("""
        SELECT DATE(tanggal) as tgl,
               SUM(debit) as total_d,
               SUM(kredit) as total_k,
               SUM(debit) - SUM(kredit) as selisih
        FROM jurnal_umum
        WHERE UPPER(keterangan) LIKE '%SOUNDTRAX%'
        GROUP BY DATE(tanggal)
        ORDER BY tgl DESC
    """)
    rows = cur.fetchall()
    if not rows:
        print("  >> Tidak ada jurnal SOUNDTRAX")
    for r in rows:
        selisih = float(r['selisih'] or 0)
        flag = "  *** TIDAK BALANCE!" if abs(selisih) > 100 else ""
        print(f"  Tgl={r['tgl']} | D={fmt(r['total_d'])} | K={fmt(r['total_k'])} | SELISIH={fmt(selisih)}{flag}")

    # 6. Pembayaran dari SOUNDTRAX (kas/bank masuk)
    print("\n[6] PEMBAYARAN dari SOUNDTRAX di Kas/Bank (akun 111xx):")
    cur.execute("""
        SELECT id, tanggal, kode_akun, nama_akun, keterangan, debit, kredit
        FROM jurnal_umum
        WHERE kode_akun LIKE '111%'
          AND UPPER(keterangan) LIKE '%SOUNDTRAX%'
        ORDER BY tanggal DESC
    """)
    rows = cur.fetchall()
    if not rows:
        print("  >> Tidak ada pembayaran kas/bank dari SOUNDTRAX")
    for r in rows:
        print(f"  JU_ID={r['id']} | {r['tanggal']} | Akun={r['kode_akun']} | D={fmt(r['debit'])} | K={fmt(r['kredit'])} | {r['keterangan']}")

    # 7. Cek apakah ada jurnal piutang yang KREDIT (pengurangan piutang) berlebihan
    print("\n[7] JURNAL AKUN PIUTANG (112xx) untuk SOUNDTRAX:")
    cur.execute("""
        SELECT id, tanggal, kode_akun, nama_akun, keterangan, debit, kredit
        FROM jurnal_umum
        WHERE kode_akun LIKE '112%'
          AND UPPER(keterangan) LIKE '%SOUNDTRAX%'
        ORDER BY tanggal, id
    """)
    rows = cur.fetchall()
    if not rows:
        print("  >> Tidak ada entri akun piutang untuk SOUNDTRAX")
    for r in rows:
        print(f"  JU_ID={r['id']} | {r['tanggal']} | Akun={r['kode_akun']} | D={fmt(r['debit'])} | K={fmt(r['kredit'])} | {r['keterangan']}")

    # 8. Cek semua jurnal dengan nominal ~14.680.000
    print("\n[8] JURNAL dengan nominal sekitar 14.680.000 (seluruh DB):")
    cur.execute("""
        SELECT id, tanggal, kode_akun, nama_akun, keterangan, debit, kredit
        FROM jurnal_umum
        WHERE debit BETWEEN 14000000 AND 15500000
           OR kredit BETWEEN 14000000 AND 15500000
        ORDER BY tanggal DESC
    """)
    rows = cur.fetchall()
    if not rows:
        print("  >> Tidak ada jurnal dengan nominal ~14-15.5 juta")
    for r in rows:
        print(f"  JU_ID={r['id']} | {r['tanggal']} | Akun={r['kode_akun']} ({r['nama_akun']}) | D={fmt(r['debit'])} | K={fmt(r['kredit'])} | {r['keterangan']}")

    print("\n" + "="*70)
    print("  SELESAI")
    print("="*70)

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
