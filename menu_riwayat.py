import streamlit as st
import pandas as pd
import time
from database import SessionLocal
from models import JurnalUmum
from utils import format_rp
from sqlalchemy import desc

def jalankan():
    st.title(":material/history: Riwayat & Void Transaksi")
    st.markdown("<p style='color: #6B7280; margin-top: -15px; margin-bottom: 25px;'>Pantau aktivitas jurnal dan batalkan transaksi (Opex/Biaya/Mutasi) secara aman.</p>", unsafe_allow_html=True)
    
    db = SessionLocal()
    
    jurnals = db.query(JurnalUmum).order_by(desc(JurnalUmum.id)).limit(100).all()
    
    if jurnals:
        # Gunakan st.dataframe dengan hide_index agar lebih rapi
        df = pd.DataFrame([{
            "ID Jurnal": j.id, 
            "Tanggal": j.tanggal.strftime("%d-%m-%Y %H:%M") if hasattr(j.tanggal, 'strftime') else str(j.tanggal), 
            "Nama Akun": f"[{j.kode_akun}] {j.nama_akun}", 
            "Keterangan": j.keterangan, 
            "Debit": format_rp(j.debit or 0), 
            "Kredit": format_rp(j.kredit or 0)
        } for j in jurnals])
        
        st.dataframe(df, use_container_width=True, hide_index=True)
    else:
        st.info("Belum ada transaksi yang tercatat di sistem.", icon=":material/info:")
    
    st.markdown("---")
    

    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.subheader(":material/delete_forever: Void (Batal) Transaksi")
        st.warning("**Sistem Smart Delete Aktif:** Anda cukup memasukkan 1 ID saja. Sistem akan otomatis mencari pasangan Debit/Kredit-nya dan menghapusnya secara bersamaan agar Neraca tetap seimbang.", icon=":material/security:")
        

        with st.form("form_hapus", clear_on_submit=True):
            id_hapus = st.number_input("Masukkan salah satu ID Jurnal yang Ingin Dibatalkan:", min_value=1, step=1)
            
            if st.form_submit_button(":material/delete: Eksekusi Batal Transaksi"):
                try:
                    target = db.query(JurnalUmum).filter(JurnalUmum.id == id_hapus).first()
                    
                    if not target:
                        st.error("❌ Jurnal dengan ID tersebut tidak ditemukan.", icon=":material/error:")
                    else:
                        ket_target = str(target.keterangan or "")
                        
                        if "INV-" in ket_target or "PO-" in ket_target or "Retur" in ket_target:
                            st.error("🚨 DITOLAK! Transaksi Penjualan (INV) atau Pembelian (PO) tidak boleh dihapus dari sini karena akan membuat Stok Gudang dan Piutang error. Gunakan menu 'Retur' atau 'Penyesuaian Persediaan'!")
                        else:

                            pasangan_jurnal = db.query(JurnalUmum).filter(
                                JurnalUmum.keterangan == target.keterangan,
                                JurnalUmum.tanggal == target.tanggal
                            ).all()
                            
                            jumlah_baris = len(pasangan_jurnal)
                            

                            for p in pasangan_jurnal:
                                db.delete(p)
                                
                            db.commit() # Simpan permanen
                            
                            st.success(f"✅ Void Berhasil! {jumlah_baris} baris jurnal untuk transaksi '{ket_target}' telah dihapus bersamaan. Neraca Anda aman 100%.", icon=":material/check_circle:")
                            

                            time.sleep(2.5)
                            st.rerun()
                            
                except Exception as e:
                    db.rollback() # Batal jika error
                    st.error(f"🚨 Sistem gagal melakukan Void. Error: {str(e)}")
    
    with col2:
        st.subheader(":material/help_center: Panduan Penggunaan")
        st.markdown("""
        **Fungsi Utama Menu Ini:**
        Menu ini dirancang KHUSUS untuk membatalkan kesalahan ketik/input pada transaksi seperti:
        * 💸 Biaya Operasional (Opex / Listrik / Gaji)
        * 🔄 Mutasi Kas & Bank
        * 👨‍🔧 Pembayaran / Cicilan Kasbon Karyawan
        * 🏭 Tagihan Produksi (Cutting / Jahit)

        **Cara Membatalkan Transaksi:**
        1. Cari transaksi yang salah pada tabel di atas.
        2. Masukkan **salah satu ID** (Debit atau Kredit bebas).
        3. Klik Eksekusi Batal. Sistem akan menghapus semua baris yang berkaitan secara otomatis.
        4. Silakan input ulang transaksi yang benar di menu yang sesuai.
        """)

    db.close()