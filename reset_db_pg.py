import sqlalchemy
from sqlalchemy import text

# Gunakan koneksi database PostgreSQL Railway yang aktif
DB_URL = "postgresql://postgres:RwnmOkGVUPXAxWzAzzMlIQSVXqOeSxJj@switchback.proxy.rlwy.net:26329/railway"

def reset_database():
    try:
        engine = sqlalchemy.create_engine(DB_URL)
        with engine.begin() as conn:
            print("🚀 Memulai proses RESET TOTAL Database PostgreSQL...")
            
            # Perintah TRUNCATE dengan RESTART IDENTITY
            # - RESTART IDENTITY: Ini yang akan mengembalikan nomor ID (Auto Increment) kembali ke 1
            # - CASCADE: Otomatis menghapus relasi jika ada constraint
            query = text("""
                TRUNCATE TABLE 
                    barang,
                    mitra,
                    karyawan,
                    header_penjualan,
                    detail_penjualan,
                    header_pembelian,
                    detail_pembelian,
                    production_logs,
                    wip_saldo_awal,
                    jurnal_umum,
                    user_logs
                RESTART IDENTITY CASCADE;
            """)
            
            conn.execute(query)
            print("✅ BERHASIL! Seluruh tabel transaksi dan master (Kecuali COA, User, Profil Perusahaan) telah dikosongkan.")
            print("✅ Auto Increment (Nomor ID Transaksi) telah direset kembali ke 1.")
            
    except Exception as e:
        print(f"❌ GAGAL RESET: {str(e)}")

if __name__ == "__main__":
    # PERINGATAN BUKAN MAIN MAIN: Skrip ini akan menghapus permanen data di PostgreSQL Produksi
    reset_database()
