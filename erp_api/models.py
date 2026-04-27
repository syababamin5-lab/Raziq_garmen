"""
models.py - FastAPI Backend
PENTING: File ini adalah SALINAN IDENTIK dari models.py Streamlit.
Tidak ada perubahan pada nama kolom, tabel, atau relasi.
"""
import enum
import datetime
import os
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Enum as SQLEnum
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base

# Konfigurasi Database Lokal (SQLite)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "garmen.db")

# Deteksi Vercel atau Lingkungan Read-Only
if not os.path.exists(DB_PATH) and os.environ.get('VERCEL'):
    SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
    print("WARNING: Using In-Memory Database for Vercel Demo")
else:
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# Buat Engine dengan penanganan error lebih baik
try:
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
except Exception as e:
    # Fallback Terakhir ke Memory
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency untuk FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class KategoriBarang(enum.Enum):
    BAHAN_BAKU = "Bahan Baku (Kain)"
    BAHAN_PEMBANTU = "Bahan Pembantu (Benang, Kancing, dll)"
    BAHAN_PENOLONG = "Bahan Penolong (Label, Plastik, dll)"
    BARANG_JADI = "Barang Jadi (Baju)"


class Divisi(enum.Enum):
    CUTTING = "Cutting"
    JAHIT = "Jahit / Makloon"
    FINISHING = "Finishing & QC"
    ADMIN = "Administrasi Umum"
    KEPALA = "Kepala Garmen / Produksi"


class TipeGaji(enum.Enum):
    BORONGAN = "Borongan (Per Pcs)"
    MINGGUAN = "Mingguan (Tetap)"
    BULANAN = "Bulanan (Tetap)"


class KategoriMitra(enum.Enum):
    CUSTOMER = "Customer / Klien"
    SUPPLIER = "Supplier Bahan Baku"


# ==========================================
# 1. TABEL MASTER DATA & PERSEDIAAN
# ==========================================
class Barang(Base):
    __tablename__ = "barang"
    id = Column(Integer, primary_key=True, index=True)
    model_code = Column(String, index=True)
    nama_barang = Column(String)
    kode_sku = Column(String, unique=True, index=True)
    kategori = Column(String)
    satuan = Column(String)
    stok_saat_ini = Column(Float, default=0.0)
    harga_jual = Column(Float, default=0.0)
    harga_modal = Column(Float, default=0.0)


class Mitra(Base):
    __tablename__ = "mitra"
    id = Column(Integer, primary_key=True, index=True)
    nama_mitra = Column(String, index=True)
    kategori = Column(String)
    no_hp = Column(String, default="-")
    email = Column(String, default="-")
    alamat = Column(String, default="-")
    saldo_piutang = Column(Float, default=0.0)
    saldo_utang = Column(Float, default=0.0)


class Karyawan(Base):
    __tablename__ = "karyawan"
    id = Column(Integer, primary_key=True, index=True)
    nama_karyawan = Column(String, index=True)
    no_hp = Column(String, default="-")
    alamat = Column(String, default="-")
    divisi = Column(String)
    tipe_gaji = Column(String)
    nominal_gaji = Column(Float, default=0.0)
    target_produksi_mingguan = Column(Integer, default=0)
    saldo_kasbon = Column(Float, default=0.0)


# ==========================================
# 2. TABEL PENJUALAN & RETUR (INVOICE)
# ==========================================
class HeaderPenjualan(Base):
    __tablename__ = "header_penjualan"
    id = Column(Integer, primary_key=True, index=True)
    no_invoice = Column(String, unique=True, index=True)
    tanggal = Column(DateTime, default=datetime.datetime.utcnow)
    nama_customer = Column(String)
    metode_bayar = Column(String)
    tipe_transaksi = Column(String, default="NORMAL")
    diskon = Column(Float, default=0.0)
    pajak = Column(Float, default=0.0)
    total_tagihan = Column(Float, default=0.0)


class DetailPenjualan(Base):
    __tablename__ = "detail_penjualan"
    id = Column(Integer, primary_key=True, index=True)
    no_invoice = Column(String, index=True)
    kode_sku = Column(String)
    nama_barang = Column(String)
    qty_lusin = Column(Float)
    harga_per_lusin = Column(Float)
    subtotal = Column(Float)


# ==========================================
# 3. TABEL PEMBELIAN & RETUR (PO)
# ==========================================
class HeaderPembelian(Base):
    __tablename__ = "header_pembelian"
    id = Column(Integer, primary_key=True, index=True)
    no_po = Column(String, unique=True, index=True)
    tanggal = Column(DateTime, default=datetime.datetime.utcnow)
    nama_supplier = Column(String)
    metode_bayar = Column(String)
    tipe_transaksi = Column(String, default="NORMAL")
    diskon = Column(Float, default=0.0)
    pajak = Column(Float, default=0.0)
    total_tagihan = Column(Float, default=0.0)


class DetailPembelian(Base):
    __tablename__ = "detail_pembelian"
    id = Column(Integer, primary_key=True, index=True)
    no_po = Column(String, index=True)
    kode_sku = Column(String)
    nama_barang = Column(String)
    qty_kg = Column(Float)
    harga_per_kg = Column(Float)
    subtotal = Column(Float)


# ==========================================
# 4. TABEL BUKU BESAR KEUANGAN
# ==========================================
class JurnalUmum(Base):
    __tablename__ = "jurnal_umum"
    id = Column(Integer, primary_key=True, index=True)
    tanggal = Column(DateTime, default=datetime.datetime.utcnow)
    kode_akun = Column(String, index=True)
    nama_akun = Column(String)
    keterangan = Column(String)
    debit = Column(Float, default=0.0)
    kredit = Column(Float, default=0.0)


# ==========================================
# 5. CHART OF ACCOUNTS
# ==========================================
class AkunBukuBesar(Base):
    __tablename__ = "akun_buku_besar"
    kode_akun = Column(String, primary_key=True, index=True)
    nama_akun = Column(String, nullable=False)
    kategori = Column(String, nullable=False)


# ==========================================
# 6. AUTHENTICATION & USERS
# ==========================================
class UserRole(enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    USER = "user"
    BOS = "bos"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    nama_lengkap = Column(String)
    role = Column(String) # super_admin, admin, user, bos
    foto_url = Column(String, nullable=True)
    email = Column(String, nullable=True)
    no_hp = Column(String, nullable=True)
    is_active = Column(Integer, default=1)

class CompanyConfig(Base):
    __tablename__ = "company_config"
    id = Column(Integer, primary_key=True, index=True)
    nama_perusahaan = Column(String, default="PABRIK RAZIQ GARMENT")
    alamat = Column(String, default="Bandung - Jawa Barat")
    no_telp = Column(String, default="0812-1491-4641")
    email = Column(String, default="raziqgarment@gmail.com")
    website = Column(String, default="www.raziqgarment.com")
    nama_pemilik = Column(String, default="Yana Taryana")
    jabatan_pemilik = Column(String, default="Direktur Operasional")
    logo_url = Column(String, nullable=True)

