import streamlit as st
from database import SessionLocal
from models import Barang, KategoriBarang, JurnalUmum
from utils import format_rp

def jalankan():
    st.title(":material/archive: Input Persediaan / Stock Awal")
    st.info("Gunakan form ini HANYA SEKALI untuk memasukkan stok gudang yang sudah ada sebelum sistem ini berjalan.")
    
    db = SessionLocal()
    barangs = db.query(Barang).filter(Barang.kategori == KategoriBarang.BARANG_JADI).all()
    
    with st.form("form_saldo_awal"):
        pilih_sku = st.selectbox("Pilih Barang", barangs, format_func=lambda x: f"{x.kode_sku} - {x.nama_barang}")
        
        c1, c2 = st.columns(2)
        stok_awal = c1.number_input("Jumlah Stok Awal (Pcs)", min_value=1)
        
        hpp_per_pcs = c2.number_input("Estimasi Harga Modal per Pcs (Rp)", min_value=0)
        
        total_nilai_modal = stok_awal * hpp_per_pcs
        st.write(f"**Total Nilai Aset Masuk:** {format_rp(total_nilai_modal)}")
        
        if st.form_submit_button("Simpan Saldo Awal"):

            pilih_sku.stok_saat_ini += stok_awal
            
            db.add(JurnalUmum(kode_akun="11440", nama_akun="Persediaan Barang Jadi", keterangan=f"Saldo Awal: {stok_awal} pcs {pilih_sku.kode_sku}", debit=total_nilai_modal, kredit=0))
            db.add(JurnalUmum(kode_akun="31110", nama_akun="Modal Awal", keterangan=f"Saldo Awal: {stok_awal} pcs {pilih_sku.kode_sku}", debit=0, kredit=total_nilai_modal))
            
            db.commit()
            st.success(f"Berhasil! Stok {pilih_sku.kode_sku} bertambah {stok_awal} pcs dan dicatat sebagai Modal Awal.")
   
    db.close()