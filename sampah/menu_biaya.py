import streamlit as st
from database import SessionLocal
from models import JurnalUmum
from utils import format_rp

def jalankan():
    st.title("🛍️ Input Pembelian & Biaya (Opex)")
    st.info("Catat pembelian kain, ongkir, tip kuli/supir, hingga biaya operasional di sini.")
    db = SessionLocal()

    with st.form("form_biaya"):
        st.subheader("Detail Transaksi")
        kategori_b = st.selectbox("Jenis Pengeluaran", [
            "1. Bahan Baku & Produksi (Kain, Benang, Aksesoris)",
            "2. Biaya Transportasi & Ongkir Khusus (Jika terpisah dari kain)",
            "3. Biaya Dapur & Makan (Beras, Minyak, Kopi, Galon)",
            "4. Biaya Kantor & ATK (Tinta, Kertas, Komputer)",
            "5. Biaya Utilitas Pabrik (Wifi, Listrik, Air/WC, Telepon)",
            "6. Biaya Sosial (Kegiatan Sosial, Guru Ngaji, Keamanan)"
        ])
        
        ket = st.text_input("Keterangan Rinci (Contoh: Beli Kain Nirwana 10 Roll)")
        metode = st.radio("Metode Pembayaran", ["Cash / Transfer", "Kredit (Utang/Ngebon)"], horizontal=True)
        
        st.markdown("---")
        st.markdown("**Rincian Nominal (Isi yang ada saja, sisanya biarkan 0)**")
        c1, c2 = st.columns(2)
        harga_utama = c1.number_input("Harga Barang / Kain Utama (Rp)", min_value=0)
        ongkir = c2.number_input("Ongkos Kirim (Rp)", min_value=0)
        
        c3, c4 = st.columns(2)
        pajak = c3.number_input("Pajak Jika Ada (Rp)", min_value=0)
        tip = c4.number_input("Tip Supir / Kuli Bongkar (Rp)", min_value=0)
        
        # Akuntansi: Total transaksi adalah gabungan semuanya
        total_transaksi = harga_utama + ongkir + pajak + tip
        
        st.info(f"Total Nilai Transaksi: {format_rp(total_transaksi)}")
        
        if st.form_submit_button("Simpan Transaksi"):
            try:
                # 1. Penentuan Akun Debit (Apakah ini Aset Kain atau Biaya Habis Pakai?)
                if "Bahan Baku" in kategori_b:
                    akun_debit = "11410" # Persediaan Bahan Baku (Aset)
                else:
                    akun_debit = "60000" # Beban Operasional (Biaya)
                
                # 2. Penentuan Akun Kredit (Bayar pakai apa?)
                if metode == "Cash / Transfer":
                    akun_kredit = "11120" # Kas berkurang
                    nama_akun_kredit = "Kas/Bank"
                else:
                    akun_kredit = "21110" # Utang bertambah
                    nama_akun_kredit = "Utang Dagang / Supplier"
            
                # 3. Eksekusi Jurnal Otomatis
                nama_jurnal_debit = kategori_b[3:] # Memotong angka "1. " di depan nama kategori
                db.add(JurnalUmum(kode_akun=akun_debit, nama_akun=nama_jurnal_debit, keterangan=ket, debit=total_transaksi, kredit=0))
                db.add(JurnalUmum(kode_akun=akun_kredit, nama_akun=nama_akun_kredit, keterangan=ket, debit=0, kredit=total_transaksi))
            
                db.commit()
                st.success(f"Berhasil! Transaksi sebesar {format_rp(total_transaksi)} telah dicatat sebagai {metode}.")
            except Exception as e:
                db.rollback()
                st.error(f"🚨 Transaksi Gagal & Dibatalkan! Sistem Aman. Detail: {str(e)}")
    db.close()