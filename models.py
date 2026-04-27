import enum
import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum as SQLEnum
from database import Base

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
    kategori = Column(SQLEnum(KategoriBarang))
    satuan = Column(String) 
    stok_saat_ini = Column(Float, default=0.0) 
    harga_jual = Column(Float, default=0.0)
    harga_modal = Column(Float, default=0.0)

class Mitra(Base): 
    __tablename__ = "mitra"
    id = Column(Integer, primary_key=True, index=True)
    nama_mitra = Column(String, index=True)
    kategori = Column(SQLEnum(KategoriMitra))
    no_hp = Column(String, default="-")
    email = Column(String, default="-") 
    alamat = Column(String, default="-")
    # --- FITUR BARU: BUKU PEMBANTU UTANG & PIUTANG ---
    saldo_piutang = Column(Float, default=0.0) # Untuk mencatat sisa utang Customer ke kita
    saldo_utang = Column(Float, default=0.0)   # Untuk mencatat sisa utang kita ke Supplier

class Karyawan(Base):
    __tablename__ = "karyawan"
    id = Column(Integer, primary_key=True, index=True)
    nama_karyawan = Column(String, index=True)
    no_hp = Column(String, default="-")
    alamat = Column(String, default="-")
    divisi = Column(SQLEnum(Divisi))
    tipe_gaji = Column(SQLEnum(TipeGaji))
    nominal_gaji = Column(Float, default=0.0)
    target_produksi_mingguan = Column(Integer, default=0)
    # --- FITUR KASBON KARYAWAN ---
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
    status = Column(String, default="BELUM LUNAS")
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
# Tambahan Tabel Chart of Accounts (CoA)
# ==========================================
class AkunBukuBesar(Base):
    __tablename__ = "akun_buku_besar"
    
    kode_akun = Column(String, primary_key=True, index=True)
    nama_akun = Column(String, nullable=False)
    kategori = Column(String, nullable=False) # Contoh: 'Kas', 'Beban', 'Aset'