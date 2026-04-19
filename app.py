import streamlit as st
import time
from streamlit_option_menu import option_menu
from streamlit_cookies_controller import CookieController
from tema import terapkan_tema_emerald

import menu_dashboard
import menu_master
import menu_produksi
import menu_persediaan 
import menu_pembelian
import menu_penjualan
import menu_kasbon
import menu_riwayat
import menu_saldo_awal 
import menu_laporan
import menu_kas_piutang
import menu_login

st.set_page_config(page_title="ansa | tech - ERP Enterprise", layout="wide", initial_sidebar_state="expanded")
terapkan_tema_emerald()
# --- PERUBAHAN DI SINI ---
# Inisialisasi pengontrol cookie & baca statusnya dari browser
controller = CookieController()
status_login = controller.get("status_login")

# JIKA BELUM LOGIN (Cookie tidak ditemukan) -> Tampilkan Halaman Login
if status_login != "aktif":
    menu_login.tampilkan_login()

# JIKA SUDAH LOGIN -> Tampilkan Aplikasi Utama
else:
    # =====================================================================
    # SUNTIKAN CSS: TEMA HIJAU ELEGAN, FONT APTOS & ANIMASI
    # =====================================================================
    st.markdown("""
        <style>
        html, body, p, label, input, button, .stMarkdown, div { font-family: 'Aptos', 'Segoe UI', sans-serif !important; }
        .material-icons, .material-symbols-rounded, .stIcon { font-family: 'Material Symbols Rounded', 'Material Icons' !important; }
        h1, h2, h3, h4, h5, h6 { color: #064E3B !important; font-weight: 800 !important; }
        .stMetric { background-color: #ECFDF5 !important; padding: 20px !important; border-radius: 12px !important; border-left: 6px solid #064E3B !important; box-shadow: 0 4px 6px rgba(0,0,0,0.05) !important; transition: transform 0.3s ease !important; }
        .stMetric:hover { transform: translateY(-5px) !important; }
        [data-testid="stMetricValue"] { color: #064E3B !important; font-weight: bold !important; }
        .stButton > button { background-color: #064E3B !important; color: #FFFFFF !important; border-radius: 8px !important; border: none !important; font-weight: 600 !important; padding: 0.5rem 1rem !important; transition: all 0.3s ease !important; }
        .stButton > button:hover { background-color: #10B981 !important; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4) !important; color: white !important; }
        [data-testid="stSidebar"] { background-color: #F8FAF0 !important; border-right: 1px solid #E5E7EB !important; }
        </style>
        """, unsafe_allow_html=True)
    # =====================================================================

    # =====================================================================
    # SIDEBAR DENGAN MENU PROFESIONAL & IKON BOOTSTRAP
    # =====================================================================
    with st.sidebar:
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            try:
                st.image("logo_ansa.png", width=300)
            except:
                st.markdown("<h2 style='text-align:center;'>ANSA | TECH</h2>", unsafe_allow_html=True)

        st.markdown("<div style='margin-bottom: 10px;'></div>", unsafe_allow_html=True)
        
        menu = option_menu(
            menu_title=None,  
            options= ["Dashboard", "Master Data & SKU", "Persediaan Awal", "Produksi Harian", "Pembelian & Biaya", "Penjualan", "Kas, Piutang & Utang", "Laporan Keuangan", "Kasbon Karyawan", "Riwayat & Edit"],
            icons=['grid-fill', 'box-seam-fill', 'archive-fill', 'scissors', 'cart-check-fill', 'truck', 'wallet2', 'file-earmark-bar-graph-fill', 'person-badge-fill', 'clock-history'],
            default_index=0,
            styles={
                "container": {"padding": "0!important", "background-color": "transparent"},
                "icon": {"color": "#6B7280", "font-size": "18px"}, 
                "nav-link": {"font-size": "15px", "text-align": "left", "margin": "5px 0px", "padding": "12px 15px", "border-radius": "10px", "color": "#4B5563", "font-weight": "600", "transition": "all 0.3s ease-in-out" },
                "nav-link-selected": {"background-color": "#064E3B", "color": "#FFFFFF", "font-weight": "700"},
            }
        )

        st.markdown("<hr style='margin-top: 20px; margin-bottom: 10px;'>", unsafe_allow_html=True)
        
        if st.button(" :material/logout: Keluar (Logout)", use_container_width=True):
            controller.remove("status_login")
            time.sleep(0.5) # Beri jeda sedikit agar proses hapus cookie sempurna
            st.rerun()

    # =====================================================================
    # TERMINAL PUSAT PEMANGGIL FILE MENU 
    # =====================================================================
    if menu == "Dashboard":
        menu_dashboard.jalankan()
    elif menu == "Master Data & SKU":
        menu_master.jalankan()
    elif menu == "Persediaan Awal":      
        menu_saldo_awal.jalankan()         
    elif menu == "Produksi Harian":
        menu_produksi.jalankan()
    elif menu == "Pembelian & Biaya":
        menu_pembelian.jalankan()
    elif menu == "Penjualan":
        menu_penjualan.jalankan()
    elif menu == "Laporan Keuangan":
        menu_laporan.jalankan()
    elif menu == "Kas, Piutang & Utang":
        menu_kas_piutang.jalankan()
    elif menu == "Kasbon Karyawan":
        menu_kasbon.jalankan()
    elif menu == "Riwayat & Edit":
        menu_riwayat.jalankan()