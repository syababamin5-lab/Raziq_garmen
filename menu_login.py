import streamlit as st
import time
from streamlit_cookies_controller import CookieController # Tambahan baru

# =====================================================================
# CSS MODERN v8 - COMPACT VERSION (NO WHITE BOX & TIGHT SPACING)
# =====================================================================
css_login = """
<style>
    /* Sembunyikan elemen bawaan Streamlit */
    #MainMenu {visibility: hidden;}
    header {visibility: hidden;}
    footer {visibility: hidden;}
    
    /* Background Gradient Full Screen */
    .stApp {
        background: linear-gradient(135deg, #021e17 0%, #0b5345 50%, #1abc9c 100%);
        background-attachment: fixed;
    }

    /* KONTAINER UTAMA (CARD KACA) - Spasi Dibuat Lebih Rapat */
    .block-container {
        background: rgba(255, 255, 255, 0.08); 
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        padding: 1.5rem 2rem !important; 
        max-width: 450px !important; 
        margin: 3vh auto !important; 
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        display: block !important;
    }

    /* WADAH LOGO TANPA KOTAK PUTIH */
    .logo-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 10px; 
        width: 100%;
        filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); 
    }
    .logo-wrapper img {
        max-width: 160px; 
        height: auto;
    }

    /* Hilangkan Border Form Default */
    [data-testid="stForm"] {
        border: none !important;
        background: transparent !important;
        padding: 0 !important;
    }

    /* Tipografi Judul */
    .app-title {
        text-align: center; color: white; font-size: 1.6rem; font-weight: 800; margin-top: 0px; line-height: 1.1;
    }
    .app-subtitle {
        text-align: center; color: #a7f3d0; font-size: 0.85rem; margin-bottom: 20px; 
    }

    /* Label & Input */
    .stTextInput p { color: #ffffff !important; font-size: 0.85rem !important; font-weight: 700 !important; margin-bottom: 2px !important; }
    .stTextInput > div > div > input { background-color: #f1f5f9 !important; color: #0f172a !important; border-radius: 8px !important; padding: 10px 15px !important; font-weight: 500 !important; }

    /* Tombol Utama */
    [data-testid="stFormSubmitButton"] > button { width: 100%; background: linear-gradient(90deg, #10b981 0%, #059669 100%); color: white !important; border-radius: 8px; padding: 10px; font-weight: 800; margin-top: 10px; }

    /* Divider & Google Button */
    .divider { display: flex; align-items: center; text-align: center; color: #e2e8f0; font-size: 0.75rem; margin: 15px 0 10px 0; }
    .divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid rgba(255, 255, 255, 0.3); }
    .btn-google > button { width: 100%; background-color: #ffffff !important; color: #1e293b !important; border-radius: 8px; padding: 10px; font-weight: 700; }
    .footer-link { text-align: center; color: #cbd5e1; font-size: 0.7rem; margin-top: 20px; }
</style>
"""

def tampilkan_login():
    st.markdown(css_login, unsafe_allow_html=True)
    controller = CookieController() # Panggil controller cookie

    st.markdown('<div class="logo-wrapper">', unsafe_allow_html=True)
    try:
        st.image("logo_ansa2.png")
    except:
        st.markdown("<h3 style='color:white; margin:0;'>ANSA | TECH</h3>", unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)

    st.markdown('<div class="app-title">Ansa Tech - ERP Enterprise</div>', unsafe_allow_html=True)
    st.markdown('<div class="app-subtitle">Sistem Manajemen Pabrik Terpadu</div>', unsafe_allow_html=True)

    with st.form("login_form"):
        st.markdown('<h3 style="color:white; margin-bottom:0; font-size:1.2rem;">Selamat Datang</h3>', unsafe_allow_html=True)
        st.markdown('<p style="color:#e2e8f0; font-size:0.8rem; margin-bottom:15px;">Silakan masuk untuk melanjutkan</p>', unsafe_allow_html=True)
        
        email_input = st.text_input("EMAIL", placeholder="admin")
        password_input = st.text_input("PASSWORD", type="password", placeholder="admin")
        
        submit_btn = st.form_submit_button(":material/login: Masuk")
        
        if submit_btn:
            if email_input == "admin" and password_input == "admin":
                st.success("✅ Login Berhasil!")
                time.sleep(1)
                # --- PERUBAHAN DI SINI ---
                # Simpan status login ke cookie browser agar permanen
                controller.set("status_login", "aktif")
                st.rerun()
            else:
                st.error("🚨 Detail login salah!")

    st.markdown('<div class="divider">atau</div>', unsafe_allow_html=True)
    st.markdown('<div class="btn-google">', unsafe_allow_html=True)
    st.button(":material/language: Masuk dengan Google", use_container_width=True)
    st.markdown('</div>', unsafe_allow_html=True)
    
    st.markdown('<div class="footer-link">Hubungi administrator jika ada kendala akun</div>', unsafe_allow_html=True)

if __name__ == "__main__":
    tampilkan_login()