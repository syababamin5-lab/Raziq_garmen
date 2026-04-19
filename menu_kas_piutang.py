import streamlit as st
import datetime
import time
from database import SessionLocal
from models import JurnalUmum, Mitra, KategoriMitra, Karyawan
from utils import format_rp

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
def jalankan():
    st.markdown(desain_tab, unsafe_allow_html=True)
    st.title(":material/payments: Manajemen Kas, Piutang & Utang")
    st.write("Pusat kontrol arus kas masuk, pelunasan pelanggan, pembayaran supplier, cicilan kasbon, dan mutasi uang.")
    db = SessionLocal()

    t1, t2, t3, t4 = st.tabs([":material/download: Terima Piutang", ":material/upload: Bayar Utang", ":material/sync_alt: Mutasi Kas & Bank", ":material/engineering: Bayar Kasbon"])

    # ==========================================
    # TAB 1: TERIMA PEMBAYARAN PIUTANG (CUSTOMER)
    # ==========================================
    with t1:
        st.subheader("Penerimaan Pembayaran dari Pelanggan")
        st.write("Catat uang masuk dari pelunasan nota/bon pelanggan.")
        
        customers = db.query(Mitra).filter(Mitra.kategori == KategoriMitra.CUSTOMER, Mitra.saldo_piutang > 0).all()
        
        if not customers:
            st.success("🎉 Luar biasa! Saat ini tidak ada Customer yang menunggak utang.")
        else:
            with st.form("form_terima_piutang", clear_on_submit=True):
                tgl_piutang = st.date_input("📅 Tanggal Diterima", datetime.date.today())
                
                cust = st.selectbox("Pilih Pelanggan", customers, format_func=lambda x: f"{x.nama_mitra} (Sisa Utang: {format_rp(x.saldo_piutang)})")
                nominal_masuk = st.number_input("Nominal Pembayaran Diterima (Rp)", min_value=1000.0, max_value=float(cust.saldo_piutang), step=50000.0)
                masuk_ke = st.radio("Uang Masuk ke Mana?", ["Kas Tunai", "Transfer Bank"], horizontal=True)
                ket_piutang = st.text_input("Keterangan (Contoh: Pelunasan Invoice INV-001)")
                
                if st.form_submit_button(":material/save: Simpan Penerimaan"):
                    if nominal_masuk > 0:
                        try:
                            waktu_piutang = datetime.datetime.combine(tgl_piutang, datetime.datetime.now().time())
                            
                            akun_masuk = "11110" if masuk_ke == "Kas Tunai" else "11120"
                            nama_masuk = "Kas Tunai" if masuk_ke == "Kas Tunai" else "Bank"
                            
                            cust_db = db.query(Mitra).filter(Mitra.id == cust.id).first()
                            cust_db.saldo_piutang -= nominal_masuk
                            
                            db.add(JurnalUmum(tanggal=waktu_piutang, kode_akun=akun_masuk, nama_akun=nama_masuk, keterangan=f"Terima Piutang: {cust.nama_mitra} - {ket_piutang}", debit=nominal_masuk, kredit=0))
                            db.add(JurnalUmum(tanggal=waktu_piutang, kode_akun="11210", nama_akun="Piutang Usaha", keterangan=f"Pelunasan: {cust.nama_mitra} - {ket_piutang}", debit=0, kredit=nominal_masuk))
                            
                            db.commit()
                            st.success(f"Berhasil! Pembayaran tanggal {tgl_piutang.strftime('%d-%m-%Y')} tersimpan.")
                            time.sleep(1.5)
                            st.rerun()
                        except Exception as e:
                            db.rollback()
                            st.error(f"🚨 Gagal menyimpan. Error: {str(e)}")

    # ==========================================
    # TAB 2: BAYAR UTANG SUPPLIER
    # ==========================================
    with t2:
        st.subheader("Pembayaran Tagihan ke Supplier Kain/Bahan")
        st.write("Catat uang keluar untuk melunasi utang ke toko bahan/supplier.")
        
        suppliers = db.query(Mitra).filter(Mitra.kategori == KategoriMitra.SUPPLIER, Mitra.saldo_utang > 0).all()
        
        if not suppliers:
            st.success("🎉 Mantap! Pabrik saat ini tidak punya utang ke Supplier manapun.")
        else:
            with st.form("form_bayar_utang", clear_on_submit=True):
                tgl_utang = st.date_input("📅 Tanggal Dibayar", datetime.date.today())
                
                supp = st.selectbox("Pilih Supplier", suppliers, format_func=lambda x: f"{x.nama_mitra} (Sisa Utang Kita: {format_rp(x.saldo_utang)})")
                nominal_keluar = st.number_input("Nominal Dibayarkan (Rp)", min_value=1000.0, max_value=float(supp.saldo_utang), step=50000.0)
                keluar_dari = st.radio("Sumber Dana Keluar", ["Kas Tunai", "Transfer Bank"], horizontal=True)
                ket_utang = st.text_input("Keterangan (Contoh: Cicilan PO-001 Kain Hitam)")
                
                if st.form_submit_button(":material/save: Simpan Pembayaran"):
                    if nominal_keluar > 0:
                        try:
                            waktu_utang = datetime.datetime.combine(tgl_utang, datetime.datetime.now().time())
                            
                            akun_keluar = "11110" if keluar_dari == "Kas Tunai" else "11120"
                            nama_keluar = "Kas Tunai" if keluar_dari == "Kas Tunai" else "Bank"
                            
                            supp_db = db.query(Mitra).filter(Mitra.id == supp.id).first()
                            supp_db.saldo_utang -= nominal_keluar
                            
                            db.add(JurnalUmum(tanggal=waktu_utang, kode_akun="21110", nama_akun="Utang Usaha", keterangan=f"Bayar Utang: {supp.nama_mitra} - {ket_utang}", debit=nominal_keluar, kredit=0))
                            db.add(JurnalUmum(tanggal=waktu_utang, kode_akun=akun_keluar, nama_akun=nama_keluar, keterangan=f"Bayar Supplier: {supp.nama_mitra} - {ket_utang}", debit=0, kredit=nominal_keluar))
                            
                            db.commit()
                            st.success(f"Berhasil! Pembayaran tanggal {tgl_utang.strftime('%d-%m-%Y')} tersimpan.")
                            time.sleep(1.5)
                            st.rerun()
                        except Exception as e:
                            db.rollback()
                            st.error(f"🚨 Gagal menyimpan. Error: {str(e)}")

    # ==========================================
    # TAB 3: MUTASI KAS & BANK
    # ==========================================
    with t3:
        st.subheader("🔄 Mutasi Saldo Kas & Bank")
        st.info("Gunakan menu ini untuk mencatat perpindahan uang antar akun Anda sendiri (Tidak ada hubungannya dengan untung/rugi).")
        
        with st.form("form_mutasi", clear_on_submit=True):
            tgl_mutasi = st.date_input("📅 Tanggal Mutasi", datetime.date.today())
            
            c1, c2 = st.columns(2)
            arah_mutasi = c1.selectbox("Jenis Perpindahan Uang", [
                "1. Setor Tunai (Laci Kasir ➡️ Rekening Bank)",
                "2. Tarik Tunai (Rekening Bank ➡️ Laci Kasir)"
            ])
            nom_mutasi = c2.number_input("Nominal Uang Dipindah (Rp)", min_value=0, step=100000)
            ket_mutasi = st.text_input("Keterangan (Contoh: Setoran hasil jualan ke Bank BCA)")
            
            if st.form_submit_button(":material/sync_alt: Eksekusi Mutasi"):
                if nom_mutasi > 0:
                    try:
                        waktu_mutasi = datetime.datetime.combine(tgl_mutasi, datetime.datetime.now().time())
                        
                        if "Setor Tunai" in arah_mutasi:
                            db.add(JurnalUmum(tanggal=waktu_mutasi, kode_akun="11120", nama_akun="Bank", keterangan=f"Mutasi Setor: {ket_mutasi}", debit=nom_mutasi, kredit=0))
                            db.add(JurnalUmum(tanggal=waktu_mutasi, kode_akun="11110", nama_akun="Kas Tunai", keterangan=f"Mutasi Setor: {ket_mutasi}", debit=0, kredit=nom_mutasi))
                        else:
                            db.add(JurnalUmum(tanggal=waktu_mutasi, kode_akun="11110", nama_akun="Kas Tunai", keterangan=f"Mutasi Tarik: {ket_mutasi}", debit=nom_mutasi, kredit=0))
                            db.add(JurnalUmum(tanggal=waktu_mutasi, kode_akun="11120", nama_akun="Bank", keterangan=f"Mutasi Tarik: {ket_mutasi}", debit=0, kredit=nom_mutasi))
                            
                        db.commit()
                        st.success(f"Mutasi senilai {format_rp(nom_mutasi)} untuk tanggal {tgl_mutasi.strftime('%d-%m-%Y')} berhasil!")
                        time.sleep(1.5)
                        st.rerun()
                    except Exception as e:
                        db.rollback()
                        st.error(f"🚨 Mutasi Gagal. Error: {str(e)}")
                else:
                    st.error("Nominal mutasi tidak boleh kosong.")

    # ==========================================
    # TAB 4: TERIMA CICILAN KASBON
    # ==========================================
    with t4:
        st.subheader("👨‍🔧 Pembayaran / Cicilan Kasbon Karyawan")
        st.write("Catat jika ada karyawan yang membayar kasbon atau gajinya dipotong untuk bayar utang.")
        
        karyawans = db.query(Karyawan).filter(Karyawan.saldo_kasbon > 0).all()
        
        if not karyawans:
            st.success("🎉 Tidak ada karyawan yang punya kasbon saat ini.")
        else:
            with st.form("form_terima_kasbon", clear_on_submit=True):
                tgl_kasbon = st.date_input("📅 Tanggal Cicilan / Potongan", datetime.date.today())
                
                kar = st.selectbox("Pilih Karyawan", karyawans, format_func=lambda x: f"{x.nama_karyawan} (Sisa Kasbon: {format_rp(x.saldo_kasbon)})")
                nominal_kasbon = st.number_input("Nominal Dibayar/Dipotong (Rp)", min_value=1000.0, max_value=float(kar.saldo_kasbon), step=50000.0)
                masuk_ke_k = st.radio("Uang/Potongan Masuk ke Mana?", ["Kas Tunai", "Transfer Bank"], horizontal=True)
                ket_kasbon = st.text_input("Keterangan (Contoh: Potong gaji minggu ke-3)")
                
                if st.form_submit_button(":material/save: Simpan Cicilan Kasbon"):
                    if nominal_kasbon > 0:
                        try:
                            waktu_kasbon = datetime.datetime.combine(tgl_kasbon, datetime.datetime.now().time())
                            
                            akun_masuk_k = "11110" if masuk_ke_k == "Kas Tunai" else "11120"
                            nama_masuk_k = "Kas Tunai" if masuk_ke_k == "Kas Tunai" else "Bank"
                            
                            kar_db = db.query(Karyawan).filter(Karyawan.id == kar.id).first()
                            kar_db.saldo_kasbon -= nominal_kasbon
                            
                            db.add(JurnalUmum(tanggal=waktu_kasbon, kode_akun=akun_masuk_k, nama_akun=nama_masuk_k, keterangan=f"Bayar Kasbon: {kar.nama_karyawan} - {ket_kasbon}", debit=nominal_kasbon, kredit=0))
                            db.add(JurnalUmum(tanggal=waktu_kasbon, kode_akun="11220", nama_akun="Piutang Karyawan", keterangan=f"Pelunasan Kasbon: {kar.nama_karyawan} - {ket_kasbon}", debit=0, kredit=nominal_kasbon))
                            
                            db.commit()
                            st.success(f"Berhasil! Cicilan tercatat untuk tanggal {tgl_kasbon.strftime('%d-%m-%Y')}.")
                            time.sleep(1.5)
                            st.rerun()
                        except Exception as e:
                            db.rollback()
                            st.error(f"🚨 Gagal menyimpan cicilan. Error: {str(e)}")

    db.close()