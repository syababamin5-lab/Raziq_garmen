import streamlit as st
import pandas as pd
import datetime
import time 
from database import SessionLocal
from models import Barang, Karyawan, KategoriBarang, Mitra, KategoriMitra, HeaderPenjualan, DetailPenjualan, JurnalUmum
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
    st.title(":material/local_shipping: Modul Penjualan & Retur")
    db = SessionLocal()
    
    t1, t2 = st.tabs([":material/shopping_cart_checkout: Input Penjualan (Invoice)", ":material/keyboard_return: Retur Penjualan"])

    # ========================================================
    # TAB 1: INPUT PENJUALAN (KERANJANG BELANJA)
    # ========================================================
    with t1:
        customers = db.query(Mitra).filter(Mitra.kategori == KategoriMitra.CUSTOMER).all()
        barangs = db.query(Barang).filter(Barang.kategori == KategoriBarang.BARANG_JADI, Barang.stok_saat_ini > 0).all()

        if 'keranjang_jual' not in st.session_state:
            st.session_state.keranjang_jual = []

        col_kiri, col_kanan = st.columns([1, 2])
        with col_kiri:
            st.subheader("1. Pilih Barang")
            if barangs:
                item = st.selectbox("Model Baju", barangs, format_func=lambda x: f"{x.nama_barang} ({x.kode_sku}) - Stok: {(x.stok_saat_ini/12):.1f} Lusin")
                
                with st.form("form_tambah_jual", clear_on_submit=True):
                    qty = st.number_input("Jumlah (Lusin)", min_value=0.1, step=1.0, value=1.0)
                    harga_deal = st.number_input("Harga per Lusin (Rp)", min_value=0, value=int(item.harga_jual))
                    
                    if st.form_submit_button(":material/add_circle: Tambah"):
                        if (qty * 12) > item.stok_saat_ini: 
                            st.error(f"Stok tidak cukup! Sisa stok hanya {(item.stok_saat_ini/12):.1f} Lusin")
                        else:
                            st.session_state.keranjang_jual.append({"id": item.id, "sku": item.kode_sku, "nama": item.nama_barang, "qty": qty, "harga": harga_deal, "subtotal": qty * harga_deal})
                            st.rerun()

        with col_kanan:
            st.subheader("2. Ringkasan Nota")
            if st.session_state.keranjang_jual:
                df_jual = pd.DataFrame(st.session_state.keranjang_jual)
                df_jual['qty'] = df_jual['qty'].apply(lambda x: f"{x:g}")
                df_jual['subtotal_rp'] = df_jual['subtotal'].apply(format_rp)
                st.table(df_jual[['sku', 'nama', 'qty', 'subtotal_rp']])
                
                if st.button(":material/delete: Kosongkan"):
                    st.session_state.keranjang_jual = []
                    st.rerun()
                
                with st.form("checkout_jual", clear_on_submit=True):
                    # --- MESIN WAKTU: TANGGAL PENJUALAN ---
                    tgl_jual = st.date_input("📅 Tanggal Transaksi / Invoice", datetime.date.today())
                    
                    cust = st.selectbox("Customer", customers, format_func=lambda c: c.nama_mitra) if customers else None
                    metode = st.selectbox("Metode", ["Piutang (Tempo)", "Tunai", "Transfer"])
                    
                    dp = 0.0
                    if metode == "Piutang (Tempo)":
                        dp = st.number_input("DP / Bayar di Awal (Opsional)", min_value=0.0, step=50000.0)
                        
                    diskon = st.number_input("Diskon Nota", min_value=0.0)
                    total_sebelum_diskon = sum(i['subtotal'] for i in st.session_state.keranjang_jual)
                    total_tagihan = total_sebelum_diskon - diskon
                    sisa_utang = total_tagihan - dp
                    
                    if st.form_submit_button(":material/send: Terbitkan Invoice"):
                        if not cust:
                            st.error("Silakan tambahkan Customer di Master Data terlebih dahulu.")
                        elif sisa_utang < 0:
                            st.error("DP tidak boleh lebih besar dari Total Tagihan!")
                        else:
                            try:

                                waktu_jual = datetime.datetime.combine(tgl_jual, datetime.datetime.now().time())
                                no_inv = f"INV-{waktu_jual.strftime('%y%m%d%H%M')}"
                                
                                db.add(HeaderPenjualan(no_invoice=no_inv, tanggal=waktu_jual, nama_customer=cust.nama_mitra, metode_bayar=metode, total_tagihan=total_tagihan, diskon=diskon))
                                
                                total_pcs_invoice = 0
                                
                                for i in st.session_state.keranjang_jual:
                                    db.add(DetailPenjualan(no_invoice=no_inv, kode_sku=i['sku'], nama_barang=i['nama'], qty_lusin=i['qty'], harga_per_lusin=i['harga'], subtotal=i['subtotal']))
                                    
                                    target = db.query(Barang).filter(Barang.id == i['id']).first()
                                    qty_pcs = int(i['qty'] * 12)
                                    total_pcs_invoice += qty_pcs
                                    target.stok_saat_ini -= qty_pcs
                                    
                                    nilai_hpp = float(i['qty']) * (target.harga_modal or 0)
                                    
                                    db.add(JurnalUmum(tanggal=waktu_jual, kode_akun="51120", nama_akun="Harga Pokok Penjualan", keterangan=f"HPP {qty_pcs} pcs {target.kode_sku}", debit=nilai_hpp, kredit=0))
                                    db.add(JurnalUmum(tanggal=waktu_jual, kode_akun="12150", nama_akun="Persediaan Barang Jadi", keterangan=f"Keluar {qty_pcs} pcs {target.kode_sku} (Jual)", debit=0, kredit=nilai_hpp))
                                
                                db.add(JurnalUmum(tanggal=waktu_jual, kode_akun="41110", nama_akun="Pendapatan Penjualan", keterangan=f"Penjualan {no_inv} ({total_pcs_invoice} pcs)", debit=0, kredit=total_tagihan))
                                
                                if metode in ["Tunai", "Transfer"]:
                                    akun_debit = "11110" if metode == "Tunai" else "11120"
                                    nama_debit = "Kas Tunai" if metode == "Tunai" else "Kas di Bank"
                                    db.add(JurnalUmum(tanggal=waktu_jual, kode_akun=akun_debit, nama_akun=nama_debit, keterangan=f"Pelunasan {no_inv}", debit=total_tagihan, kredit=0))
                                
                                elif metode == "Piutang (Tempo)":
                                    cust_db = db.query(Mitra).filter(Mitra.id == cust.id).first()
                                    cust_db.saldo_piutang += sisa_utang
                                    db.add(JurnalUmum(tanggal=waktu_jual, kode_akun="11210", nama_akun="Piutang Usaha", keterangan=f"Tagihan {no_inv} - {cust.nama_mitra}", debit=sisa_utang, kredit=0))
                                    if dp > 0:
                                        db.add(JurnalUmum(tanggal=waktu_jual, kode_akun="11110", nama_akun="Kas Tunai", keterangan=f"DP Invoice {no_inv} - {cust.nama_mitra}", debit=dp, kredit=0))
                                
                                db.commit() 
                                st.session_state.keranjang_jual = []
                                st.success(f"Invoice {no_inv} untuk tanggal {tgl_jual.strftime('%d-%m-%Y')} berhasil diterbitkan!")
                                time.sleep(1.5)
                                st.rerun()
                            except Exception as e:
                                db.rollback()
                                st.error(f"🚨 Gagal menerbitkan invoice. Error: {str(e)}")

    # ========================================================
    # TAB 2: RETUR PENJUALAN
    # ========================================================
    with t2:
        st.subheader(":material/assignment_return: Input Retur Barang dari Customer")
        invoices = db.query(HeaderPenjualan).filter(HeaderPenjualan.tipe_transaksi == "NORMAL").order_by(HeaderPenjualan.id.desc()).limit(20).all()
        
        if not invoices:
            st.info("Belum ada data penjualan yang bisa diretur.", icon=":material/info:")
        else:
            pilih_inv = st.selectbox("Pilih Nomor Invoice yang Diretur", invoices, format_func=lambda x: f"{x.no_invoice} - {x.nama_customer} ({format_rp(x.total_tagihan)})")
            details = db.query(DetailPenjualan).filter(DetailPenjualan.no_invoice == pilih_inv.no_invoice).all()
            
            with st.form("form_retur_jual", clear_on_submit=True):

                tgl_retur = st.date_input("📅 Tanggal Retur Diterima", datetime.date.today())
                
                barang_retur = st.selectbox("Pilih Barang yang Dikembalikan", details, format_func=lambda x: f"{x.nama_barang} ({x.qty_lusin} LS)")
                qty_retur = st.number_input("Jumlah yang Diretur (Lusin)", min_value=0.1, max_value=float(barang_retur.qty_lusin), step=1.0)
                alasan = st.text_input("Alasan Retur", value="Barang Cacat / Salah Model")
                
                if st.form_submit_button(":material/save: Confirm Retur Penjualan"):
                    try:
                        waktu_retur = datetime.datetime.combine(tgl_retur, datetime.datetime.now().time())
                        
                        qty_retur_pcs = int(qty_retur * 12)
                        target_b = db.query(Barang).filter(Barang.kode_sku == barang_retur.kode_sku).first()
                        target_b.stok_saat_ini += qty_retur_pcs
                        
                        nilai_retur = qty_retur * barang_retur.harga_per_lusin
                        nilai_hpp_retur = qty_retur * (target_b.harga_modal or 0)
                        
                        db.add(JurnalUmum(tanggal=waktu_retur, kode_akun="41120", nama_akun="Retur Penjualan", keterangan=f"Retur {pilih_inv.no_invoice} - {qty_retur_pcs} pcs", debit=nilai_retur, kredit=0))
                        
                        if pilih_inv.metode_bayar == "Piutang (Tempo)":
                            akun_kredit = "11210"; nama_kredit = "Piutang Usaha"
                            cust_db = db.query(Mitra).filter(Mitra.nama_mitra == pilih_inv.nama_customer).first()
                            if cust_db: cust_db.saldo_piutang -= nilai_retur
                        elif pilih_inv.metode_bayar == "Transfer":
                            akun_kredit = "11120"; nama_kredit = "Kas di Bank"
                        else:
                            akun_kredit = "11110"; nama_kredit = "Kas Tunai"
                            
                        db.add(JurnalUmum(tanggal=waktu_retur, kode_akun=akun_kredit, nama_akun=nama_kredit, keterangan=f"Retur {pilih_inv.no_invoice}", debit=0, kredit=nilai_retur))
                        
                        db.add(JurnalUmum(tanggal=waktu_retur, kode_akun="12150", nama_akun="Persediaan Barang Jadi", keterangan=f"Retur Masuk {qty_retur_pcs} pcs", debit=nilai_hpp_retur, kredit=0))
                        db.add(JurnalUmum(tanggal=waktu_retur, kode_akun="51120", nama_akun="Harga Pokok Penjualan", keterangan=f"Batal HPP {pilih_inv.no_invoice}", debit=0, kredit=nilai_hpp_retur))
                        
                        db.commit()
                        st.success(f"Berhasil! Retur tercatat untuk tanggal {tgl_retur.strftime('%d-%m-%Y')}. Barang kembali ke gudang.")
                        time.sleep(1.5)
                        st.rerun()
                    except Exception as e:
                        db.rollback()
                        st.error(f"🚨 Gagal memproses retur. Error: {str(e)}")

    db.close()