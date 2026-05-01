import os
from sqlalchemy import create_engine, text
import pandas as pd

def audit_keuangan():
    # Ambil URL dari environment
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL tidak ditemukan. Mencoba SQLite lokal...")
        base_dir = os.path.dirname(os.path.abspath(__file__))
        db_url = f"sqlite:///{os.path.join(base_dir, 'erp_api', 'garmen.db')}"
    
    # Fix postgres:// vs postgresql://
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    print(f"Connecting to {db_url.split('@')[-1] if '@' in db_url else 'SQLite'}...")
    engine = create_engine(db_url)
    
    with engine.connect() as conn:
        print("\n--- MENCARI TRANSAKSI MENCURIGAKAN (~15 JT) ---")
        # 1. Cari entry tunggal
        query = text("""
            SELECT id, tanggal, kode_akun, nama_akun, keterangan, debit, kredit 
            FROM jurnal_umum 
            WHERE (debit > 15000000 AND debit < 16000000)
               OR (kredit > 15000000 AND kredit < 16000000)
        """)
        res = conn.execute(query).fetchall()
        
        if res:
            print(f"Ditemukan {len(res)} transaksi tunggal:")
            for r in res:
                print(f"ID: {r.id} | {r.tanggal} | {r.kode_akun} | {r.nama_akun} | {r.keterangan} | D: {r.debit} | K: {r.kredit}")
        else:
            print("Tidak ditemukan transaksi tunggal ~15jt.")

        print("\n--- ANALISIS UANG KELUAR BULAN INI (AKUN 5xxx & 6xxx) ---")
        # 2. Analisis "Uang Keluar" (Akun 5 & 6)
        query_keluar = text("""
            SELECT id, tanggal, kode_akun, nama_akun, keterangan, debit, kredit 
            FROM jurnal_umum 
            WHERE (kode_akun LIKE '5%' OR kode_akun LIKE '6%')
              AND debit > 0
            ORDER BY debit DESC
            LIMIT 20
        """)
        res_keluar = conn.execute(query_keluar).fetchall()
        
        if res_keluar:
            print("Top 20 Transaksi Uang Keluar (Debet di Akun 5/6):")
            for r in res_keluar:
                print(f"ID: {r.id} | {r.tanggal} | {r.kode_akun} | {r.nama_akun} | {r.keterangan} | D: {r.debit}")
        else:
            print("Tidak ada transaksi uang keluar (Akun 5/6) dengan Debet > 0.")

        # 3. Hitung total uang keluar bulan ini
        query_total = text("""
            SELECT SUM(debit - kredit) as total_keluar
            FROM jurnal_umum
            WHERE (kode_akun LIKE '5%' OR kode_akun LIKE '6%')
        """)
        total_val = conn.execute(query_total).scalar() or 0
        print(f"\nTOTAL UANG KELUAR TERDETEKSI: Rp {total_val:,.2f}")

        # 4. Fitur Hard Delete (Gunakan dengan hati-hati)
        import sys
        if len(sys.argv) > 1 and sys.argv[1] == "--delete":
            if len(sys.argv) > 2:
                target_id = sys.argv[2]
                print(f"\n--- MENGHAPUS TRANSAKSI ID: {target_id} ---")
                conn.execute(text(f"DELETE FROM jurnal_umum WHERE id = {target_id}"))
                conn.commit()
                print("Berhasil dihapus.")
            else:
                print("\nError: Masukkan ID transaksi yang ingin dihapus. Contoh: python audit_keuangan.py --delete 123")

if __name__ == "__main__":
    audit_keuangan()
