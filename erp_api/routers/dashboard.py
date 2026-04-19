"""
routers/dashboard.py
Endpoint: GET /api/dashboard/summary
Business logic IDENTIK dengan menu_dashboard.py Streamlit.
Hanya output-nya yang diubah dari st.markdown -> JSON response.
"""
import datetime
import re
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import (
    JurnalUmum, Barang, HeaderPenjualan, DetailPenjualan,
    KategoriBarang
)
from schemas import (
    DashboardResponse, DashboardKeuangan,
    PenjualanRecentItem, GudangStatus
)

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


# ── Helper: sama persis dengan Streamlit ────────────────────
def _ekstrak_pcs(keterangan: str) -> int:
    """Mengekstrak angka pcs dari keterangan jurnal (logika TIDAK DIUBAH)."""
    if not keterangan:
        return 0
    angka = re.findall(r'\b\d+\b(?=\s*pcs)', str(keterangan).lower())
    return int(angka[0]) if angka else 0


def _get_tgl(j) -> datetime.date:
    return j.tanggal.date() if isinstance(j.tanggal, datetime.datetime) else j.tanggal


# ── Endpoint Utama ───────────────────────────────────────────
@router.get("/summary", response_model=DashboardResponse)
def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    Mengembalikan semua data yang dibutuhkan halaman Dashboard.
    Logika kalkulasi IDENTIK dengan menu_dashboard.py (Streamlit).
    """
    hari_ini = datetime.date.today()
    awal_bulan = hari_ini.replace(day=1)
    awal_minggu = hari_ini - datetime.timedelta(days=hari_ini.weekday())

    # ── 1. Kalkulasi Keuangan dari JurnalUmum ───────────────
    kas_tunai = 0.0
    bank = 0.0
    total_uang_masuk = 0.0
    total_uang_keluar = 0.0
    cutting_minggu_ini_pcs = 0.0
    masuk_hari_ini_pcs = 0.0
    masuk_hari_ini_rp = 0.0
    masuk_bulan_ini_rp = 0.0
    masuk_bulan_ini_pcs = 0.0
    jual_bulan_ini_rp = 0.0
    jual_bulan_ini_pcs = 0.0

    semua_jurnal = db.query(JurnalUmum).all()

    for j in semua_jurnal:
        tgl = _get_tgl(j)
        dbt = j.debit or 0.0
        krd = j.kredit or 0.0

        # Posisi Kas & Bank (kode akun TIDAK diubah)
        if j.kode_akun == "11110":
            kas_tunai += (dbt - krd)
        elif j.kode_akun == "11120":
            bank += (dbt - krd)

        # Total uang masuk & keluar bulan ini
        if j.kode_akun in ["11110", "11120"]:
            if tgl >= awal_bulan:
                total_uang_masuk += dbt
                total_uang_keluar += krd

        # Cutting minggu ini (akun 51110)
        if (j.kode_akun == "51110" and dbt > 0
                and "cutting" in str(j.keterangan).lower()):
            pcs = _ekstrak_pcs(j.keterangan)
            if tgl >= awal_minggu:
                cutting_minggu_ini_pcs += pcs

        # Barang masuk gudang (akun 12150)
        if j.kode_akun == "12150" and "masuk" in str(j.keterangan).lower():
            pcs = _ekstrak_pcs(j.keterangan)
            if tgl == hari_ini:
                masuk_hari_ini_rp += dbt
                masuk_hari_ini_pcs += pcs
            if tgl >= awal_bulan:
                masuk_bulan_ini_rp += dbt
                masuk_bulan_ini_pcs += pcs

        # Penjualan (akun 41110)
        if j.kode_akun == "41110" and krd > 0:
            pcs = _ekstrak_pcs(j.keterangan)
            if tgl >= awal_bulan:
                jual_bulan_ini_rp += krd
                jual_bulan_ini_pcs += pcs

    # ── 2. Persentase perubahan (sederhana) ─────────────────
    perubahan_kas_pct = round(
        ((total_uang_masuk - total_uang_keluar) / max(total_uang_masuk, 1)) * 100, 1
    )
    perubahan_keluar_pct = round(
        (total_uang_keluar / max(total_uang_masuk, 1)) * 100, 1
    )

    # ── 3. Data Barang & Gudang ──────────────────────────────
    semua_barang = db.query(Barang).all()

    total_stok_pcs = sum(
        (b.stok_saat_ini or 0)
        for b in semua_barang
        if b.kategori == KategoriBarang.BARANG_JADI
    )
    total_nilai_persediaan = sum(
        ((b.stok_saat_ini or 0) / 12) * (b.harga_jual or 0)
        for b in semua_barang
        if b.kategori == KategoriBarang.BARANG_JADI
    )

    kain_gudang = [b for b in semua_barang if b.kategori == KategoriBarang.BAHAN_BAKU]
    total_stok_kain_kg = sum((b.stok_saat_ini or 0) for b in kain_gudang)

    top3_kain = sorted(kain_gudang, key=lambda x: x.stok_saat_ini or 0, reverse=True)[:5]
    detail_kain = [
        {"nama": k.nama_barang or k.kode_sku, "kg": round(k.stok_saat_ini or 0, 1)}
        for k in top3_kain if (k.stok_saat_ini or 0) > 0
    ]

    target_cutting = 12000
    cutting_pct = round(min((cutting_minggu_ini_pcs / target_cutting) * 100, 100), 1)

    # ── 4. Penjualan Terkini (3 terakhir) ───────────────────
    penjualan_list = (
        db.query(HeaderPenjualan)
        .order_by(HeaderPenjualan.tanggal.desc())
        .limit(3)
        .all()
    )

    penjualan_terkini = []
    for pj in penjualan_list:
        detail = (
            db.query(DetailPenjualan)
            .filter(DetailPenjualan.no_invoice == pj.no_invoice)
            .first()
        )
        nama_produk = detail.nama_barang if detail else "Produk Campuran"

        status_raw = pj.metode_bayar or "PROSES"
        if "tunai" in status_raw.lower() or "cash" in status_raw.lower():
            status = "SELESAI"
        elif "piutang" in status_raw.lower() or "tempo" in status_raw.lower():
            status = "PENDING BAYAR"
        else:
            status = "PROSES"

        tgl_pj = pj.tanggal
        if isinstance(tgl_pj, datetime.datetime):
            tgl_str = tgl_pj.strftime("%d %b %Y")
        else:
            tgl_str = str(tgl_pj)

        penjualan_terkini.append(PenjualanRecentItem(
            no_invoice=pj.no_invoice,
            nama_produk=nama_produk,
            total_tagihan=pj.total_tagihan or 0.0,
            status=status,
            tanggal=tgl_str,
        ))

    # ── 5. Rakit Response ────────────────────────────────────
    return DashboardResponse(
        keuangan=DashboardKeuangan(
            sisa_saldo_tunai=round(kas_tunai, 0),
            sisa_saldo_bank=round(bank, 0),
            total_uang_masuk_bulan_ini=round(total_uang_masuk, 0),
            total_uang_keluar_bulan_ini=round(total_uang_keluar, 0),
            perubahan_kas_pct=perubahan_kas_pct,
            perubahan_keluar_pct=perubahan_keluar_pct,
        ),
        penjualan_terkini=penjualan_terkini,
        gudang=GudangStatus(
            cutting_minggu_ini_pcs=cutting_minggu_ini_pcs,
            cutting_target_pcs=target_cutting,
            cutting_pct=cutting_pct,
            persediaan_baju_jadi_lusin=round(total_stok_pcs / 12, 1),
            persediaan_baju_jadi_nilai=round(total_nilai_persediaan, 0),
            sisa_kain_kg=round(total_stok_kain_kg, 1),
            detail_kain=detail_kain,
        ),
        tanggal_refresh=hari_ini.strftime("%d %B %Y"),
    )
