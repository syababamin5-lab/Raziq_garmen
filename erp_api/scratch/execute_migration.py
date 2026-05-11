import os
import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Menuju folder erp_api
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "garmen.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

print(f"Menginisialisasi Migrasi Database: {DB_PATH}")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    # 1. Ambil Saldo Tepat Detik Ini
    baku_bal = db.execute(text("SELECT SUM(debit - kredit) FROM jurnal_umum WHERE kode_akun LIKE '5111%'")).scalar() or 0
    btkl_bal = db.execute(text("SELECT SUM(debit - kredit) FROM jurnal_umum WHERE kode_akun LIKE '512%'")).scalar() or 0
    ikh_bal = db.execute(text("SELECT SUM(debit - kredit) FROM jurnal_umum WHERE kode_akun LIKE '51199%'")).scalar() or 0

    print(f"Saldo ditemukan: Bahan={baku_bal}, BTKL={btkl_bal}, Ikhtisar={ikh_bal}")

    now = datetime.datetime.now()
    keterangan = "[KONSOLIDASI_SISTEM] Migrasi saldo produksi lama ke sistem WIP Perpetual (Clean-Up Laporan)"

    # --- TRANSAKSI START ---
    
    # A. Nolkan 5111 (Bahan) -> Pindah ke 12130
    if baku_bal != 0:
        db.execute(text("INSERT INTO jurnal_umum (tanggal, kode_akun, nama_akun, keterangan, debit, kredit) VALUES (:tgl, '12130', 'Persediaan Barang Dalam Proses (WIP)', :ket, :deb, 0)"), 
                   {"tgl": now, "ket": f"{keterangan} - Bahan", "deb": baku_bal})
        db.execute(text("INSERT INTO jurnal_umum (tanggal, kode_akun, nama_akun, keterangan, debit, kredit) VALUES (:tgl, '51110', 'Beban Bahan Baku', :ket, 0, :kre)"), 
                   {"tgl": now, "ket": f"{keterangan} - Penyesuaian", "kre": baku_bal})

    # B. Nolkan 512 (BTKL) -> Pindah ke 12130
    if btkl_bal != 0:
        db.execute(text("INSERT INTO jurnal_umum (tanggal, kode_akun, nama_akun, keterangan, debit, kredit) VALUES (:tgl, '12130', 'Persediaan Barang Dalam Proses (WIP)', :ket, :deb, 0)"), 
                   {"tgl": now, "ket": f"{keterangan} - Upah", "deb": btkl_bal})
        db.execute(text("INSERT INTO jurnal_umum (tanggal, kode_akun, nama_akun, keterangan, debit, kredit) VALUES (:tgl, '51210', 'Beban Tenaga Kerja Langsung', :ket, 0, :kre)"), 
                   {"tgl": now, "ket": f"{keterangan} - Penyesuaian", "kre": btkl_bal})

    # C. Nolkan 51199 (Ikhtisar) -> Pindah ke 12130
    if ikh_bal != 0:
        # Karena 51199 biasanya Kredit (Negatif), kita Debit untuk menolkan
        db.execute(text("INSERT INTO jurnal_umum (tanggal, kode_akun, nama_akun, keterangan, debit, kredit) VALUES (:tgl, '51199', 'Ikhtisar Produksi', :ket, :deb, 0)"), 
                   {"tgl": now, "ket": f"{keterangan} - Closing", "deb": abs(ikh_bal)})
        db.execute(text("INSERT INTO jurnal_umum (tanggal, kode_akun, nama_akun, keterangan, debit, kredit) VALUES (:tgl, '12130', 'Persediaan Barang Dalam Proses (WIP)', :ket, 0, :kre)"), 
                   {"tgl": now, "ket": f"{keterangan} - Transfer Output", "kre": abs(ikh_bal)})

    db.commit()
    print("MIGRASI BERHASIL: Saldo lama telah dikonsolidasikan ke akun WIP (12130).")

except Exception as e:
    db.rollback()
    print(f"MIGRASI GAGAL: {e}")
finally:
    db.close()
