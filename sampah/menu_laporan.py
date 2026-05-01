import streamlit as st
import pandas as pd
import datetime
import time
from database import SessionLocal
from models import JurnalUmum, AkunBukuBesar
from utils import format_rp
from pdf_generator import export_laporan_2kolom_pdf, export_dataframe_pdf

desain_tab = """
<style>
    /* Memberikan jarak/sekat antar tab */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px; 
    }

    /* Tampilan Dasar Tab (Sedang Tidak Aktif) */
    .stTabs [data-baseweb="tab"] {
        background-color: #f0f2f6;
        border-radius: 8px 8px 0px 0px; /* Ujung atas melengkung */
        color: #4a4a4a;
        font-weight: 600;
        padding: 10px 15px;
        border: 1px solid #d1d5db;
        border-bottom: none;
        transition: all 0.3s ease-in-out; /* Animasi pergerakan smooth */
    }

    /* Animasi saat Mouse melewari Tab (Hover) */
    .stTabs [data-baseweb="tab"]:hover {
        background-color: #e2e8f0;
        transform: translateY(-3px); /* Efek tombol terangkat ke atas */
        color: #0b5345;
    }

    /* Tampilan Tab yang Sedang Aktif (Terpilih) */
    .stTabs [aria-selected="true"] {
        background-color: #0b5345 !important; /* Warna hijau khas pabrik */
        color: white !important;
        border: 1px solid #0b5345 !important;
        box-shadow: 0px -3px 10px rgba(11, 83, 69, 0.3) !important; /* Efek cahaya di atas */
    }
    
    /* Menyembunyikan garis bawah default biru dari Streamlit */
    .stTabs [data-baseweb="tab-highlight"] {
        display: none;
    }
</style>
"""
def get_saldo(jurnals, prefixes, normal="debit"):
    saldo_dict = {}
    total = 0
    for j in jurnals:
        if j.kode_akun and any(str(j.kode_akun).startswith(p) for p in prefixes):
            val = (j.debit or 0) - (j.kredit or 0) if normal == "debit" else (j.kredit or 0) - (j.debit or 0)
            if val != 0:
                nama = f"[{j.kode_akun}] {j.nama_akun}"
                saldo_dict[nama] = saldo_dict.get(nama, 0) + val
                total += val
    
    saldo_dict = {k: v for k, v in saldo_dict.items() if v != 0}
    return saldo_dict, total

def render_tabel(judul, saldo_dict, total, is_detail, is_negative=False):
    if total == 0 and not saldo_dict:
        return "" 
        
    html = "<table style='width:100%; margin-bottom: 10px; border-collapse: collapse; font-family: Arial, sans-serif;'>"
    warna_total = "#8B0000" if is_negative else "#006400" 
    
    if is_detail:
        html += f"<tr><td colspan='2' style='font-weight: bold; background-color: #f0f2f6; padding: 6px; border: 1px solid #ddd;'>{judul}</td></tr>"
        for akun, val in saldo_dict.items():
            tampil_val = f"({format_rp(abs(val))})" if is_negative else format_rp(val)
            html += f"<tr><td style='padding: 4px 8px; border: 1px solid #ddd; padding-left: 15px; font-size: 14px;'>{akun}</td><td style='text-align: right; border: 1px solid #ddd; padding: 4px 8px; font-size: 14px;'>{tampil_val}</td></tr>"
        tampil_total = f"({format_rp(abs(total))})" if is_negative else format_rp(total)
        html += f"<tr><td style='font-weight: bold; padding: 6px 8px; text-align: right; font-size: 14px; border: 1px solid #ddd;'>Total {judul}</td><td style='text-align: right; font-weight: bold; padding: 6px 8px; border: 2px solid #ccc; color: {warna_total};'>{tampil_total}</td></tr>"
    else:
        tampil_total = f"({format_rp(abs(total))})" if is_negative else format_rp(total)
        html += f"<tr><td style='font-weight: bold; padding: 8px; border: 1px solid #ddd;'>{judul}</td><td style='text-align: right; font-weight: bold; padding: 8px; border: 1px solid #ddd; color: {warna_total};'>{tampil_total}</td></tr>"
        
    html += "</table>"
    st.markdown(html, unsafe_allow_html=True)

