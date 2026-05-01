import os
from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import models  # Memastikan schema terbaca

# Load environment variable (Pastikan Anda punya file .env dengan isi DATABASE_URL)
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL tidak ditemukan di environment atau file .env")
    print("Silakan buat file .env dan isi dengan URL PostgreSQL dari Railway.")
    exit(1)

print(f"🔗 Menghubungkan ke Database: {DATABASE_URL[:15]}...")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def reset_database():
    print("\n⚠️ PERINGATAN: SCRIPT INI AKAN MENGHAPUS DATA!")
    print("Pilihan Reset:")
    print("1. Reset HANYA Transaksi (Penjualan, Pembelian, Produksi, Kasbon, Keuangan)")
    print("   -> Master Data (Barang, Karyawan, Mitra, Akun User) TETAP AMAN.")
    print("2. Reset TOTAL (Kecuali Akun User & Chart of Accounts)")
    print("   -> Semua Data Barang, Karyawan, dan Transaksi AKAN HILANG.")
    
    pilihan = input("\nMasukkan pilihan (1 / 2) atau ketik 'batal' untuk keluar: ")
    
    if pilihan not in ['1', '2']:
        print("Membatalkan reset.")
        return

    konfirmasi = input('Ketik "SAYA YAKIN" untuk melanjutkan: ')
    if konfirmasi != "SAYA YAKIN":
        print("Konfirmasi salah. Dibatalkan.")
        return

    try:
        # Hapus tabel transaksi (Berlaku untuk pilihan 1 dan 2)
        print("🗑️ Menghapus data transaksi...")
        db.query(models.DetailPenjualan).delete()
        db.query(models.TransaksiPenjualan).delete()
        db.query(models.DetailPembelian).delete()
        db.query(models.TransaksiPembelian).delete()
        db.query(models.ProduksiHarian).delete()
        db.query(models.KasPiutang).delete()
        db.query(models.BukuKas).delete()
        db.query(models.JurnalUmum).delete()
        db.query(models.KasbonKaryawan).delete()
        db.query(models.RiwayatEdit).delete()
        db.commit()

        # Reset stok barang menjadi 0 jika pilihan 1
        if pilihan == '1':
            print("🔄 Mereset semua stok barang menjadi 0...")
            barang_list = db.query(models.Barang).all()
            for b in barang_list:
                b.stok_saat_ini = 0
            db.commit()

        # Hapus Master Data jika pilihan 2
        if pilihan == '2':
            print("🗑️ Menghapus Master Data (Barang, Karyawan, Mitra)...")
            db.query(models.Barang).delete()
            db.query(models.MitraBisnis).delete()
            db.query(models.Karyawan).delete()
            db.commit()

        print("\n✅ BERHASIL! Database telah di-reset sesuai pilihan Anda.")
        print("Akun Login (Users) tetap aman!")

    except Exception as e:
        db.rollback()
        print(f"\n❌ TERJADI KESALAHAN: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_database()
