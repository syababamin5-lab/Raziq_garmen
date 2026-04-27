import streamlit as st
import pandas as pd
import datetime
import re
from database import SessionLocal
from models import JurnalUmum, Barang, Karyawan
from utils import format_rp

def ekstrak_pcs(keterangan):
    if not keterangan: return 0
    angka = re.findall(r'\b\d+\b(?=\s*pcs)', str(keterangan).lower())
    return int(angka[0]) if angka else 0

def jalankan():
    # Menggunakan Judul yang lebih premium dan elegan
    st.title(":material/dashboard: Dashboard-Raziq Garment-2026")
    st.markdown("<p style='color: #6B7280; margin-top: -15px; margin-bottom: 30px;'>Ringkasan aktivitas operasional dan finansial hari ini.</p>", unsafe_allow_html=True)
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

        # === PERBAIKAN DASHBOARD CUTTING (Akun 51110) ===
        if j.kode_akun == "51110" and dbt > 0 and "cutting" in str(j.keterangan).lower():
            pcs = ekstrak_pcs(j.keterangan)
            if tgl_jurnal >= awal_minggu:
                cutting_minggu_ini_pcs += pcs

        # === SINKRONISASI KODE ASET BARU (12150) ===
        if j.kode_akun == "12150" and "masuk" in str(j.keterangan).lower():
            pcs = ekstrak_pcs(j.keterangan)
            if tgl_jurnal == hari_ini:
                masuk_hari_ini_rp += dbt; masuk_hari_ini_pcs += pcs
            if tgl_jurnal >= awal_bulan:
                masuk_bulan_ini_rp += dbt; masuk_bulan_ini_pcs += pcs

    # =========================================================================
    # HITUNG TOTAL STOK (POSISI TAB SUDAH DIPERBAIKI: DI LUAR LOOP JURNAL)
    # =========================================================================
    from models import KategoriBarang
    
    total_stok_pcs = sum((b.stok_saat_ini or 0) for b in semua_barang if b.kategori == KategoriBarang.BARANG_JADI)
    
    # Harga jual dalam Lusin, maka stok Pcs dibagi 12 dulu
    total_nilai_persediaan = sum(((b.stok_saat_ini or 0) / 12) * (b.harga_jual or 0) for b in semua_barang if b.kategori == KategoriBarang.BARANG_JADI)

    kain_gudang = [b for b in semua_barang if b.kategori == KategoriBarang.BAHAN_BAKU]
    total_stok_kain_kg = sum((b.stok_saat_ini or 0) for b in kain_gudang)

    st.markdown("### :material/account_balance_wallet: Posisi Keuangan (Real-Time)")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Sisa Saldo Tunai (Cash)", format_rp(kas_tunai))
    c2.metric("Sisa Saldo Bank", format_rp(bank))
    c3.metric("Total Uang Masuk", format_rp(total_uang_masuk))
    c4.metric("Total Uang Keluar", format_rp(total_uang_keluar))
    
    st.markdown("---")
    
    col_kiri, col_kanan = st.columns(2)
    with col_kiri:
        st.markdown("### :material/shopping_cart: Laporan Penjualan")
        st.info(f"**Penjualan Hari Ini:** {jual_hari_ini_pcs/12:,.1f} Lusin ({format_rp(jual_hari_ini_rp)})", icon=":material/today:")
        st.success(f"**Penjualan Bulan Ini:** {jual_bulan_ini_pcs/12:,.1f} Lusin ({format_rp(jual_bulan_ini_rp)})", icon=":material/calendar_month:")

    with col_kanan:
        st.markdown("### :material/checkroom: Laporan Produksi & Masuk")
        st.info(f"**Barang Masuk Hari Ini:** {masuk_hari_ini_pcs/12:,.1f} Lusin ({format_rp(masuk_hari_ini_rp)})", icon=":material/today:")
        st.success(f"**Barang Masuk Bulan Ini:** {masuk_bulan_ini_pcs/12:,.1f} Lusin ({format_rp(masuk_bulan_ini_rp)})", icon=":material/calendar_month:")

    st.markdown("---")
    st.markdown("### :material/inventory_2: Status Gudang Akhir")
    
    c5, c6, c7 = st.columns(3) 
    c5.metric("Cutting Minggu Ini", f"{cutting_minggu_ini_pcs:,.0f} Pcs ({cutting_minggu_ini_pcs/12:,.1f} LS)")
    c6.metric("Persediaan Baju Jadi", f"{total_stok_pcs/12:,.1f} LS", f"Nilai: {format_rp(total_nilai_persediaan)}")
    c7.metric("Sisa Kain (Belum Cutting)", f"{total_stok_kain_kg:,.1f} Kg")

    st.markdown("<br>", unsafe_allow_html=True) # Tambah jarak sedikit sebelum expander

    with st.expander("📦 Klik untuk melihat rincian Stok Kain (Bahan Baku) di Gudang"):
        if kain_gudang:
            df_kain = pd.DataFrame([{"SKU / Kode": k.kode_sku, "Nama & Warna Kain": k.nama_barang, "Sisa Stok di Gudang": f"{k.stok_saat_ini:g} Kg", "Estimasi Aset (Rp)": format_rp((k.stok_saat_ini or 0) * (k.harga_modal or 0))} for k in kain_gudang if k.stok_saat_ini > 0])
            if not df_kain.empty:
                df_kain.index = df_kain.index + 1
                st.dataframe(df_kain, use_container_width=True)
            else:
                st.info("Semua stok kain saat ini sedang kosong (0 Kg).", icon=":material/info:")
        else:
            st.warning("Belum ada data Bahan Baku.", icon=":material/warning:")

    db.close()