import streamlit as st
import pandas as pd
import datetime
import re
import html as html_lib
from database import SessionLocal
from models import JurnalUmum, Barang, Karyawan
from utils import format_rp

def ekstrak_pcs(keterangan):
    if not keterangan: return 0
    angka = re.findall(r'\b\d+\b(?=\s*pcs)', str(keterangan).lower())
    return int(angka[0]) if angka else 0

def _safe(text):
    """Escape HTML entities untuk interpolasi yang aman."""
    return html_lib.escape(str(text)) if text else ""

def jalankan():
    # =========================================================================
    # SUNTIKAN CSS PREMIUM
    # =========================================================================
    st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    [data-testid="stMainBlockContainer"] {
        padding-top: 1.5rem !important;
    }

    /* ---- HEADER ---- */
    .dash-header-label {
        font-family: 'Inter', sans-serif;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 1.8px;
        color: #6B7280;
        text-transform: uppercase;
        margin-bottom: 4px;
    }
    .dash-header-title {
        font-family: 'Inter', sans-serif;
        font-size: 30px !important;
        font-weight: 900 !important;
        color: #064E3B !important;
        line-height: 1.15;
        margin: 0 0 4px 0;
    }
    .dash-date-box {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        background: #F9FAFB;
        border: 1.5px solid #E5E7EB;
        border-radius: 12px;
        padding: 10px 16px;
    }
    .dash-date-label { font-size: 10px; color: #9CA3AF; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .dash-date-value { font-size: 13px; font-weight: 700; color: #111827; }

    /* ---- SECTION TITLE ---- */
    .dash-section-title {
        font-family: 'Inter', sans-serif;
        font-size: 17px !important;
        font-weight: 700 !important;
        color: #111827 !important;
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 14px 0;
        padding: 0;
    }

    /* ---- KARTU KEUANGAN ---- */
    .fin-card {
        background: #FFFFFF;
        border: 1.5px solid #E5E7EB;
        border-radius: 16px;
        padding: 20px 18px 18px 18px;
        position: relative;
        min-height: 155px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        transition: box-shadow 0.25s ease, transform 0.25s ease;
        font-family: 'Inter', sans-serif;
    }
    .fin-card:hover {
        box-shadow: 0 8px 28px rgba(6,78,59,0.13);
        transform: translateY(-3px);
    }
    .fin-card-badge {
        position: absolute;
        top: 14px;
        right: 14px;
        font-size: 10px;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 20px;
        letter-spacing: 0.3px;
    }
    .badge-live { background: #D1FAE5; color: #065F46; }
    .badge-up   { background: #D1FAE5; color: #065F46; }
    .badge-down { background: #FEE2E2; color: #991B1B; }
    .fin-card-icon { font-size: 22px; margin-bottom: 10px; }
    .fin-card-label { font-size: 12px; color: #6B7280; font-weight: 500; margin-bottom: 6px; }
    .fin-card-value { font-size: 20px; font-weight: 900; color: #111827; line-height: 1.15; word-break: break-all; }
    .fin-card-value.red { color: #B91C1C; }
    .fin-card-sub { font-size: 11px; color: #9CA3AF; margin-top: 5px; }

    /* ---- PANEL KARTU ---- */
    .panel-card {
        background: #FFFFFF;
        border: 1.5px solid #E5E7EB;
        border-radius: 16px;
        padding: 18px 16px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        font-family: 'Inter', sans-serif;
    }
    .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 14px;
    }
    .panel-title-text {
        font-size: 14px;
        font-weight: 700;
        color: #111827;
    }
    .panel-dots { font-size: 17px; color: #D1D5DB; cursor: pointer; }

    /* ---- BARIS PENJUALAN ---- */
    .po-row {
        display: flex;
        align-items: center;
        gap: 10px;
        background: #F9FAFB;
        border-radius: 10px;
        padding: 10px 12px;
        margin-bottom: 8px;
        transition: background 0.2s;
    }
    .po-row:hover { background: #ECFDF5; }
    .po-badge {
        background: #064E3B;
        color: #fff;
        font-size: 10px;
        font-weight: 800;
        padding: 6px 8px;
        border-radius: 7px;
        min-width: 34px;
        text-align: center;
        flex-shrink: 0;
    }
    .po-detail { flex: 1; min-width: 0; overflow: hidden; }
    .po-no { font-size: 12px; font-weight: 700; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .po-name { font-size: 11px; color: #9CA3AF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
    .po-right { text-align: right; flex-shrink: 0; }
    .po-value { font-size: 12px; font-weight: 700; color: #111827; }
    .st-selesai { background: #D1FAE5; color: #065F46; font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 5px; display: inline-block; margin-top: 2px; letter-spacing: 0.3px; }
    .st-proses  { background: #DBEAFE; color: #1E40AF; font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 5px; display: inline-block; margin-top: 2px; letter-spacing: 0.3px; }
    .st-pending { background: #FEF3C7; color: #92400E; font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 5px; display: inline-block; margin-top: 2px; letter-spacing: 0.3px; }

    /* ---- BARIS PRODUKSI ---- */
    .prod-row {
        display: flex;
        align-items: center;
        gap: 10px;
        background: #F9FAFB;
        border-radius: 10px;
        padding: 10px 12px;
        margin-bottom: 8px;
        transition: background 0.2s;
    }
    .prod-row:hover { background: #F0FDF4; }
    .prod-icon {
        font-size: 16px;
        background: #ECFDF5;
        border-radius: 8px;
        padding: 7px 9px;
        flex-shrink: 0;
        line-height: 1;
    }
    .prod-detail { flex: 1; }
    .prod-no   { font-size: 12px; font-weight: 700; color: #374151; }
    .prod-name { font-size: 11px; color: #9CA3AF; margin-top: 1px; }
    .prod-right { text-align: right; flex-shrink: 0; }
    .prod-qty  { font-size: 13px; font-weight: 800; color: #111827; }
    .prod-desc { font-size: 10px; color: #9CA3AF; margin-top: 1px; }

    /* ---- STATUS GUDANG ---- */
    .gudang-dark {
        background: linear-gradient(140deg, #064E3B 0%, #047857 100%);
        border-radius: 14px;
        padding: 22px 20px;
        color: #FFFFFF;
        min-height: 150px;
        position: relative;
        overflow: hidden;
        font-family: 'Inter', sans-serif;
    }
    .gudang-light {
        background: #FFFFFF;
        border: 1.5px solid #E5E7EB;
        border-radius: 14px;
        padding: 22px 20px;
        min-height: 150px;
        font-family: 'Inter', sans-serif;
        box-shadow: 0 1px 4px rgba(0,0,0,0.05);
    }
    .gudang-label {
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        opacity: 0.7;
        margin-bottom: 10px;
    }
    .gudang-value-big {
        font-size: 38px;
        font-weight: 900;
        line-height: 1;
    }
    .gudang-unit-text {
        font-size: 15px;
        font-weight: 500;
        opacity: 0.75;
        margin-left: 3px;
    }
    .gudang-progress-wrap {
        height: 6px;
        background: rgba(255,255,255,0.2);
        border-radius: 10px;
        margin-top: 14px;
        overflow: hidden;
    }
    .gudang-sub-text { font-size: 11px; opacity: 0.65; margin-top: 6px; }
    .gudang-detail-flex { display: flex; gap: 16px; margin-top: 12px; }
    .gdl { font-size: 10px; color: #9CA3AF; font-weight: 600; }
    .gdv { font-size: 14px; font-weight: 800; color: #111827; margin-top: 1px; }
    .gudang-sub-green { font-size: 12px; font-weight: 700; color: #065F46; margin-top: 8px; }
    .gudang-sub-muted { color: #9CA3AF; font-weight: 400; }
    </style>
    """, unsafe_allow_html=True)

    # =========================================================================
    # AMBIL DATA DARI DB (LOGIKA TIDAK DIUBAH)
    # =========================================================================
    db = SessionLocal()
    semua_jurnal = db.query(JurnalUmum).all()
    semua_barang = db.query(Barang).all()

    hari_ini = datetime.date.today()
    awal_bulan = hari_ini.replace(day=1)
    awal_minggu = hari_ini - datetime.timedelta(days=hari_ini.weekday())

    kas_tunai, bank, total_uang_masuk, total_uang_keluar = 0, 0, 0, 0
    jual_hari_ini_rp, jual_hari_ini_pcs = 0, 0
    jual_bulan_ini_rp, jual_bulan_ini_pcs = 0, 0
    masuk_hari_ini_rp, masuk_hari_ini_pcs = 0, 0
    masuk_bulan_ini_rp, masuk_bulan_ini_pcs = 0, 0
    cutting_minggu_ini_pcs = 0

    from models import HeaderPenjualan, DetailPenjualan, KategoriBarang
    penjualan_list = db.query(HeaderPenjualan).order_by(HeaderPenjualan.tanggal.desc()).limit(3).all()
    detail_penjualan_map = {}
    for pj in penjualan_list:
        details = db.query(DetailPenjualan).filter(DetailPenjualan.no_invoice == pj.no_invoice).all()
        detail_penjualan_map[pj.no_invoice] = details

    for j in semua_jurnal:
        tgl_jurnal = j.tanggal.date() if isinstance(j.tanggal, datetime.datetime) else j.tanggal
        dbt = j.debit or 0
        krd = j.kredit or 0

        if j.kode_akun == "11110": kas_tunai += (dbt - krd)
        elif j.kode_akun == "11120": bank += (dbt - krd)

        if j.kode_akun in ["11110", "11120"]:
            total_uang_masuk += dbt
            total_uang_keluar += krd

        if j.kode_akun == "41110" and krd > 0:
            pcs = ekstrak_pcs(j.keterangan)
            if tgl_jurnal == hari_ini:
                jual_hari_ini_rp += krd; jual_hari_ini_pcs += pcs
            if tgl_jurnal >= awal_bulan:
                jual_bulan_ini_rp += krd; jual_bulan_ini_pcs += pcs

        if j.kode_akun == "51110" and dbt > 0 and "cutting" in str(j.keterangan).lower():
            pcs = ekstrak_pcs(j.keterangan)
            if tgl_jurnal >= awal_minggu:
                cutting_minggu_ini_pcs += pcs

        if j.kode_akun == "12150" and "masuk" in str(j.keterangan).lower():
            pcs = ekstrak_pcs(j.keterangan)
            if tgl_jurnal == hari_ini:
                masuk_hari_ini_rp += dbt; masuk_hari_ini_pcs += pcs
            if tgl_jurnal >= awal_bulan:
                masuk_bulan_ini_rp += dbt; masuk_bulan_ini_pcs += pcs

    total_stok_pcs = sum((b.stok_saat_ini or 0) for b in semua_barang if b.kategori == KategoriBarang.BARANG_JADI)
    total_nilai_persediaan = sum(((b.stok_saat_ini or 0) / 12) * (b.harga_jual or 0) for b in semua_barang if b.kategori == KategoriBarang.BARANG_JADI)
    kain_gudang = [b for b in semua_barang if b.kategori == KategoriBarang.BAHAN_BAKU]
    total_stok_kain_kg = sum((b.stok_saat_ini or 0) for b in kain_gudang)

    target_cutting = 12000
    persen_cutting = min(int((cutting_minggu_ini_pcs / target_cutting) * 100), 100) if target_cutting > 0 else 0

    # =========================================================================
    # HEADER
    # =========================================================================
    col_head, col_date = st.columns([3, 1])
    with col_head:
        tanggal_str = hari_ini.strftime("%b %d, %Y")
        st.markdown(
            '<p class="dash-header-label">DASHBOARD OVERVIEW</p>',
            unsafe_allow_html=True
        )
        st.markdown(
            '<h1 class="dash-header-title">Dashboard-Raziq Garment-2026</h1>',
            unsafe_allow_html=True
        )
    with col_date:
        tanggal_str = hari_ini.strftime("%b %d, %Y")
        st.markdown(f"""
        <div style="display:flex;justify-content:flex-end;padding-top:14px;">
          <div class="dash-date-box">
            <span style="font-size:22px;">📅</span>
            <div>
              <div class="dash-date-label">Today</div>
              <div class="dash-date-value">{tanggal_str}</div>
            </div>
          </div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # =========================================================================
    # SEKSI 1: POSISI KEUANGAN - 4 KARTU
    # =========================================================================
    st.markdown('<p class="dash-section-title">🏦 Posisi Keuangan (Real-Time)</p>', unsafe_allow_html=True)

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.markdown(f"""
        <div class="fin-card">
          <span class="fin-card-badge badge-live">● LIVE</span>
          <div class="fin-card-icon">💵</div>
          <div class="fin-card-label">Sisa Saldo Tunai</div>
          <div class="fin-card-value">{_safe(format_rp(kas_tunai))}</div>
        </div>""", unsafe_allow_html=True)

    with c2:
        st.markdown(f"""
        <div class="fin-card">
          <span class="fin-card-badge badge-live">● LIVE</span>
          <div class="fin-card-icon">🏦</div>
          <div class="fin-card-label">Sisa Saldo Bank</div>
          <div class="fin-card-value">{_safe(format_rp(bank))}</div>
        </div>""", unsafe_allow_html=True)

    with c3:
        st.markdown(f"""
        <div class="fin-card">
          <span class="fin-card-badge badge-up">↑ +Masuk</span>
          <div class="fin-card-icon">📈</div>
          <div class="fin-card-label">Total Uang Masuk</div>
          <div class="fin-card-value">{_safe(format_rp(total_uang_masuk))}</div>
          <div class="fin-card-sub">Bulan Ini</div>
        </div>""", unsafe_allow_html=True)

    with c4:
        st.markdown(f"""
        <div class="fin-card">
          <span class="fin-card-badge badge-down">↓ -Keluar</span>
          <div class="fin-card-icon">📉</div>
          <div class="fin-card-label">Total Uang Keluar</div>
          <div class="fin-card-value red">{_safe(format_rp(total_uang_keluar))}</div>
          <div class="fin-card-sub">Bulan Ini</div>
        </div>""", unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # =========================================================================
    # SEKSI 2: LAPORAN PENJUALAN & PRODUKSI (2 KOLOM)
    # Penting: seluruh HTML dibangun sebagai 1 string sebelum st.markdown
    # karena Streamlit tidak bisa menggabungkan <div> dari beberapa call
    # =========================================================================
    col_jual, col_prod = st.columns(2)

    # ---- PANEL KIRI: LAPORAN PENJUALAN ----
    with col_jual:
        # Build complete HTML string first
        po_rows_html = ""
        if penjualan_list:
            for pj in penjualan_list:
                status = pj.metode_bayar or "PROSES"
                if "tunai" in status.lower() or "cash" in status.lower():
                    status_cls = "st-selesai"; status_lbl = "SELESAI"
                elif "piutang" in status.lower() or "tempo" in status.lower():
                    status_cls = "st-pending"; status_lbl = "PENDING BAYAR"
                else:
                    status_cls = "st-proses"; status_lbl = "PROSES"
                details = detail_penjualan_map.get(pj.no_invoice, [])
                nama_produk = _safe(details[0].nama_barang if details else "Produk Campuran")
                no_inv = _safe(pj.no_invoice)
                total = _safe(format_rp(pj.total_tagihan))
                po_rows_html += f"""
                <div class="po-row">
                  <div class="po-badge">PO</div>
                  <div class="po-detail">
                    <div class="po-no">{no_inv}</div>
                    <div class="po-name">{nama_produk}</div>
                  </div>
                  <div class="po-right">
                    <div class="po-value">{total}</div>
                    <span class="{status_cls}">{status_lbl}</span>
                  </div>
                </div>"""
        else:
            po_rows_html = '<div style="color:#9CA3AF;font-size:13px;text-align:center;padding:24px 0;">Belum ada data penjualan.</div>'

        # Render sekaligus sebagai satu blok HTML lengkap - gunakan string concat, bukan f-string
        panel_jual_html = (
            '<div class="panel-card">'
            '<div class="panel-header">'
            '<span class="panel-title-text">&#127991; Laporan Penjualan</span>'
            '<span class="panel-dots">&bull;&bull;&bull;</span>'
            '</div>'
            + po_rows_html +
            '</div>'
        )
        st.markdown(panel_jual_html, unsafe_allow_html=True)

    # ---- PANEL KANAN: LAPORAN PRODUKSI & MASUK ----
    with col_prod:
        prod_data = [
            ("&#9986;", "Cutting Minggu Ini", "Total produksi cutting",
             f"{cutting_minggu_ini_pcs:,.0f} Pcs", f"{cutting_minggu_ini_pcs/12:,.1f} Lusin"),
            ("&#128666;", "Masuk Gudang Hari Ini", "Barang masuk ke gudang",
             f"{masuk_hari_ini_pcs:,.0f} Pcs", _safe(format_rp(masuk_hari_ini_rp))),
            ("&#129525;", "Masuk Gudang Bulan Ini", "Total barang masuk bulan ini",
             f"{masuk_bulan_ini_pcs:,.0f} Pcs", _safe(format_rp(masuk_bulan_ini_rp))),
        ]
        prod_rows_html = ""
        for icon, title, sub, qty, desc in prod_data:
            prod_rows_html += f"""
            <div class="prod-row">
              <div class="prod-icon">{icon}</div>
              <div class="prod-detail">
                <div class="prod-no">{title}</div>
                <div class="prod-name">{sub}</div>
              </div>
              <div class="prod-right">
                <div class="prod-qty">{qty}</div>
                <div class="prod-desc">{desc}</div>
              </div>
            </div>"""

        panel_prod_html = (
            '<div class="panel-card">'
            '<div class="panel-header">'
            '<span class="panel-title-text">&#9986; Laporan Produksi &amp; Masuk</span>'
            '<span class="panel-dots">&bull;&bull;&bull;</span>'
            '</div>'
            + prod_rows_html +
            '</div>'
        )
        st.markdown(panel_prod_html, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # =========================================================================
    # SEKSI 3: STATUS GUDANG AKHIR - 3 KARTU
    # =========================================================================
    st.markdown('<p class="dash-section-title">🏭 Status Gudang Akhir</p>', unsafe_allow_html=True)

    g1, g2, g3 = st.columns(3)

    with g1:
        fill_pct = persen_cutting
        st.markdown(f"""
        <div class="gudang-dark">
          <div class="gudang-label">CUTTING MINGGU INI</div>
          <div>
            <span class="gudang-value-big">{cutting_minggu_ini_pcs:,.0f}</span>
            <span class="gudang-unit-text">Pcs</span>
          </div>
          <div class="gudang-progress-wrap">
            <div style="height:100%;width:{fill_pct}%;background:rgba(255,255,255,0.85);border-radius:10px;transition:width 0.5s;"></div>
          </div>
          <div class="gudang-sub-text">{fill_pct}% dari target mingguan</div>
        </div>
        """, unsafe_allow_html=True)

    with g2:
        delta_pcs = masuk_bulan_ini_pcs - jual_bulan_ini_pcs
        delta_str = f"+{delta_pcs/12:,.1f}" if delta_pcs >= 0 else f"{delta_pcs/12:,.1f}"
        delta_color = "#065F46" if delta_pcs >= 0 else "#B91C1C"
        st.markdown(f"""
        <div class="gudang-light">
          <div class="gudang-label" style="color:#6B7280;">PERSEDIAAN BAJU JADI</div>
          <div>
            <span class="gudang-value-big" style="color:#111827;">{total_stok_pcs/12:,.1f}</span>
            <span style="font-size:14px;color:#6B7280;font-weight:500;margin-left:3px;">Lusin</span>
          </div>
          <div style="font-size:11px;color:#9CA3AF;margin-top:4px;">Ready</div>
          <div style="margin-top:10px;font-size:12px;font-weight:700;color:{delta_color};">
            {delta_str} Ls <span style="color:#9CA3AF;font-weight:400;">vs bulan lalu</span>
          </div>
        </div>
        """, unsafe_allow_html=True)

    with g3:
        kain_detail_html = ""
        if kain_gudang:
            top3 = sorted(kain_gudang, key=lambda x: x.stok_saat_ini or 0, reverse=True)[:3]
            items = "".join([f"""
              <div>
                <div class="gdl">{_safe(k.nama_barang[:7] if k.nama_barang else k.kode_sku)}:</div>
                <div class="gdv">{int(k.stok_saat_ini or 0)}kg</div>
              </div>
            """ for k in top3])
            kain_detail_html = f'<div class="gudang-detail-flex">{items}</div>'

        st.markdown(f"""
        <div class="gudang-light">
          <div class="gudang-label" style="color:#6B7280;">SISA KAIN</div>
          <div>
            <span class="gudang-value-big" style="color:#111827;">{total_stok_kain_kg:,.0f}</span>
            <span style="font-size:14px;color:#6B7280;font-weight:500;margin-left:3px;">Kg</span>
          </div>
          {kain_detail_html}
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # =========================================================================
    # EXPANDER DETAIL STOK KAIN (LOGIKA TIDAK DIUBAH)
    # =========================================================================
    with st.expander("📦 Klik untuk melihat rincian Stok Kain (Bahan Baku) di Gudang"):
        if kain_gudang:
            df_kain = pd.DataFrame([{
                "SKU / Kode": k.kode_sku,
                "Nama & Warna Kain": k.nama_barang,
                "Sisa Stok di Gudang": f"{k.stok_saat_ini:g} Kg",
                "Estimasi Aset (Rp)": format_rp((k.stok_saat_ini or 0) * (k.harga_modal or 0))
            } for k in kain_gudang if k.stok_saat_ini and k.stok_saat_ini > 0])
            if not df_kain.empty:
                df_kain.index = df_kain.index + 1
                st.dataframe(df_kain, use_container_width=True)
            else:
                st.info("Semua stok kain saat ini sedang kosong (0 Kg).", icon=":material/info:")
        else:
            st.warning("Belum ada data Bahan Baku.", icon=":material/warning:")

    db.close()