import streamlit as st
import pandas as pd
import datetime
import time 
from database import SessionLocal
from models import Barang, KategoriBarang, Mitra, KategoriMitra, HeaderPembelian, DetailPembelian, JurnalUmum
from utils import format_rp, get_opsi_akun

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
    st.title(":material/local_mall: Modul Pembelian & Pengeluaran Pabrik")
    db = SessionLocal()
    
    t1, t2, t3, t4 = st.tabs([":material/package: Pembelian Bahan (Gudang)", ":material/account_balance_wallet: Biaya Beban Lain (Opex)", ":material/keyboard_return: Retur Pembelian", ":material/computer: Beli Aset Tetap"])

    # ========================================================
    # TAB 1: PEMBELIAN BAHAN BAKU
    # ========================================================
    with t1:
        st.subheader("Pencatatan Bahan Masuk ke Gudang")
        suppliers = db.query(Mitra).filter(Mitra.kategori == KategoriMitra.SUPPLIER).all()
        bahan_existing = db.query(Barang).filter(Barang.kategori != KategoriBarang.BARANG_JADI).all()

        if 'cart_beli' not in st.session_state: st.session_state.cart_beli = []

        col_kiri, col_kanan = st.columns([1, 2])
        
        with col_kiri:
            st.markdown("### :material/expand_circle_right: Detail Barang")
            mode_input = st.radio("Mode Input", ["Pilih Barang Lama (Rekomendasi)", " :material/add_circle: Input Barang Baru"], horizontal=True)
            
            if mode_input == "Pilih Barang Lama (Rekomendasi)":
                if bahan_existing:
                    item_pilih = st.selectbox("Pilih dari Gudang", bahan_existing, format_func=lambda x: f"[{x.kategori.value}] {x.nama_barang} (Stok: {x.stok_saat_ini:g})")
                    sku_val, nama_val, kat_val, hrg_default = item_pilih.kode_sku, item_pilih.nama_barang, item_pilih.kategori, int(item_pilih.harga_modal)
                else:
                    st.warning("Gudang kosong. Gunakan mode 'Input Barang Baru'.")
                    sku_val, nama_val, kat_val, hrg_default = "", "", KategoriBarang.BAHAN_BAKU, 0
            else:
                sku_val, nama_val, kat_val, hrg_default = "", "", KategoriBarang.BAHAN_BAKU, 0

            with st.form("form_add_cart_beli", clear_on_submit=True):
                if mode_input == " :material/add: Input Barang Baru":
                    sku = st.text_input("SKU / Kode Unik Baru")
                    nama = st.text_input("Nama Bahan Baru")
                    kat = st.selectbox("Kategori Bahan", [k for k in KategoriBarang if k != KategoriBarang.BARANG_JADI], format_func=lambda x: x.value)
                    hrg_default = 0
                else:
                    sku, nama, kat = sku_val, nama_val, kat_val

                qty = st.number_input("Jumlah Beli (Kg/Pcs)", min_value=0.1, step=1.0)
                hrg = st.number_input("Harga Satuan (Rp)", min_value=0, value=hrg_default, step=1000)
                
                if st.form_submit_button(":material/add_circle: Tambah ke Nota"):
                    if not sku or not nama:
                        st.error("SKU dan Nama tidak boleh kosong!")
                    else:
                        st.session_state.cart_beli.append({"sku": sku, "nama": nama, "qty": qty, "harga": hrg, "sub": qty*hrg, "kat": kat})
                        st.rerun()

        with col_kanan:
            st.markdown("###  Ringkasan Nota :material/resume:")
            if st.session_state.cart_beli:
                df_tampil = pd.DataFrame(st.session_state.cart_beli)
                df_tampil['qty'] = df_tampil['qty'].apply(lambda x: f"{x:g}") 
                df_tampil['sub'] = df_tampil['sub'].apply(format_rp)          
                st.table(df_tampil[['sku', 'nama', 'qty', 'sub']])
                
                if st.button(":material/delete: Kosongkan"):
                    st.session_state.cart_beli = []
                    st.rerun()

                with st.form("fix_pembelian_pro", clear_on_submit=True):

                    tgl_po = st.date_input("📅 Tanggal Transaksi / Nota", datetime.date.today())
                    
                    vendor = st.selectbox("Pilih Supplier", suppliers, format_func=lambda x: x.nama_mitra) if suppliers else None
                    metode = st.radio("Metode Pembayaran", ["Kas Tunai", "Transfer Bank", "Utang Dagang"], horizontal=True)
                    
                    total = sum(i['qty'] * i['harga'] for i in st.session_state.cart_beli) 
                    st.write(f"### Total Tagihan: {format_rp(total)}")
                    
                    if st.form_submit_button(":material/save: Simpan & Update Gudang"):
                        if not vendor:
                            st.error("Supplier wajib dipilih!")
                        elif not st.session_state.cart_beli:
                            st.error("🚨 Keranjang belanja masih kosong! Silakan tambah barang dulu.")
                        else:
                            try:
                                
                                waktu_po = datetime.datetime.combine(tgl_po, datetime.datetime.now().time())
                                no_po = f"PO-{waktu_po.strftime('%y%m%d%H%M')}"
                                
                                db.add(HeaderPembelian(no_po=no_po, tanggal=waktu_po, nama_supplier=vendor.nama_mitra, metode_bayar=metode, total_tagihan=total))
                                
                                total_baku = 0
                                total_penolong = 0
                                
                                for i in st.session_state.cart_beli:
                                    brg = db.query(Barang).filter(Barang.kode_sku == i['sku']).first()
                                    if not brg:
                                        brg = Barang(model_code="BAHAN", nama_barang=i['nama'], kode_sku=i['sku'], kategori=i['kat'], satuan="Kg", stok_saat_ini=0, harga_modal=i['harga'])
                                        db.add(brg)
                                        db.flush() 

                                    brg.stok_saat_ini += i['qty']
                                    brg.harga_modal = i['harga'] 
                                    db.add(DetailPembelian(no_po=no_po, kode_sku=i['sku'], nama_barang=i['nama'], qty_kg=i['qty'], harga_per_kg=i['harga'], subtotal=(i['qty'] * i['harga'])))
                                    
                                    if i['kat'] == KategoriBarang.BAHAN_BAKU:
                                        total_baku += (i['qty'] * i['harga'])
                                    else:
                                        total_penolong += (i['qty'] * i['harga'])
                                
                                
                                if total_baku > 0:
                                    db.add(JurnalUmum(tanggal=waktu_po, kode_akun="12110", nama_akun="Persediaan Bahan Baku (Kain)", keterangan=f"Beli {no_po}", debit=total_baku, kredit=0))
                                if total_penolong > 0:
                                    db.add(JurnalUmum(tanggal=waktu_po, kode_akun="12120", nama_akun="Persediaan Bahan Penolong", keterangan=f"Beli {no_po}", debit=total_penolong, kredit=0))
                                
                                if metode == "Kas Tunai": 
                                    db.add(JurnalUmum(tanggal=waktu_po, kode_akun="11110", nama_akun="Kas Tunai", keterangan=f"Beli {no_po}", debit=0, kredit=total))
                                elif metode == "Transfer Bank": 
                                    db.add(JurnalUmum(tanggal=waktu_po, kode_akun="11120", nama_akun="Bank", keterangan=f"Beli {no_po}", debit=0, kredit=total))
                                else: 
                                    db.add(JurnalUmum(tanggal=waktu_po, kode_akun="21110", nama_akun="Utang Usaha", keterangan=f"Beli {no_po}", debit=0, kredit=total))
                                    vendor_db = db.query(Mitra).filter(Mitra.id == vendor.id).first()
                                    if vendor_db:
                                        vendor_db.saldo_utang = (vendor_db.saldo_utang or 0) + total
                                
                                db.commit()
                                st.session_state.cart_beli = []
                                st.success(f"Nota {no_po} (Tanggal {tgl_po.strftime('%d-%m-%Y')}) Berhasil disimpan! Stok diperbarui.")
                                time.sleep(1.5) 
                                st.rerun()
                            except Exception as e:
                                db.rollback()
                                st.error(f"🚨 Transaksi Gagal! Error: {str(e)}")
                                
    # ========================================================
    # TAB 2: OPEX (BIAYA OPERASIONAL PABRIK)
    # ========================================================
    with t2:
        st.subheader(":material/account_balance_wallet: Pencatatan Biaya Pabrik (BTKL, BOP & OPEX)")
        
        daftar_akun_biaya = get_opsi_akun(db, kategori_filter="Beban")

        if not daftar_akun_biaya:
            st.warning("⚠️ Data Akun Beban belum diatur. Silakan tambah daftar akun di Master Data CoA.")
        else:
            with st.form("form_opex_new", clear_on_submit=True):
                
                tgl_opex = st.date_input("📅 Tanggal Keluar Uang / Pembayaran", datetime.date.today())
                
                pilihan_akun = st.selectbox("Pilih Kategori Pengeluaran", list(daftar_akun_biaya.keys()))
                ket = st.text_input("Keterangan Rinci (Contoh: Gaji Mang Ujang / Bayar Listrik / Jasa Sablon)")
                nom = st.number_input("Nominal Keluar (Rp)", min_value=0, step=1000)
                sumber_dana = st.radio("Uang Keluar Dari (Sumber Dana)", ["Kas Tunai", "Bank"], horizontal=True)

                if st.form_submit_button(":material/save: Catat Pengeluaran"):
                    if nom <= 0:
                        st.error("Nominal tidak boleh kosong!")
                    else:
                        try:
                            waktu_opex = datetime.datetime.combine(tgl_opex, datetime.datetime.now().time())
                            
                            kode_akun_debit = daftar_akun_biaya[pilihan_akun]
                            nama_akun_debit = pilihan_akun.split(" - ", 1)[1] if " - " in pilihan_akun else pilihan_akun
                        
                            kode_akun_kredit = "11110" if sumber_dana == "Kas Tunai" else "11120"
                            nama_akun_kredit = "Kas Tunai" if sumber_dana == "Kas Tunai" else "Bank"
                        
                            # Injeksi Waktu ke Jurnal
                            db.add(JurnalUmum(tanggal=waktu_opex, kode_akun=kode_akun_debit, nama_akun=nama_akun_debit, keterangan=ket, debit=nom, kredit=0))
                            db.add(JurnalUmum(tanggal=waktu_opex, kode_akun=kode_akun_kredit, nama_akun=nama_akun_kredit, keterangan=ket, debit=0, kredit=nom))
                            db.commit()
                        
                            st.success(f"Berhasil! Rp {nom:,.0f} dicatat sebagai beban {nama_akun_debit} untuk tanggal {tgl_opex.strftime('%d-%m-%Y')}.")
                            time.sleep(1.5)
                            st.rerun()
                        except Exception as e:
                            db.rollback()
                            st.error(f"🚨 Transaksi Gagal & Dibatalkan! Sistem Aman. Detail: {str(e)}")

    # ========================================================
    # TAB 3: RETUR PEMBELIAN
    # ========================================================
    with t3:
        st.subheader(":material/keyboard_return: Retur Pembelian")
        st.info("Fitur Retur Pembelian akan tersedia setelah ada data nota yang mencukupi.")

    # ========================================================
    # TAB 4: ASET TETAP (INVENTARIS)
    # ========================================================
    with t4:
        st.subheader(":material/computer: Manajemen Aset Tetap Pabrik")
        
        with st.expander("➕ Beli / Tambah Aset Tetap Baru", expanded=True):
            st.info("Gunakan menu ini KHUSUS untuk mencatat pembelian mesin/aset atau menginput saldo awal aset lama.")
            
            daftar_aset = {
                "13110 - Tanah & Bangunan": "13110",
                "13210 - Mesin Produksi & Peralatan (Mesin Jahit, Potong, dll)": "13210",
                "13310 - Kendaraan (Motor, Mobil Operasional)": "13310",
                "13410 - Furniture & Inventaris Kantor (Laptop, AC, Meja, Kursi)": "13410"
            }
            
            with st.form("form_aset_tetap", clear_on_submit=True):
                
                tgl_aset = st.date_input("📅 Tanggal Perolehan / Pembelian Aset", datetime.date.today())
                
                pilih_aset = st.selectbox("Pilih Kategori Aset", list(daftar_aset.keys()))
                nama_barang = st.text_input("Nama Barang (Contoh: Mesin Jahit Juki - Saldo Awal 2026)")
                harga_aset = st.number_input("Harga Beli / Nilai Saat Ini (Rp)", min_value=0, step=100000)
                sumber_dana_aset = st.radio("Dibayar / Bersumber Dari", ["Kas Tunai", "Bank", "Modal Awal (Khusus Aset Lama)"], horizontal=True)
                
                if st.form_submit_button(":material/save: Catat Aset"):
                    if harga_aset <= 0:
                        st.error("Harga beli tidak boleh kosong!")
                    else:
                        try:
                            waktu_aset = datetime.datetime.combine(tgl_aset, datetime.datetime.now().time())
                            
                            kode_aset = daftar_aset[pilih_aset]
                            nama_akun_aset = pilih_aset.split(" - ", 1)[1]
                            
                            if sumber_dana_aset == "Modal Awal (Khusus Aset Lama)":
                                kode_kredit, nama_kredit = "31110", "Modal Disetor Pemilik"
                            else:
                                kode_kredit = "11110" if sumber_dana_aset == "Kas Tunai" else "11120"
                                nama_kredit = "Kas Tunai" if sumber_dana_aset == "Kas Tunai" else "Bank"
                            
                            db.add(JurnalUmum(tanggal=waktu_aset, kode_akun=kode_aset, nama_akun=nama_akun_aset, keterangan=nama_barang, debit=harga_aset, kredit=0))
                            db.add(JurnalUmum(tanggal=waktu_aset, kode_akun=kode_kredit, nama_akun=nama_kredit, keterangan=f"Aset: {nama_barang}", debit=0, kredit=harga_aset))
                            db.commit()
                            
                            st.success(f"Berhasil! {nama_barang} senilai Rp {harga_aset:,.0f} telah ditambahkan ke Aset Pabrik.")
                            time.sleep(1.5)
                            st.rerun()
                        except Exception as e:
                            db.rollback()
                            st.error(f"🚨 Gagal mencatat aset. Error: {str(e)}")

        st.markdown("---")
        st.subheader("📋 Daftar Aset Raziq Garment")
        
        jurnal_aset = db.query(JurnalUmum).filter(
            JurnalUmum.kode_akun.in_(["13110", "13210", "13310", "13410"]),
            JurnalUmum.debit > 0
        ).all()
        
        if jurnal_aset:
            df_aset = pd.DataFrame([{
                "Tanggal Masuk": j.tanggal.strftime('%Y-%m-%d') if hasattr(j.tanggal, 'strftime') else str(j.tanggal.date()),
                "Kategori Akun": f"[{j.kode_akun}] {j.nama_akun}",
                "Nama Barang": j.keterangan,
                "Nilai Perolehan": format_rp(j.debit)
            } for j in jurnal_aset])
            df_aset.index = df_aset.index + 1
            st.dataframe(df_aset, use_container_width=True)
            
            st.markdown("---")
            st.subheader("📉 Sistem Penyusutan Otomatis (Metode Garis Lurus)")
            st.info("💡 **AI Standard Costing:** Nilai Sisa (Salvage Value) dihitung berdasarkan kelayakan harga barang bekas di pasaran lokal pabrik garmen.")
            
            tot_bangunan = sum(j.debit for j in jurnal_aset if j.kode_akun == "13110")
            tot_mesin = sum(j.debit for j in jurnal_aset if j.kode_akun == "13210")
            tot_kendaraan = sum(j.debit for j in jurnal_aset if j.kode_akun == "13310")
            tot_inventaris = sum(j.debit for j in jurnal_aset if j.kode_akun == "13410")
            
            susut_bangunan = (tot_bangunan - 0) / 240 if tot_bangunan > 0 else 0
            susut_mesin = (tot_mesin - (tot_mesin * 0.10)) / 48 if tot_mesin > 0 else 0
            susut_kendaraan = (tot_kendaraan - (tot_kendaraan * 0.20)) / 96 if tot_kendaraan > 0 else 0
            susut_inventaris = (tot_inventaris - 0) / 48 if tot_inventaris > 0 else 0
            
            data_susut = [
                {"Kategori Aset": "Tanah & Bangunan", "Total Aset": format_rp(tot_bangunan), "Umur": "20 Thn", "Nilai Sisa": "0%", "Beban Susut /Bulan": format_rp(susut_bangunan)},
                {"Kategori Aset": "Mesin Produksi", "Total Aset": format_rp(tot_mesin), "Umur": "4 Thn", "Nilai Sisa": "10%", "Beban Susut /Bulan": format_rp(susut_mesin)},
                {"Kategori Aset": "Kendaraan", "Total Aset": format_rp(tot_kendaraan), "Umur": "8 Thn", "Nilai Sisa": "20%", "Beban Susut /Bulan": format_rp(susut_kendaraan)},
                {"Kategori Aset": "Inventaris / IT", "Total Aset": format_rp(tot_inventaris), "Umur": "4 Thn", "Nilai Sisa": "0%", "Beban Susut /Bulan": format_rp(susut_inventaris)}
            ]
            st.table(pd.DataFrame(data_susut))
            
            if st.button("🚀 Catat Semua Penyusutan (Bulan Ini) ke Laporan"):
                bulan_ini = datetime.date.today().strftime("%b %Y")
                waktu_susut = datetime.datetime.combine(datetime.date.today(), datetime.datetime.now().time())
                cek_susut = db.query(JurnalUmum).filter(JurnalUmum.keterangan == f"Susut Otomatis {bulan_ini}").first()
                if cek_susut:
                    st.error(f"🚨 DITOLAK! Beban penyusutan untuk bulan **{bulan_ini}** SUDAH TERCATAT. Anda hanya bisa menyusutkan aset 1 kali dalam sebulan untuk menjaga keakuratan Laba Rugi.")
                else:
                    try:
                        if susut_bangunan > 0:
                            db.add(JurnalUmum(tanggal=waktu_susut, kode_akun="51350", nama_akun="BOP - Penyusutan Gedung Produksi", keterangan=f"Susut Otomatis {bulan_ini}", debit=susut_bangunan, kredit=0))
                            db.add(JurnalUmum(tanggal=waktu_susut, kode_akun="13120", nama_akun="Akumulasi Penyusutan Bangunan", keterangan=f"Susut Otomatis {bulan_ini}", debit=0, kredit=susut_bangunan))
                    
                        if susut_mesin > 0:
                            db.add(JurnalUmum(tanggal=waktu_susut, kode_akun="51350", nama_akun="BOP - Penyusutan Mesin Produksi", keterangan=f"Susut Otomatis {bulan_ini}", debit=susut_mesin, kredit=0))
                            db.add(JurnalUmum(tanggal=waktu_susut, kode_akun="13220", nama_akun="Akumulasi Penyusutan Mesin", keterangan=f"Susut Otomatis {bulan_ini}", debit=0, kredit=susut_mesin))
                        
                        if susut_kendaraan > 0:
                            db.add(JurnalUmum(tanggal=waktu_susut, kode_akun="62170", nama_akun="Beban Penyusutan Kendaraan Kantor", keterangan=f"Susut Otomatis {bulan_ini}", debit=susut_kendaraan, kredit=0))
                            db.add(JurnalUmum(tanggal=waktu_susut, kode_akun="13320", nama_akun="Akumulasi Penyusutan Kendaraan", keterangan=f"Susut Otomatis {bulan_ini}", debit=0, kredit=susut_kendaraan))
                        
                        if susut_inventaris > 0:
                            db.add(JurnalUmum(tanggal=waktu_susut, kode_akun="62170", nama_akun="Beban Penyusutan Furniture Kantor", keterangan=f"Susut Otomatis {bulan_ini}", debit=susut_inventaris, kredit=0))
                            db.add(JurnalUmum(tanggal=waktu_susut, kode_akun="13420", nama_akun="Akumulasi Penyusutan Furniture", keterangan=f"Susut Otomatis {bulan_ini}", debit=0, kredit=susut_inventaris))
                    
                        db.commit()
                        st.success("✅ Sukses! Laporan Neraca & Laba Rugi sudah diperbarui otomatis.")
                        time.sleep(2)
                        st.rerun()
                    except Exception as e:
                        db.rollback()
                        st.error(f"🚨 Gagal mencatat penyusutan. Error: {str(e)}")

            else:
                st.info("Belum ada aset tetap yang dibeli.")
            
    db.close()