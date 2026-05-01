import streamlit as st
import time
from database import SessionLocal
from models import Karyawan, JurnalUmum
from utils import format_rp

def jalankan():
    st.title(":material/checkbook: Kasbon & Pinjaman Karyawan")
    db = SessionLocal()
    
    # Ambil daftar karyawan untuk dropdown
    karyawans = db.query(Karyawan).all()
    
    if not karyawans:
        st.warning("Belum ada data Karyawan. Silakan isi di Menu Master Data terlebih dahulu.")
        db.close()
        return
        
    # Tambahkan clear_on_submit agar form otomatis bersih setelah sukses
    with st.form("form_kasbon", clear_on_submit=True):
        sel_k = st.selectbox(
            "Pilih Karyawan", 
            karyawans, 
            format_func=lambda x: f"{x.nama_karyawan} (Saldo Kasbon: {format_rp(x.saldo_kasbon)})"
        )
        
        nom_kasbon = st.number_input("Nominal Kasbon (Rp)", min_value=0, step=50000)
        
        # Pilihan sumber dana dinamis
        sumber_dana = st.radio("Sumber Dana:", ["Kas Tunai", "Transfer Bank"], horizontal=True)
        
        if st.form_submit_button("Berikan Kasbon"):
            if nom_kasbon <= 0:
                st.error("Nominal kasbon harus lebih dari 0!")
            else:
                # ==========================================================
                # TAHAP 3: ATOMIC TRANSACTION (SABUK PENGAMAN)
                # ==========================================================
                try:
                    # 1. Panggil ulang data karyawan agar menempel ke Session Database saat ini
                    karyawan_update = db.query(Karyawan).filter(Karyawan.id == sel_k.id).first()
                    
                    # 2. Tambah saldo kasbon ke profil karyawan (SINKRONISASI DATA)
                    karyawan_update.saldo_kasbon += nom_kasbon
                    
                    
                    if sumber_dana == "Kas Tunai":
                        akun_kredit = "11110"
                        nama_kredit = "Kas Tunai"
                    else:
                        akun_kredit = "11120"
                        nama_kredit = "Bank"
                        
                    # 4. Catat ke Jurnal Akuntansi (Double-Entry)
                    # Debit:  Karyawan bertambah (Kode: 11220 sesuai CoA baru)
                    db.add(JurnalUmum(
                        kode_akun="11220", 
                        nama_akun=" Karyawan", 
                        keterangan=f"Kasbon {karyawan_update.nama_karyawan}", 
                        debit=nom_kasbon, 
                        kredit=0
                    ))
                    
                   
                    db.add(JurnalUmum(
                        kode_akun=akun_kredit, 
                        nama_akun=nama_kredit, 
                        keterangan=f"Kasbon {karyawan_update.nama_karyawan}", 
                        debit=0, 
                        kredit=nom_kasbon
                    ))
                    
                   
                    db.commit()
                    
                    st.success(f"✅ Berhasil! Kasbon {karyawan_update.nama_karyawan} sebesar {format_rp(nom_kasbon)} dicatat dari {nama_kredit}.")
                    time.sleep(1.5)
                    st.rerun() # Refresh UI agar saldo di dropdown langsung terupdate
                    
                except Exception as e:
                    
                    db.rollback()
                    st.error(f"🚨 Transaksi Gagal & Dibatalkan! Sistem Aman. Detail: {str(e)}")
                    
    db.close()