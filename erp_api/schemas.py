"""
schemas.py - Pydantic Response Schemas untuk FastAPI
Mendefinisikan struktur data yang dikirim ke Frontend React.
"""
from pydantic import BaseModel
from typing import List, Optional
import datetime


# ============================================================
# SCHEMA: Dashboard Summary
# ============================================================
class DashboardKeuangan(BaseModel):
    """Posisi Keuangan Real-Time (dari JurnalUmum)"""
    sisa_saldo_tunai: float
    sisa_saldo_bank: float
    total_uang_masuk_bulan_ini: float
    total_uang_keluar_bulan_ini: float
    perubahan_kas_pct: float  # % perubahan dari bulan lalu (estimasi)
    perubahan_keluar_pct: float


class PenjualanRecentItem(BaseModel):
    """Satu baris di panel Laporan Penjualan"""
    no_invoice: str
    nama_produk: str
    total_tagihan: float
    uang_muka: float = 0.0
    diskon: float = 0.0
    status: str  # "SELESAI" | "PROSES" | "PENDING BAYAR"
    tanggal: str


class ProduksiRecentItem(BaseModel):
    """Satu baris di panel Laporan Produksi & Masuk"""
    kode_ref: str
    deskripsi: str
    qty: float
    satuan: str
    status: str


class GudangStatus(BaseModel):
    """Status Gudang Akhir"""
    cutting_minggu_ini_pcs: float
    cutting_target_pcs: int
    cutting_pct: float
    persediaan_baju_jadi_lusin: float
    persediaan_baju_jadi_nilai: float
    sisa_kain_kg: float
    detail_kain: List[dict]  # [{"nama": "Katun", "kg": 100}, ...]


class MitraDebtItem(BaseModel):
    """Satu baris untuk daftar hutang/piutang"""
    mitra_id: int
    nama_mitra: str
    nominal: float
    kategori: str

class SalesAnalytics(BaseModel):
    """Analitik Penjualan (Bulan & Minggu)"""
    nominal_bulan_ini: float
    nominal_minggu_ini: float
    perubahan_bulan_pct: float
    perubahan_minggu_pct: float
    total_pcs_terjual_bulan_ini: float
    total_pcs_terjual_minggu_ini: float

class ProductionDetailItem(BaseModel):
    nama_barang: str
    qty_lusin: float

class ProductionAnalytics(BaseModel):
    """Analitik Produksi (Kumulatif Jahit / Barang Jadi)"""
    total_lusin_bulan_ini: float
    total_lusin_minggu_ini: float
    detail_bulan_ini: Optional[List[ProductionDetailItem]] = []

class DashboardResponse(BaseModel):
    """Response lengkap untuk halaman Dashboard"""
    keuangan: DashboardKeuangan
    penjualan_terkini: List[PenjualanRecentItem]
    sales_analytics: Optional[SalesAnalytics] = None
    production_analytics: Optional[ProductionAnalytics] = None
    gudang: GudangStatus
    top_piutang: List[MitraDebtItem]
    top_utang: List[MitraDebtItem]
    top_kasbon: List[MitraDebtItem]
    tanggal_refresh: str


# ============================================================
# SCHEMA: Generic
# ============================================================
class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None

# ============================================================
# SCHEMA: Produksi Harian
# ============================================================
class SelectOption(BaseModel):
    id: int
    label: str
    stok_saat_ini: Optional[float] = None
    harga_modal: Optional[float] = None
    kode_sku: Optional[str] = None

class ProduksiOptionsResponse(BaseModel):
    kain_list: List[SelectOption]
    baju_list: List[SelectOption]
    karyawan_list: List[SelectOption]

class CuttingRequest(BaseModel):
    tgl_cutting: str
    kain_id: int
    produk_id: int
    kg_pakai: float
    hasil_pcs: int
    tukang_potong_id: int
    ongkos_per_pcs: float

class JahitRequest(BaseModel):
    tgl_jahit: str
    produk_id: int
    qty_lusin: float

class RekapCuttingItem(BaseModel):
    waktu: str
    tukang_potong: str
    hasil_potong: str
    tagihan_upah: float
    nama_kain: Optional[str] = ""
    nama_baju: Optional[str] = ""
    kg_pakai: Optional[float] = 0.0

class RekapCuttingResponse(BaseModel):
    rincian_harian: List[RekapCuttingItem]
    group_karyawan: List[dict] # { "tukang_potong": str, "total_upah": float, "total_upah_rp": str }

class WipItem(BaseModel):
    kode_sku: str
    nama_barang: str
    total_potong: int
    total_jahit: int
    sisa_wip: int

class WipResponse(BaseModel):
    data: List[WipItem]
    total_potong: int
    total_jahit: int
    sisa_wip: int

# ============================================================
# SCHEMA: Saldo Awal WIP (Setup Cut-off)
# ============================================================
class SaldoAwalWipRequest(BaseModel):
    """Request untuk mencatat Saldo Awal Persediaan Barang Dalam Proses (WIP).
    ATURAN AKUNTANSI MUTLAK:
    - TIDAK memotong stok bahan baku
    - TIDAK memotong saldo Kas/Bank/Utang
    - Jurnal: Debit 12130 (Persediaan WIP) | Kredit 31120 (Ekuitas Saldo Awal Setup)
    """
    tanggal_cutoff: str          # Tanggal cut-off (YYYY-MM-DD)
    produk_id: int               # ID barang dari tabel barang
    qty_pcs: int                 # Jumlah pcs dalam proses
    tahap_saat_ini: str          # "Siap Jahit" | "Siap Finishing" | "Siap QC" | dll.
    modal_bahan_baku: float      # Nilai bahan baku yang sudah terserap (Rp)
    modal_upah_cutting: float    # Upah cutting yang sudah dibayar (Rp)
    modal_lain: float            # Biaya lain (Rp)
    keterangan: Optional[str] = ""
    dibuat_oleh: Optional[str] = "admin"

