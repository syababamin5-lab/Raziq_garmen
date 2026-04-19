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


class DashboardResponse(BaseModel):
    """Response lengkap untuk halaman Dashboard"""
    keuangan: DashboardKeuangan
    penjualan_terkini: List[PenjualanRecentItem]
    gudang: GudangStatus
    tanggal_refresh: str


# ============================================================
# SCHEMA: Generic
# ============================================================
class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None
