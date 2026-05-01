import streamlit as st
import pandas as pd
import io
import time
import datetime
from database import SessionLocal
from models import Barang, Karyawan, Mitra, KategoriBarang, KategoriMitra, Divisi, TipeGaji, JurnalUmum, AkunBukuBesar
from utils import format_rp
from pdf_generator import export_dataframe_pdf

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
    st.title(":material/inventory_2: Manajemen Data Master & SKU")
    db = SessionLocal()
    
    # --- FITUR IMPORT GANDA ---
    st.info("💡 Gunakan fitur Import Excel di bawah ini untuk memasukkan saldo awal stok bulan ini.")
    col_imp1, col_imp2 = st.columns(2)
    
    with col_imp1:
        with st.expander(":material/apparel: Import Saldo Awal BAJU (Jadi)"):
            st.write("Format: Model Code, Product Name, SKU, Satuan, Harga Jual, Harga Modal, Stok Awal")
            template_baju = pd.DataFrame(columns=["Model Code", "Product Name", "SKU", "Satuan (Lusin/Pcs)", "Harga Jual", "Harga Modal", "Stok Awal"])
            buffer = io.BytesIO()
            with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
                template_baju.to_excel(writer, index=False)
            st.download_button("⬇️ Download Template Baju", data=buffer.getvalue(), file_name="Template_Baju_Jadi.xlsx")
            
            file_baju = st.file_uploader("Upload Excel Baju", type=["xlsx"], key="up_baju")
            if file_baju and st.button("🚀 Proses Import Baju"):
                df = pd.read_excel(file_baju)
                
                # ==========================================================
                # FITUR KEMBALI: HAPUS SEMUA DATA BAJU LAMA & JURNALNYA
                # ==========================================================
                barang_lama = db.query(Barang).filter(Barang.kategori == KategoriBarang.BARANG_JADI).all()
                for b in barang_lama:
                    db.query(JurnalUmum).filter(JurnalUmum.keterangan == f"Saldo Awal {b.kode_sku}").delete(synchronize_session=False)
                    db.delete(b)
                db.commit()
                # ==========================================================
                
                for _, row in df.iterrows():
                    sku = str(row['SKU']).strip()
                    if not db.query(Barang).filter(Barang.kode_sku == sku).first():
                        stok_excel = float(row['Stok Awal']) if pd.notna(row['Stok Awal']) else 0
                        hrg_m = float(row['Harga Modal']) if pd.notna(row['Harga Modal']) else 0
                        satuan = str(row['Satuan (Lusin/Pcs)']).strip().lower()
                        
                        # --- PERBAIKAN LOGIKA KONVERSI KE KEUANGAN ---
                        # Database stok disimpan dalam Pcs, tapi Harga Modal dalam Lusin
                        if "lusin" in satuan or "ls" in satuan:
                            stok_pcs = stok_excel * 12
                            qty_ls = stok_excel
                        else: # Jika di excel satuannya Pcs
                            stok_pcs = stok_excel
                            qty_ls = stok_excel / 12.0

                        db.add(Barang(
                            model_code=row['Model Code'], nama_barang=row['Product Name'], kode_sku=sku,
                            kategori=KategoriBarang.BARANG_JADI, satuan=row['Satuan (Lusin/Pcs)'],
                            stok_saat_ini=stok_pcs, harga_jual=row['Harga Jual'], harga_modal=hrg_m
                        ))
                        
                        # SINKRONISASI KODE ASET BARANG JADI (12150)
                        if stok_pcs > 0 and hrg_m > 0:
                            # PERBAIKAN: Hitung Nilai berdasarkan (Lusin * Harga per Lusin)
                            nilai = qty_ls * hrg_m
                            
                            db.add(JurnalUmum(kode_akun="12150", nama_akun="Persediaan Barang Jadi", keterangan=f"Saldo Awal {sku}", debit=nilai, kredit=0))
                            db.add(JurnalUmum(kode_akun="31110", nama_akun="Modal Disetor (Saldo Awal)", keterangan=f"Saldo Awal {sku}", debit=0, kredit=nilai))
                db.commit()
                st.success("Berhasil Import Stok Baju!")

    with col_imp2:
        with st.expander(":material/content_paste: Import Saldo Awal BAHAN (Baku/Kain)"):
            st.write("Format: Nama Bahan, SKU, Kategori (Baku/Pembantu/Penolong), Satuan, Harga Modal, Stok Awal")
            template_bahan = pd.DataFrame(columns=["Nama Bahan", "SKU", "Kategori", "Satuan (Kg/Pcs)", "Harga Modal", "Stok Awal"])
            buffer_b = io.BytesIO()
            with pd.ExcelWriter(buffer_b, engine='openpyxl') as writer:
                template_bahan.to_excel(writer, index=False)
            st.download_button("⬇️ Download Template Bahan", data=buffer_b.getvalue(), file_name="Template_Bahan_Baku.xlsx")
            
            file_bahan = st.file_uploader("Upload Excel Bahan", type=["xlsx"], key="up_bahan")
            if file_bahan and st.button("🚀 Proses Import Bahan Baku"):
                df_b = pd.read_excel(file_bahan)
                
                # ==========================================================
                # FITUR KEMBALI: HAPUS SEMUA DATA BAHAN LAMA & JURNALNYA
                # ==========================================================
                bahan_lama = db.query(Barang).filter(Barang.kategori.in_([
                    KategoriBarang.BAHAN_BAKU, 
                    KategoriBarang.BAHAN_PEMBANTU, 
                    KategoriBarang.BAHAN_PENOLONG
                ])).all()
                
                for b in bahan_lama:
                    db.query(JurnalUmum).filter(JurnalUmum.keterangan == f"Saldo Awal {b.kode_sku}").delete(synchronize_session=False)
                    db.delete(b)
                db.commit()
                # ==========================================================
                
                for _, row in df_b.iterrows():
                    sku = str(row['SKU']).strip()
                    if not db.query(Barang).filter(Barang.kode_sku == sku).first():
                        kat_str = str(row['Kategori']).upper()
                        kategori = KategoriBarang.BAHAN_BAKU
                        if "PEMBANTU" in kat_str: kategori = KategoriBarang.BAHAN_PEMBANTU
                        elif "PENOLONG" in kat_str: kategori = KategoriBarang.BAHAN_PENOLONG
                        
                        stok = float(row['Stok Awal']) if pd.notna(row['Stok Awal']) else 0
                        hrg_m = float(row['Harga Modal']) if pd.notna(row['Harga Modal']) else 0
                        
                        db.add(Barang(
                            nama_barang=row['Nama Bahan'], kode_sku=sku, model_code="BAHAN",
                            kategori=kategori, satuan=row['Satuan (Kg/Pcs)'],
                            stok_saat_ini=stok, harga_modal=hrg_m
                        ))
                        
                        # SINKRONISASI KODE ASET BAHAN BAKU (12110 / 12120)
                        if stok > 0 and hrg_m > 0:
                            nilai = stok * hrg_m
                            if kategori == KategoriBarang.BAHAN_BAKU:
                                akun_bhn = "12110"; nama_bhn = "Persediaan Bahan Baku (Kain)"
                            else:
                                akun_bhn = "12120"; nama_bhn = "Persediaan Bahan Penolong"
                                
                            db.add(JurnalUmum(kode_akun=akun_bhn, nama_akun=nama_bhn, keterangan=f"Saldo Awal {sku}", debit=nilai, kredit=0))
                            db.add(JurnalUmum(kode_akun="31110", nama_akun="Modal Disetor (Saldo Awal)", keterangan=f"Saldo Awal {sku}", debit=0, kredit=nilai))
                db.commit()
                st.success("Berhasil Import Stok Bahan Baku!")

    st.markdown("---")
    
    # 7 TAB UTAMA (Termasuk Saldo Kas Bank)
    t1, t2, t3, t4, t5, t6, t7 = st.tabs([":material/inventory: Stock Barang", 
                                      "➕ Tambah Barang", 
                                      ":material/edit: Edit Barang", 
                                      ":material/group: Karyawan", 
                                      ":material/contacts: Klien & Supplier", 
                                      ":material/list_alt: COA",
                                      ":material/mintmark: Saldo Awal"])
    
    barangs = db.query(Barang).all()
    karyawans = db.query(Karyawan).all()
    mitras = db.query(Mitra).all()

    with t1:
        st.subheader("Gudang Kain & Barang Jadi")
        if barangs:
            data_tabel = []
            for b in barangs:
                stok_aman = b.stok_saat_ini or 0
                
                if b.kategori == KategoriBarang.BARANG_JADI:
                    stok_tampil = f"{(stok_aman / 12):.1f} Lusin ({int(stok_aman)} Pcs)"
                else:
                    stok_tampil = f"{stok_aman:g} Kg"
                    
                nama_kat = b.kategori.value if hasattr(b.kategori, 'value') else str(b.kategori)
                    
                data_tabel.append({
                    "Kategori": nama_kat,
                    "Model Code": b.model_code, 
                    "Product Name": b.nama_barang, 
                    "SKU": b.kode_sku, 
                    "Stok Gudang": stok_tampil, 
                    "Harga Jual": format_rp(b.harga_jual)
                })
                
            df = pd.DataFrame(data_tabel)
            df.index = df.index + 1
            st.dataframe(df, use_container_width=True)

            st.markdown("<hr>", unsafe_allow_html=True)
            col_pdf1, col_pdf2 = st.columns([3, 1])
            with col_pdf2:
                tgl_cetak = datetime.date.today().strftime("%d %B %Y")
                pdf_bytes = export_dataframe_pdf("LAPORAN STOK GUDANG PABRIK", tgl_cetak, df, [35, 20, 50, 25, 30, 30])
                st.download_button(
                    label="📄 Download PDF Stok Gudang",
                    data=pdf_bytes,
                    file_name=f"Stok_Gudang_{tgl_cetak}.pdf",
                    mime="application/pdf",
                    type="primary"
                )

            st.markdown("---")
            st.subheader("⚙️ Quick Edit & Penyesuaian Stok (Stock Opname)")
            st.info("Pilih barang dari tabel di atas untuk mengubah rincian data atau menyesuaikan stok fisik secara langsung.")
            
            pilih_edit = st.selectbox("Pilih Barang:", barangs, format_func=lambda x: f"[{x.kategori.value}] {x.kode_sku} - {x.nama_barang}", key="pilih_quick_edit")
            
            with st.form("form_quick_edit", clear_on_submit=True):
                c1, c2 = st.columns(2)
                index_kat = list(KategoriBarang).index(pilih_edit.kategori) if pilih_edit.kategori in list(KategoriBarang) else 0
                
                e_kat = c1.selectbox("Kategori", list(KategoriBarang), index=index_kat, format_func=lambda x: x.value, key=f"kat_qe_{pilih_edit.id}")
                e_code = c2.text_input("Model Code", value=pilih_edit.model_code, key=f"code_qe_{pilih_edit.id}")
                
                c3, c4 = st.columns(2)
                e_name = c3.text_input("Product Name", value=pilih_edit.nama_barang, key=f"name_qe_{pilih_edit.id}")
                e_sku = c4.text_input("SKU", value=pilih_edit.kode_sku, key=f"sku_qe_{pilih_edit.id}")
                
                c5, c6 = st.columns(2)
                e_harga = c5.number_input("Harga Jual (Rp)", min_value=0, value=int(pilih_edit.harga_jual or 0), step=1000, key=f"harga_qe_{pilih_edit.id}")
                e_stok = c6.number_input(f"Stok Fisik Asli (Pcs untuk Baju / Kg untuk Kain)", min_value=0.0, step=0.5, value=float(pilih_edit.stok_saat_ini or 0.0), key=f"stok_qe_{pilih_edit.id}")
                
                col_btn1, col_btn2 = st.columns(2)
                submit_edit = col_btn1.form_submit_button(":material/save: Simpan Perubahan & Update Stok")
                submit_delete = col_btn2.form_submit_button("🗑️ Hapus Barang")
                
                if submit_edit:
                    barang_update = db.query(Barang).filter(Barang.id == pilih_edit.id).first()
                    
                    selisih_stok = e_stok - barang_update.stok_saat_ini
                    if selisih_stok != 0:
                        # --- PERBAIKAN LOGIKA SELISIH KEUANGAN ---
                        if barang_update.kategori == KategoriBarang.BARANG_JADI:
                            # Baju: Harga modal sudah disimpan dalam satuan per Pcs
                            nilai_selisih = abs(selisih_stok) * (barang_update.harga_modal or 0)
                        else:
                            # Kain/Bahan Baku: Kg langsung dikali harga modal per Kg
                            nilai_selisih = abs(selisih_stok) * (barang_update.harga_modal or 0)
                        # -----------------------------------------
                        
                        if barang_update.kategori == KategoriBarang.BARANG_JADI:
                            akun_persediaan = "12150"; nama_akun_persediaan = "Persediaan Barang Jadi"
                        else:
                            akun_persediaan = "12110"; nama_akun_persediaan = "Persediaan Bahan Baku (Kain)"
                        
                        if selisih_stok < 0:
                            db.add(JurnalUmum(kode_akun="51390", nama_akun="BOP - Biaya Selisih/Kerusakan Stok", keterangan=f"Koreksi Stok {e_sku}", debit=nilai_selisih, kredit=0))
                            db.add(JurnalUmum(kode_akun=akun_persediaan, nama_akun=nama_akun_persediaan, keterangan=f"Koreksi Stok {e_sku}", debit=0, kredit=nilai_selisih))
                        else:
                            db.add(JurnalUmum(kode_akun=akun_persediaan, nama_akun=nama_akun_persediaan, keterangan=f"Koreksi Stok {e_sku}", debit=nilai_selisih, kredit=0))
                            db.add(JurnalUmum(kode_akun="41190", nama_akun="Pendapatan Lain-Lain (Selisih Stok)", keterangan=f"Koreksi Stok {e_sku}", debit=0, kredit=nilai_selisih))
                    
                    barang_update.kategori = e_kat
                    barang_update.model_code = e_code
                    barang_update.nama_barang = e_name
                    barang_update.kode_sku = e_sku
                    barang_update.harga_jual = e_harga
                    barang_update.stok_saat_ini = e_stok
                    
                    db.commit()
                    st.success("Berhasil! Data Barang dan Stok sudah diperbarui.")
                    time.sleep(1.5)
                    st.rerun()
                    
                if submit_delete:
                    barang_hapus = db.query(Barang).filter(Barang.id == pilih_edit.id).first()
                    db.delete(barang_hapus)
                    db.commit()
                    st.warning("Barang berhasil dihapus dari sistem!")
                    time.sleep(1.5)
                    st.rerun()
        else:
            st.warning("Belum ada data barang atau bahan baku.")
            
    with t2:
        with st.form("add_item", clear_on_submit=True):
            st.info("Gunakan form ini untuk menambah Master Barang/Kain secara manual.")
            c1, c2 = st.columns(2)
            kategori = c1.selectbox("Jenis Barang", list(KategoriBarang), format_func=lambda x: x.value)
            
            satuan_default = "Kg" if kategori == KategoriBarang.BAHAN_BAKU else "Lusin"
            satuan = c2.text_input("Satuan (Kg / Lusin / Pcs)", value=satuan_default)
            
            c3, c4 = st.columns(2)
            m_code = c3.text_input("Kode Model / Jenis Kain")
            p_name = c4.text_input("Nama Barang (Cth: Kaos Polos / Kain Combed)")
            
            c5, c6 = st.columns(2)
            sku = c5.text_input("SKU / Kode Unik")
            harga = c6.number_input(f"Harga Jual per {satuan_default} (Rp) - Opsional utk Kain", min_value=0, step=1000)
            
            if st.form_submit_button("💾 Simpan Master Data"):
                cek = db.query(Barang).filter(Barang.kode_sku == sku).first()
                if cek: 
                    st.error("SKU tersebut sudah ada!")
                else:
                    db.add(Barang(model_code=m_code, nama_barang=p_name, kode_sku=sku, harga_jual=harga, kategori=kategori, satuan=satuan))
                    db.commit()
                    st.success(f"Berhasil! {sku} ditambahkan ke Master Data.")
                    st.rerun()

    with t3:
        st.subheader("Edit Data Barang")
        if barangs:
            pilih_edit = st.selectbox("Pilih Barang:", barangs, format_func=lambda x: f"[{x.kategori.value}] {x.kode_sku} - {x.nama_barang}")
            with st.form("form_edit", clear_on_submit=True):
                c1, c2 = st.columns(2)
                e_code = c1.text_input("Model Code", value=pilih_edit.model_code)
                e_name = c2.text_input("Product Name", value=pilih_edit.nama_barang)
                c3, c4 = st.columns(2)
                e_sku = c3.text_input("SKU", value=pilih_edit.kode_sku)
                e_harga = c4.number_input("Harga Jual (Rp)", value=int(pilih_edit.harga_jual))
                
                col_btn1, col_btn2 = st.columns(2)
                if col_btn1.form_submit_button("💾 Simpan Perubahan"):
                    barang_update = db.query(Barang).filter(Barang.id == pilih_edit.id).first()
                    if barang_update:
                        barang_update.model_code = e_code; barang_update.nama_barang = e_name
                        barang_update.kode_sku = e_sku; barang_update.harga_jual = e_harga
                        db.commit(); st.success("Data berhasil diupdate!"); st.rerun()
                if col_btn2.form_submit_button("🗑️ Hapus Barang Ini"):
                    barang_hapus = db.query(Barang).filter(Barang.id == pilih_edit.id).first()
                    if barang_hapus:
                        db.delete(barang_hapus); db.commit(); st.warning("Barang dihapus!"); st.rerun()

    with t4:
        sub_t1, sub_t2, sub_t3 = st.tabs(["📝 Tambah Karyawan", "✏️ Edit / Hapus", "👥 Daftar Karyawan"])
        with sub_t1:
            with st.form("add_emp", clear_on_submit=True):
                c1, c2 = st.columns(2)
                nama_k = c1.text_input("Nama Lengkap Karyawan")
                no_hp = c2.text_input("No. HP / WhatsApp")
                alamat = st.text_input("Alamat Tempat Tinggal")
                c3, c4 = st.columns(2)
                div = c3.selectbox("Divisi Pekerjaan", list(Divisi), format_func=lambda x: x.value)
                tpg = c4.selectbox("Tipe Gaji", list(TipeGaji), format_func=lambda x: x.value)
                c5, c6 = st.columns(2)
                nom = c5.number_input("Gaji Pokok", min_value=0)
                target = c6.number_input("Target Produksi", min_value=0)
                
                kasbon_awal = st.number_input("Saldo Kasbon Awal (Rp) - Bawaan Bulan Lalu", min_value=0, step=50000)
                
                if st.form_submit_button("➕ Simpan Karyawan"):
                    try:
                        db.add(Karyawan(nama_karyawan=nama_k, no_hp=no_hp, alamat=alamat, divisi=div, tipe_gaji=tpg, nominal_gaji=nom, target_produksi_mingguan=target, saldo_kasbon=kasbon_awal))
                        if kasbon_awal > 0:
                            db.add(JurnalUmum(kode_akun="11220", nama_akun="Piutang Karyawan", keterangan=f"Saldo Awal Kasbon - {nama_k}", debit=kasbon_awal, kredit=0))
                            db.add(JurnalUmum(kode_akun="31110", nama_akun="Modal Disetor", keterangan=f"Saldo Awal Kasbon - {nama_k}", debit=0, kredit=kasbon_awal))
                        db.commit()
                        st.success("Karyawan & Data Kasbon Berhasil Ditambahkan!")
                        time.sleep(1.5)
                        st.rerun()
                    except Exception as e:
                        db.rollback()
                        st.error(f"🚨 Gagal Menyimpan! Detail: {str(e)}")
        
        with sub_t2:
            if karyawans:
                pilih_k = st.selectbox("Pilih Karyawan:", karyawans, format_func=lambda x: f"{x.nama_karyawan}", key="pilih_edit_kar")
                
                with st.form("edit_emp", clear_on_submit=True):
                    st.info("Edit rincian data karyawan di bawah ini.")
                    c1, c2 = st.columns(2)
                    e_nama = c1.text_input("Nama Lengkap Karyawan", value=pilih_k.nama_karyawan)
                    e_nohp = c2.text_input("No. HP / WhatsApp", value=pilih_k.no_hp or "")
                    e_alamat = st.text_input("Alamat Tempat Tinggal", value=pilih_k.alamat or "")
                    
                    c3, c4 = st.columns(2)
                    # Mengambil urutan index dari enum agar dropdown sesuai dengan data karyawan saat ini
                    idx_div = list(Divisi).index(pilih_k.divisi) if pilih_k.divisi in list(Divisi) else 0
                    idx_tpg = list(TipeGaji).index(pilih_k.tipe_gaji) if pilih_k.tipe_gaji in list(TipeGaji) else 0
                    
                    e_div = c3.selectbox("Divisi Pekerjaan", list(Divisi), index=idx_div, format_func=lambda x: x.value)
                    e_tpg = c4.selectbox("Tipe Gaji", list(TipeGaji), index=idx_tpg, format_func=lambda x: x.value)
                    
                    c5, c6 = st.columns(2)
                    e_nom = c5.number_input("Gaji Pokok", min_value=0, value=int(pilih_k.nominal_gaji or 0))
                    e_target = c6.number_input("Target Produksi", min_value=0, value=int(pilih_k.target_produksi_mingguan or 0))
                    
                    e_kasbon = st.number_input("Total Kasbon Saat Ini (Rp)", min_value=0, step=50000, value=int(pilih_k.saldo_kasbon or 0))
                    
                    col_btn1, col_btn2 = st.columns(2)
                    btn_edit = col_btn1.form_submit_button("💾 Simpan Perubahan")
                    btn_del = col_btn2.form_submit_button("🗑️ Hapus Karyawan (Resign)")
                    
                    if btn_edit:
                        try:
                            k_update = db.query(Karyawan).filter(Karyawan.id == pilih_k.id).first()
                            
                            # --- PERBAIKAN LOGIKA SELISIH KEUANGAN (KASBON) ---
                            # Agar perubahan nominal kasbon langsung nge-link ke Neraca Keuangan
                            selisih_kasbon = e_kasbon - (k_update.saldo_kasbon or 0)
                            if selisih_kasbon != 0:
                                if selisih_kasbon > 0: # Jika kasbon ditambah/dinaikkan
                                    db.add(JurnalUmum(kode_akun="11220", nama_akun="Piutang Karyawan", keterangan=f"Koreksi Penambahan Kasbon - {e_nama}", debit=selisih_kasbon, kredit=0))
                                    db.add(JurnalUmum(kode_akun="31110", nama_akun="Modal Disetor", keterangan=f"Koreksi Penambahan Kasbon - {e_nama}", debit=0, kredit=selisih_kasbon))
                                else: # Jika kasbon dikurangi (selisih minus)
                                    db.add(JurnalUmum(kode_akun="11220", nama_akun="Piutang Karyawan", keterangan=f"Koreksi Pengurangan Kasbon - {e_nama}", debit=0, kredit=abs(selisih_kasbon)))
                                    db.add(JurnalUmum(kode_akun="31110", nama_akun="Modal Disetor", keterangan=f"Koreksi Pengurangan Kasbon - {e_nama}", debit=abs(selisih_kasbon), kredit=0))
                            
                            # Update data ke tabel Karyawan
                            k_update.nama_karyawan = e_nama
                            k_update.no_hp = e_nohp
                            k_update.alamat = e_alamat
                            k_update.divisi = e_div
                            k_update.tipe_gaji = e_tpg
                            k_update.nominal_gaji = e_nom
                            k_update.target_produksi_mingguan = e_target
                            k_update.saldo_kasbon = e_kasbon
                            
                            db.commit()
                            st.success("Data Karyawan berhasil diperbarui!")
                            time.sleep(1.5)
                            st.rerun()
                        except Exception as e:
                            db.rollback()
                            st.error(f"🚨 Gagal Menyimpan! Detail: {str(e)}")

                    if btn_del:
                        try:
                            k_del = db.query(Karyawan).filter(Karyawan.id == pilih_k.id).first()
                            if k_del: 
                                # Membersihkan seluruh riwayat jurnal (keuangan) yang berkaitan dengan karyawan ini
                                # agar saldo di Neraca dan Riwayat Buku Besar ikut bersih
                                db.query(JurnalUmum).filter(JurnalUmum.keterangan.contains(k_del.nama_karyawan)).delete(synchronize_session=False)
                                
                                # Baru kemudian menghapus data karyawannya
                                db.delete(k_del)
                                db.commit()
                                st.warning(f"Karyawan {k_del.nama_karyawan} dan seluruh riwayat saldonya telah dihapus dari sistem!")
                                time.sleep(1.5)
                                st.rerun()
                        except Exception as e:
                            db.rollback()
                            st.error(f"🚨 Gagal Menghapus! Detail: {str(e)}")

        with sub_t3:
            if karyawans:
                df_k = pd.DataFrame([{
                    "Nama": k.nama_karyawan, 
                    "Divisi": k.divisi.value, 
                    "Tipe Gaji": k.tipe_gaji.value,
                    "Total Kasbon": format_rp(k.saldo_kasbon)
                } for k in karyawans])
                df_k.index = df_k.index + 1
                st.dataframe(df_k, use_container_width=True)

    with t5:
        st.subheader("Data Mitra Pabrik (Customer & Supplier)")
        with st.form("add_mitra", clear_on_submit=True):
            c1, c2 = st.columns(2)
            nama_mitra = c1.text_input("Nama Toko / Perusahaan / Orang")
            kat_mitra = c2.selectbox("Sebagai", list(KategoriMitra), format_func=lambda x: x.value)
            
            c3, c4 = st.columns(2)
            hp_mitra = c3.text_input("No. HP / Telp")
            alamat_mitra = c4.text_input("Alamat")
            
            st.info("💡 Jika Customer, ini adalah Piutang (Dia berutang ke kita). Jika Supplier, ini adalah Utang (Kita berutang ke dia).")
            saldo_awal_mitra = st.number_input("Saldo Awal Piutang / Utang (Rp) - Bawaan Bulan Lalu", min_value=0, step=100000)
            
            if st.form_submit_button("💾 Simpan Mitra Baru"):
                try: 
                    if kat_mitra == KategoriMitra.CUSTOMER:
                        db.add(Mitra(nama_mitra=nama_mitra, kategori=kat_mitra, no_hp=hp_mitra, alamat=alamat_mitra, saldo_piutang=saldo_awal_mitra, saldo_utang=0))
                        if saldo_awal_mitra > 0:
                            db.add(JurnalUmum(kode_akun="11210", nama_akun="Piutang Usaha", keterangan=f"Saldo Awal - {nama_mitra}", debit=saldo_awal_mitra, kredit=0))
                            db.add(JurnalUmum(kode_akun="31110", nama_akun="Modal Disetor", keterangan=f"Saldo Awal - {nama_mitra}", debit=0, kredit=saldo_awal_mitra))
                    else:
                        db.add(Mitra(nama_mitra=nama_mitra, kategori=kat_mitra, no_hp=hp_mitra, alamat=alamat_mitra, saldo_piutang=0, saldo_utang=saldo_awal_mitra))
                        if saldo_awal_mitra > 0:
                            db.add(JurnalUmum(kode_akun="31110", nama_akun="Modal Disetor", keterangan=f"Saldo Awal - {nama_mitra}", debit=saldo_awal_mitra, kredit=0))
                            db.add(JurnalUmum(kode_akun="21110", nama_akun="Utang Usaha", keterangan=f"Saldo Awal - {nama_mitra}", debit=0, kredit=saldo_awal_mitra))
                            
                    db.commit()
                    st.success(f"{kat_mitra.value} bernama {nama_mitra} berhasil disimpan!")
                    time.sleep(1.5)
                    st.rerun()
                except Exception as e:
                    db.rollback() 
                    st.error(f"🚨 Gagal Menyimpan! Detail: {str(e)}")
                
        if mitras:
            st.markdown("---")
            df_m = pd.DataFrame([{
                "Nama Mitra": m.nama_mitra, 
                "Kategori": m.kategori.value, 
                "No HP": m.no_hp,
                "Piutang (Dia Ngutang)": format_rp(m.saldo_piutang),
                "Utang (Kita Ngutang)": format_rp(m.saldo_utang)
            } for m in mitras])
            df_m.index = df_m.index + 1
            st.dataframe(df_m, use_container_width=True)

    with t6: 
        st.subheader(":material/book_5: Master Data Akun (Chart of Accounts)")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("**➕ Tambah Akun Baru**")
            with st.form("form_tambah_akun", clear_on_submit=True):
                kode_akun = st.text_input("Kode Akun (Contoh: 51210)")
                nama_akun = st.text_input("Nama Akun (Contoh: Upah Cutting)")
                kategori = st.selectbox("Kategori", ["Aset", "Kewajiban", "Ekuitas", "Pendapatan", "Beban"])
                
                if st.form_submit_button(":material/save: Simpan Akun"):
                    if not kode_akun or not nama_akun:
                        st.error("Kode dan Nama Akun wajib diisi!")
                    else:
                        cek_akun = db.query(AkunBukuBesar).filter(AkunBukuBesar.kode_akun == kode_akun).first()
                        if cek_akun:
                            st.error("Kode Akun sudah terdaftar!")
                        else:
                            db.add(AkunBukuBesar(kode_akun=kode_akun, nama_akun=nama_akun, kategori=kategori))
                            db.commit()
                            st.success(f"Akun {kode_akun} berhasil ditambahkan!")
                            st.rerun()
                            
        with col2:
            st.markdown("**📋 Daftar Akun Terdaftar**")
            daftar_akun = db.query(AkunBukuBesar).order_by(AkunBukuBesar.kode_akun).all()
            if daftar_akun:
                df_akun = pd.DataFrame([{
                    "Kode": a.kode_akun, 
                    "Nama Akun": a.nama_akun, 
                    "Kategori": a.kategori
                } for a in daftar_akun])
                st.dataframe(df_akun, use_container_width=True, hide_index=True)
            else:
                st.info("Belum ada data akun akuntansi.")

    # ========================================================
    # TAB 7 BARU: SALDO KAS DAN BANK
    # ========================================================
    with t7:
        st.subheader("💰 Input Saldo Awal Kas & Bank")
        st.info("Gunakan menu ini untuk memasukkan saldo Awal.")
        
        with st.form("form_saldo_awal_uang", clear_on_submit=True):
            col_a, col_b = st.columns(2)
            pilih_akun = col_a.selectbox("Pilih Akun", ["11110 - Kas Tunai", "11120 - Bank"])
            nominal_saldo = col_b.number_input("Nominal Saldo (Rp)", min_value=0, step=100000)
            keterangan_saldo = st.text_input("Keterangan", value="Saldo Awal per Tanggal Operasional")

            if st.form_submit_button("💾 Submit Saldo Awal"):
                if nominal_saldo > 0:
                    try:
                        kode = pilih_akun.split(" - ")[0]
                        nama_akun = pilih_akun.split(" - ")[1]
                        
                        # Jurnal: Debit Kas/Bank, Kredit Modal Disetor
                        db.add(JurnalUmum(kode_akun=kode, nama_akun=nama_akun, keterangan=keterangan_saldo, debit=nominal_saldo, kredit=0))
                        db.add(JurnalUmum(kode_akun="31110", nama_akun="Modal Disetor Pemilik", keterangan=keterangan_saldo, debit=0, kredit=nominal_saldo))
                        
                        db.commit()
                        st.success(f"Berhasil! Saldo {nama_akun} sebesar Rp {nominal_saldo:,.0f} telah dimasukkan. Neraca tetap seimbang.")
                        time.sleep(1.5)
                        st.rerun()
                    except Exception as e:
                        db.rollback()
                        st.error(f"Gagal memproses saldo: {str(e)}")
                else:
                    st.error("Nominal saldo harus lebih dari 0!")

    db.close()