class SaldoAwalWipItem(BaseModel):
    id: int
    tanggal_cutoff: str
    tanggal_input: str
    kode_sku: str
    nama_barang: str
    qty_pcs: int
    tahap_saat_ini: str
    modal_bahan_baku: float
    modal_upah_cutting: float
    modal_lain: float
    total_modal_terserap: float
    hpp_per_pcs: float           # Dihitung: total_modal / qty_pcs
    keterangan: Optional[str] = ""
    dibuat_oleh: Optional[str] = ""

class SaldoAwalWipListResponse(BaseModel):
    data: List[SaldoAwalWipItem]
    total_qty_pcs: int
    total_nilai_wip: float

# ============================================================
# SCHEMA: Master Data
# ============================================================
class DashboardStats(BaseModel):
    omzet_bulan_ini: float
    laba_kotor: float
    total_piutang: float
    total_utang: float
    saldo_kas_bank: float
    biaya_operasional: float

class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None

class MasterBarangRequest(BaseModel):
    model_code: str
    nama_barang: str
    kode_sku: str
    kategori: str
    satuan: str
    harga_jual: float
    harga_modal: Optional[float] = 0.0

class MasterBarangPut(MasterBarangRequest):
    stok_saat_ini: float

class MasterKaryawanRequest(BaseModel):
    nama_karyawan: str
    no_hp: str
    alamat: str
    divisi: str
    tipe_gaji: str
    nominal_gaji: float
    target_produksi_mingguan: int
    saldo_kasbon_awal: float

class MasterMitraRequest(BaseModel):
    nama_mitra: str
    kategori: str
    no_hp: str
    alamat: str
    saldo_awal: float

class MasterAkunRequest(BaseModel):
    kode_akun: str
    nama_akun: str
    kategori: str

class MasterSaldoAwalRequest(BaseModel):
    akun_id: str
    nama_akun: str
    nominal_saldo: float
    keterangan: str
# ============================================================
# SCHEMA: Pembelian & Pengeluaran (Tahap 4)
# ============================================================

class PembelianBahanItem(BaseModel):
    sku: str
    nama: str
    qty: float
    harga: float
    kat: str

class PembelianBahanRequest(BaseModel):
    tgl_po: str
    supplier_id: int
    metode_pembayaran: str # "Kas Tunai", "Transfer Bank", "Utang Dagang"
    dp: float = 0.0
    dp_sumber: str = "Kas Tunai"
    diskon: float = 0.0
    items: List[PembelianBahanItem]

class OpexRequest(BaseModel):
    tgl_opex: str
    kode_akun_opex: str
    nama_akun_opex: str
    keterangan: str
    nominal: float
    sumber_dana: str # "Kas Tunai", "Bank"

class AsetRequest(BaseModel):
    tgl_aset: str
    kode_akun_aset: str
    nama_akun_aset: str
    nama_barang: str
    nominal: float
    sumber_dana: str # "Kas Tunai", "Bank", "Modal Awal (Khusus Aset Lama)"
    masa_bulan: Optional[int] = 12

class ReturPembelianRequest(BaseModel):
    no_po: str
    kode_sku: str
    qty_retur: float
    tgl_retur: str
    alasan: str

class BayarPOCepatRequest(BaseModel):
    no_po: str
    nominal: float
    sumber_dana: str = "Kas Tunai"
    tgl: str

# ============================================================
# SCHEMA: Penjualan & Retur (Tahap 5)
# ============================================================

class SaleItem(BaseModel):
    id: int
    sku: str
    nama: str
    qty: float
    harga: float

class SaleRequest(BaseModel):
    tgl_jual: str
    customer_id: int
    metode: str # "Piutang (Tempo)", "Tunai", "Transfer"
    dp: float
    dp_sumber: str = "Kas Tunai"
    diskon: float
    items: List[SaleItem]

class SaleReturRequest(BaseModel):
    no_invoice: str
    kode_sku: str
    qty_retur: float
    tgl_retur: str
    alasan: str
    sumber_refund: Optional[str] = "Kas di Bank"

class BayarInvoiceCepatRequest(BaseModel):
    no_invoice: str
    nominal: float
    sumber_dana: str = "Kas Tunai"
    tgl: str

# ============================================================
# SCHEMA: Keuangan & Arus Kas (Tahap 5)
# ============================================================

class CollectionRequest(BaseModel):
    customer_id: int
    nominal: float
    sumber: str # "Kas Tunai", "Bank"
    tgl: str
    keterangan: str

class PaymentRequest(BaseModel):
    supplier_id: int
    nominal: float
    sumber: str # "Kas Tunai", "Bank"
    tgl: str
    keterangan: str

class MutationRequest(BaseModel):
    jenis: str # "Setor Tunai", "Tarik Tunai"
    nominal: float
    tgl: str

class KasbonPaymentRequest(BaseModel):
    karyawan_id: int
    nominal: float
    sumber: str
    tgl: str

class KasbonLoanRequest(BaseModel):
    karyawan_id: int
    nominal: float
    sumber: str # "Kas Tunai", "Bank"
    tgl: str

class VoidRequest(BaseModel):
    jurnal_id: int
    alasan: str = ""
    tgl: Optional[str] = None

# ============================================================
# SCHEMA: Auth (Login & Users)
# ============================================================
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class UserCreate(BaseModel):
    username: str
    password: str
    nama_lengkap: str
    role: str

