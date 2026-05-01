import os
from sqlalchemy import create_engine, text

def audit_exact():
    # Ambil URL dari environment
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL tidak ditemukan. Mencoba SQLite lokal...")
        base_dir = os.path.dirname(os.path.abspath(__file__))
        db_url = f"sqlite:///{os.path.join(base_dir, 'erp_api', 'garmen.db')}"
    
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    engine = create_engine(db_url)
    
    amount = 15544242
    
    with engine.connect() as conn:
        print(f"--- MENCARI TRANSAKSI DENGAN NOMINAL Rp {amount:,.0f} ---")
        
        # Cari di jurnal_umum
        query = text("""
            SELECT id, tanggal, kode_akun, nama_akun, keterangan, debit, kredit 
            FROM jurnal_umum 
            WHERE ABS(debit - :amt) < 1 OR ABS(kredit - :amt) < 1
        """)
        res = conn.execute(query, {"amt": amount}).fetchall()
        
        if res:
            print(f"Ditemukan {len(res)} transaksi:")
            for r in res:
                print(f"ID: {r.id} | {r.tanggal} | {r.kode_akun} | {r.nama_akun} | {r.keterangan} | D: {r.debit} | K: {r.kredit}")
                print(f"COMMAND UNTUK HAPUS: python audit_keuangan.py --delete {r.id}")
        else:
            print("Tidak ditemukan transaksi tunggal dengan nominal tersebut.")
            
            print("\n--- ANALISIS KOMBINASI TRANSAKSI BULAN INI (AKUN 5/6) ---")
            query_sum = text("""
                SELECT id, tanggal, kode_akun, nama_akun, keterangan, (debit - kredit) as net_debit
                FROM jurnal_umum
                WHERE (kode_akun LIKE '5%' OR kode_akun LIKE '6%')
                  AND tanggal >= '2026-05-01'
                ORDER BY tanggal DESC
            """)
            res_sum = conn.execute(query_sum).fetchall()
            current_sum = 0
            for r in res_sum:
                current_sum += r.net_debit
                print(f"ID: {r.id} | {r.tanggal} | D-K: {r.net_debit} | Running Total: {current_sum}")
                if abs(current_sum - amount) < 1:
                    print("!!! DITEMUKAN KOMBINASI YANG COCOK !!!")

if __name__ == "__main__":
    audit_exact()
