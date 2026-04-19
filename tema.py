import streamlit as st

def terapkan_tema_emerald():
    """
    Fungsi ini menyuntikkan CSS khusus untuk merubah tampilan Streamlit 
    menjadi gaya 'Atelier Emerald' tanpa merubah logika Python di belakangnya.
    """
    emerald_css = """
    <style>
        /* Mengubah font utama menjadi gaya elegan */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
        html, body, [class*="css"]  {
            font-family: 'Inter', sans-serif;
        }

        /* Warna Background Utama (Sangat terang, bersih) */
        .stApp {
            background-color: #F8FAFC; 
        }

        /* Desain Sidebar (Navigasi Kiri) warna Emerald Gelap */
        [data-testid="stSidebar"] {
            background-color: #064E3B !important; /* Emerald 900 */
        }
        
        /* Teks di dalam Sidebar menjadi putih */
        [data-testid="stSidebar"] * {
            color: #FFFFFF !important;
        }

        /* Desain Tombol Standar */
        .stButton > button {
            background-color: #10B981; /* Emerald 500 */
            color: white;
            border-radius: 8px;
            border: none;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        
        /* Animasi saat tombol disorot mouse */
        .stButton > button:hover {
            background-color: #047857; /* Emerald 700 */
            transform: translateY(-2px);
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            color: white;
        }

        /* Desain Input Box (Kotak isian) */
        .stTextInput > div > div > input, .stNumberInput > div > div > input {
            border-radius: 6px;
            border: 1px solid #CBD5E1;
        }

        /* Menyembunyikan menu bawaan Streamlit di pojok kanan atas (Opsional untuk kerapian) */
        #MainMenu {visibility: hidden;}
        header {visibility: hidden;}
    </style>
    """
    st.markdown(emerald_css, unsafe_allow_html=True)