# Fungsi bantu untuk convert dictionary saldo ke format list PDF
def dict_to_pdf_list(kategori, saldo_dict):
    if not saldo_dict: return []
    res = [(kategori, None, True)]
    for k, v in saldo_dict.items(): res.append((k, v, False))
    return res

# =====================================================================
# TAMPILAN UTAMA
# =====================================================================
def jalankan():
    st.markdown(desain_tab, unsafe_allow_html=True)
    db = SessionLocal()
    
    st.markdown("<h2 style='text-align: center; margin-bottom: 0px;'>RAZIQ GARMENT</h2>", unsafe_allow_html=True)
    st.markdown("<h4 style='text-align: center; margin-top: 0px; color: #555;'>Laporan Keuangan Komprehensif</h4>", unsafe_allow_html=True)
    
    col_bln, col_thn, col_toggle = st.columns([1, 1, 2])
    
    bulan_dict = {1: "Januari", 2: "Februari", 3: "Maret", 4: "April", 5: "Mei", 6: "Juni", 7: "Juli", 8: "Agustus", 9: "September", 10: "Oktober", 11: "November", 12: "Desember"}
    now = datetime.datetime.now()
    
    bln_pilih = col_bln.selectbox("Bulan Laporan", list(bulan_dict.keys()), format_func=lambda x: bulan_dict[x], index=now.month-1)
    thn_pilih = col_thn.selectbox("Tahun Laporan", range(2020, 2035), index=now.year - 2020)
    
    tampilan = col_toggle.radio("Tampilan Rincian:", ["Ringkas (Per Kategori)", "Detail (Per Akun)"], horizontal=True)
    is_detail = tampilan == "Detail (Per Akun)"
    
    # Perhitungan Tanggal Cut-Off
    tgl_mulai = datetime.date(thn_pilih, bln_pilih, 1)
    if bln_pilih == 12:
        tgl_akhir = datetime.date(thn_pilih + 1, 1, 1) - datetime.timedelta(days=1)
    else:
        tgl_akhir = datetime.date(thn_pilih, bln_pilih + 1, 1) - datetime.timedelta(days=1)

    periode_str = f"{bulan_dict[bln_pilih]} {thn_pilih}"
    st.markdown(f"<p style='text-align: center; font-style: italic; color: #888; margin-top: -10px;'>Periode: {periode_str}</p>", unsafe_allow_html=True)
    st.markdown("---")

    # ---------------------------------------------------------
    # PEMBELAHAN DATA (PERIODIK vs AKUMULASI)
    # ---------------------------------------------------------
    semua_jurnal = db.query(JurnalUmum).all()
    jurnals_akumulasi = [] 
    jurnals_periode = []   

    for j in semua_jurnal:
        tgl_j = j.tanggal.date() if hasattr(j.tanggal, 'date') else j.tanggal
        if tgl_j <= tgl_akhir:
            jurnals_akumulasi.append(j)
            if tgl_j >= tgl_mulai:
                jurnals_periode.append(j)

    # === KALKULASI BERKALA (UNTUK HPP & LABA RUGI) ===
    d_pendapatan_per, t_pendapatan_per = get_saldo(jurnals_periode, ["41"], "kredit")
    d_hpp_total_per, t_hpp_total_per = get_saldo(jurnals_periode, ["51"], "debit") 
    d_beban_jual_per, t_beban_jual_per = get_saldo(jurnals_periode, ["61"], "debit")
    d_beban_admin_per, t_beban_admin_per = get_saldo(jurnals_periode, ["62"], "debit")
    
    laba_kotor_per = t_pendapatan_per - t_hpp_total_per
    total_opex_per = t_beban_jual_per + t_beban_admin_per
    laba_bersih_per = laba_kotor_per - total_opex_per

    # === KALKULASI AKUMULASI (UNTUK NERACA & EKUITAS) ===
    d_lancar, t_lancar = get_saldo(jurnals_akumulasi, ["11", "12"], "debit")
    d_tetap, t_tetap = get_saldo(jurnals_akumulasi, ["13110", "13210", "13310", "13410"], "debit")
    d_susut, t_susut = get_saldo(jurnals_akumulasi, ["13120", "13220", "13320", "13420"], "kredit") 
    net_aset_tetap = t_tetap - t_susut
    total_aset = t_lancar + net_aset_tetap

    d_utang_pdk, t_utang_pdk = get_saldo(jurnals_akumulasi, ["21"], "kredit")
    d_utang_pjg, t_utang_pjg = get_saldo(jurnals_akumulasi, ["22"], "kredit")
    d_modal, t_modal = get_saldo(jurnals_akumulasi, ["311", "313"], "kredit")
    d_prive, t_prive = get_saldo(jurnals_akumulasi, ["312"], "debit") 

    _, t_pend_ak = get_saldo(jurnals_akumulasi, ["41"], "kredit")
    _, t_hpp_ak = get_saldo(jurnals_akumulasi, ["51"], "debit")
    _, t_bbn_jual_ak = get_saldo(jurnals_akumulasi, ["61"], "debit")
    _, t_bbn_admin_ak = get_saldo(jurnals_akumulasi, ["62"], "debit")
    
    laba_akumulasi = t_pend_ak - t_hpp_ak - t_bbn_jual_ak - t_bbn_admin_ak
    total_ekuitas = t_modal - t_prive + laba_akumulasi
    total_pasiva = t_utang_pdk + t_utang_pjg + total_ekuitas

    # ---------------------------------------------------------
    # RENDER TAB UI (100% LENGKAP)
    # ---------------------------------------------------------
    tab1, tab2, tab3, tab4, tab5, = st.tabs([
        ":material/finance: HPP", 
        ":material/finance_mode: Laba Rugi", 
        ":material/account_balance: Neraca", 
        ":material/finance_chip: Ekuitas", 
        ":material/analytics: Buku Besar", 
    ])
    
    # === TAB 1: HPP ===
    with tab1:
        st.info(f"💡 HPP & Biaya Produksi khusus selama **{periode_str}**")
        render_tabel("Pemakaian Bahan Baku", *get_saldo(jurnals_periode, ["51110"], "debit"), is_detail)
        render_tabel("Biaya Tenaga Kerja Langsung (BTKL)", *get_saldo(jurnals_periode, ["512"], "debit"), is_detail)
        render_tabel("Biaya Overhead Pabrik (BOP)", *get_saldo(jurnals_periode, ["513"], "debit"), is_detail)
        render_tabel("HPP Barang Terjual", *get_saldo(jurnals_periode, ["51120"], "debit"), is_detail)
        
        d_ikhtisar, t_ikhtisar = get_saldo(jurnals_periode, ["51199"], "kredit") 
        if t_ikhtisar > 0:
            render_tabel("Potongan Ikhtisar Produksi (Masuk Gudang)", d_ikhtisar, t_ikhtisar, is_detail, is_negative=True)
            
        st.markdown("<hr style='margin:10px 0;'>", unsafe_allow_html=True)
        st.success(f"**Total Harga Pokok (HPP) Bulan Ini: {format_rp(t_hpp_total_per)}**")
        
        # EXPORT PDF 1: HPP
        data_hpp = []
        data_hpp += dict_to_pdf_list("Pemakaian Bahan Baku", get_saldo(jurnals_periode, ["51110"], "debit")[0])
        data_hpp += dict_to_pdf_list("Biaya Tenaga Kerja Langsung (BTKL)", get_saldo(jurnals_periode, ["512"], "debit")[0])
        data_hpp += dict_to_pdf_list("Biaya Overhead Pabrik (BOP)", get_saldo(jurnals_periode, ["513"], "debit")[0])
        data_hpp += dict_to_pdf_list("HPP Barang Terjual", get_saldo(jurnals_periode, ["51120"], "debit")[0])
        
        st.markdown("<hr>", unsafe_allow_html=True)
        col_pdf1, col_pdf2 = st.columns([3, 1])
        with col_pdf2:
            st.download_button("📄 Download PDF Laporan HPP", export_laporan_2kolom_pdf("LAPORAN HARGA POKOK PENJUALAN", periode_str, data_hpp, "TOTAL HPP BULAN INI", t_hpp_total_per), f"HPP_{periode_str}.pdf", "application/pdf")

    # === TAB 2: LABA RUGI ===
    with tab2:
        st.info(f"💡 Performa Laba/Rugi Pabrik selama **{periode_str}**")
        render_tabel("Pendapatan Operasional", d_pendapatan_per, t_pendapatan_per, is_detail)
        render_tabel("Harga Pokok Produksi (HPP)", {"Total HPP": t_hpp_total_per}, t_hpp_total_per, is_detail=False, is_negative=True) 
        
        st.markdown(f"<div style='text-align: right; font-weight: bold; font-size: 16px; margin-bottom: 20px;'>Laba Kotor: {format_rp(laba_kotor_per)}</div>", unsafe_allow_html=True)
        
        render_tabel("Beban Pemasaran & Penjualan", d_beban_jual_per, t_beban_jual_per, is_detail, is_negative=True)
        render_tabel("Beban Administrasi & Umum", d_beban_admin_per, t_beban_admin_per, is_detail, is_negative=True)
        
        st.markdown("<hr style='margin:10px 0;'>", unsafe_allow_html=True)
        warna_laba = "#1e8449" if laba_bersih_per >= 0 else "#c0392b"
        teks_laba = "LABA BERSIH (PERIODE INI)" if laba_bersih_per >= 0 else "RUGI BERSIH (PERIODE INI)"
        st.markdown(f"<h3 style='color: {warna_laba}; text-align: right;'>{teks_laba} : {format_rp(laba_bersih_per)}</h3>", unsafe_allow_html=True)
        
        # EXPORT PDF 2: LABA RUGI
        data_lr = []
        data_lr += dict_to_pdf_list("PENDAPATAN OPERASIONAL", d_pendapatan_per)
        data_lr.append(("Harga Pokok Produksi (HPP)", -t_hpp_total_per, False))
        data_lr.append(("LABA KOTOR (Pendapatan - HPP)", laba_kotor_per, True))
        data_lr += dict_to_pdf_list("Beban Pemasaran & Penjualan", {k: -v for k,v in d_beban_jual_per.items()})
        data_lr += dict_to_pdf_list("Beban Administrasi & Umum", {k: -v for k,v in d_beban_admin_per.items()})
        
        st.markdown("<hr>", unsafe_allow_html=True)
        col_pdf1, col_pdf2 = st.columns([3, 1])
        with col_pdf2:
            st.download_button("📄 Download PDF Laba Rugi", export_laporan_2kolom_pdf("LAPORAN LABA RUGI", periode_str, data_lr, "LABA BERSIH PERIODE INI", laba_bersih_per), f"Laba_Rugi_{periode_str}.pdf", "application/pdf")

    # === TAB 3: NERACA ===
    with tab3:
        st.info(f"💡 Posisi Harta & Utang Pabrik terhitung **sejak berdiri hingga {tgl_akhir.strftime('%d %B %Y')}**")
        col_aset, col_pasiva = st.columns(2)
        
        with col_aset:
            st.markdown("<h4 style='text-align: center; background-color: #2e4053; color: white; padding: 5px;'>AKTIVA (ASET)</h4>", unsafe_allow_html=True)
            render_tabel("Aset Lancar & Persediaan", d_lancar, t_lancar, is_detail)
            render_tabel("Aset Tetap Pabrik", d_tetap, t_tetap, is_detail)
            if t_susut > 0:
                render_tabel("Akumulasi Penyusutan Aset", d_susut, t_susut, is_detail, is_negative=True)
                st.markdown(f"<div style='text-align: right; font-weight: bold; font-size: 13px; color: #555;'>Nilai Buku Aset Tetap: {format_rp(net_aset_tetap)}</div><br>", unsafe_allow_html=True)
                
            st.success(f"**TOTAL ASET : {format_rp(total_aset)}**")
            
        with col_pasiva:
            st.markdown("<h4 style='text-align: center; background-color: #2e4053; color: white; padding: 5px;'>PASIVA (KEWAJIBAN & EKUITAS)</h4>", unsafe_allow_html=True)
            render_tabel("Kewajiban Jangka Pendek", d_utang_pdk, t_utang_pdk, is_detail)
            render_tabel("Kewajiban Jangka Panjang", d_utang_pjg, t_utang_pjg, is_detail)
            render_tabel("Modal Disetor", d_modal, t_modal, is_detail)
            
            if t_prive > 0:
                render_tabel("Prive (Penarikan Pribadi)", d_prive, t_prive, is_detail, is_negative=True)
                
            html_laba = f"<table style='width:100%; margin-bottom: 10px;'><tr><td style='font-weight: bold; padding: 8px;'>Laba Ditahan & Berjalan</td><td style='text-align: right; font-weight: bold; padding: 8px;'>{format_rp(laba_akumulasi)}</td></tr></table>"
            st.markdown(html_laba, unsafe_allow_html=True)
            
            st.info(f"**TOTAL PASIVA : {format_rp(total_pasiva)}**")

        st.markdown("---")
        if round(total_aset, 2) == round(total_pasiva, 2):
            st.markdown("<h3 style='text-align: center; color: #27ae60;'>✅ NERACA BALANCE!</h3>", unsafe_allow_html=True)
        else:
            selisih = abs(total_aset - total_pasiva)
            st.markdown(f"<h3 style='text-align: center; color: #c0392b;'>❌ NERACA TIDAK BALANCE! (Selisih: {format_rp(selisih)})</h3>", unsafe_allow_html=True)

        # EXPORT PDF 3: NERACA
        data_neraca = []
        data_neraca.append(("AKTIVA (ASET)", None, True))
        data_neraca += dict_to_pdf_list("Aset Lancar", d_lancar)
        data_neraca += dict_to_pdf_list("Aset Tetap", d_tetap)
        if t_susut > 0: data_neraca.append(("Akumulasi Penyusutan", -t_susut, False))
        data_neraca.append(("TOTAL AKTIVA", total_aset, True))
        data_neraca.append(("PASIVA (KEWAJIBAN & EKUITAS)", None, True))
        data_neraca += dict_to_pdf_list("Kewajiban Jangka Pendek", d_utang_pdk)
        data_neraca += dict_to_pdf_list("Kewajiban Jangka Panjang", d_utang_pjg)
        data_neraca += dict_to_pdf_list("Modal Disetor", d_modal)
        data_neraca.append(("Laba Ditahan & Berjalan", laba_akumulasi, False))
        
        st.markdown("<hr>", unsafe_allow_html=True)
        col_pdf1, col_pdf2 = st.columns([3, 1])
        with col_pdf2:
            st.download_button("📄 Download PDF Neraca", export_laporan_2kolom_pdf("LAPORAN NERACA (BALANCE SHEET)", periode_str, data_neraca, "TOTAL PASIVA", total_pasiva), f"Neraca_{periode_str}.pdf", "application/pdf")

    # === TAB 4: EKUITAS ===
    with tab4:
        st.info("💡 Perubahan Ekuitas / Modal Pemilik")
        render_tabel("Modal Awal / Ditahan", d_modal, t_modal, is_detail=False)
        render_tabel("Laba Akumulasi s/d Bulan Ini", {"Laba": laba_akumulasi}, laba_akumulasi, is_detail=False)
        if t_prive > 0: render_tabel("Prive (Penarikan Pribadi)", d_prive, t_prive, is_detail=False, is_negative=True)
        st.markdown("<hr style='margin:10px 0;'>", unsafe_allow_html=True)
        st.success(f"**MODAL AKHIR PEMILIK: {format_rp(total_ekuitas)}**")

        # EXPORT PDF 4: EKUITAS
        data_eq = [("Modal Disetor", t_modal, False), ("Laba Ditahan & Berjalan", laba_akumulasi, False)]
        if t_prive > 0: data_eq.append(("Prive (Penarikan Pribadi)", -t_prive, False))
        
        st.markdown("<hr>", unsafe_allow_html=True)
        col_pdf1, col_pdf2 = st.columns([3, 1])
        with col_pdf2:
            st.download_button("📄 Download PDF Ekuitas", export_laporan_2kolom_pdf("LAPORAN PERUBAHAN EKUITAS", periode_str, data_eq, "MODAL AKHIR", total_ekuitas), f"Ekuitas_{periode_str}.pdf", "application/pdf")

    # === TAB 5: BUKU BESAR & KARTU PIUTANG/HUTANG ===
    with tab5:
        st.subheader(f":material/analytics: Buku Besar & Kartu Piutang/Hutang Klien")
        st.write(f"Cek rincian detail setiap transaksi yang masuk/keluar. (Periode: {periode_str})")
        
        daftar_akun_master = db.query(AkunBukuBesar).order_by(AkunBukuBesar.kode_akun).all()
        
        if not daftar_akun_master:
            st.warning("Data Akun belum tersedia. Silakan isi di Master Data CoA.", icon=":material/warning:")
        else:
            c_akun, c_cari = st.columns([1, 1])
            akun_dipilih = c_akun.selectbox("Pilih Akun untuk Diperiksa:", daftar_akun_master, format_func=lambda x: f"[{x.kode_akun}] {x.nama_akun}")
            filter_nama = c_cari.text_input("🔍 Cari Nama Klien/Supplier (Kosongkan utk Tampil Semua)")
            
            kode_akun_pilih = akun_dipilih.kode_akun
            normal_balance = "debit" if str(kode_akun_pilih).startswith(('1', '5', '6')) else "kredit"
            
            jurnal_akun_all = db.query(JurnalUmum).filter(JurnalUmum.kode_akun == kode_akun_pilih).order_by(JurnalUmum.tanggal.asc()).all()
            
            if filter_nama:
                jurnal_akun_all = [j for j in jurnal_akun_all if filter_nama.lower() in str(j.keterangan).lower()]

            saldo_awal = 0
            data_bb = []
            
            for j in jurnal_akun_all:
                tgl_j = j.tanggal.date() if hasattr(j.tanggal, 'date') else j.tanggal
                if tgl_j < tgl_mulai:
                    d = j.debit or 0
                    k = j.kredit or 0
                    if normal_balance == "debit": saldo_awal += (d - k)
                    else: saldo_awal += (k - d)
            
            saldo_berjalan = saldo_awal
            
            teks_awal = f" SALDO AWAL {filter_nama.upper()}" if filter_nama else " SALDO AWAL (Dari Periode Sebelumnya)"
            data_bb.append({
                "Tanggal": tgl_mulai.strftime("%Y-%m-%d"),
                "Keterangan": teks_awal,
                "Debit": 0,
                "Kredit": 0,
                "Saldo Akhir": saldo_berjalan
            })
            
            transaksi_ada = False
            for j in jurnal_akun_all:
                tgl_j = j.tanggal.date() if hasattr(j.tanggal, 'date') else j.tanggal
                if tgl_mulai <= tgl_j <= tgl_akhir:
                    transaksi_ada = True
                    d = j.debit or 0
                    k = j.kredit or 0
                    
                    if normal_balance == "debit": saldo_berjalan += (d - k)
                    else: saldo_berjalan += (k - d)
                        
                    data_bb.append({
                        "Tanggal": j.tanggal.strftime("%Y-%m-%d %H:%M") if hasattr(j.tanggal, 'strftime') else str(tgl_j),
                        "Keterangan": j.keterangan,
                        "Debit": d,
                        "Kredit": k,
                        "Saldo Akhir": saldo_berjalan
                    })
                    
            if not transaksi_ada and saldo_awal == 0:
                st.info(f"Belum ada transaksi maupun saldo historis.", icon=":material/info:")
            else:
                df_bb = pd.DataFrame(data_bb)
                df_bb['Debit'] = df_bb['Debit'].apply(format_rp)
                df_bb['Kredit'] = df_bb['Kredit'].apply(format_rp)
                df_bb['Saldo Akhir'] = df_bb['Saldo Akhir'].apply(format_rp)
                
                st.dataframe(df_bb, use_container_width=True)
                st.info(f"💡 Akun ini bersaldo normal **{normal_balance.upper()}**.", icon=":material/lightbulb:")

                # EXPORT PDF 5: BUKU BESAR / KARTU PIUTANG / KARTU HUTANG
                st.markdown("<hr>", unsafe_allow_html=True)
                col_pdf1, col_pdf2 = st.columns([3, 1])
                with col_pdf2:
                    judul_kartu = f"KARTU PIUTANG/HUTANG: {filter_nama.upper()}" if filter_nama else f"BUKU BESAR: {akun_dipilih.nama_akun.upper()}"
                    st.download_button("📄 Download PDF Buku Besar", export_dataframe_pdf(judul_kartu, periode_str, df_bb, [25, 65, 33, 33, 34]), f"Kartu_{akun_dipilih.kode_akun}.pdf", "application/pdf")

    db.close()