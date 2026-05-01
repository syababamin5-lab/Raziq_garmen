import streamlit as st
import pandas as pd
import datetime
from database import SessionLocal
from models import Barang, KategoriBarang, JurnalUmum
from utils import format_rp
from pdf_generator import export_dataframe_pdf

def jalankan():
    st.title("📦 Manajemen Persediaan & Gudang")
    db = SessionLocal()
    
    # 3 TAB UTAMA PERSEDIAAN
    t1, t2, t3 = st.tabs(["👕 Gudang Barang Jadi", "🧵 Gudang Bahan Baku", "⚖️ Penyesuaian Persediaan (Stock Opname)"])
    
    barang_jadi = db.query(Barang).filter(Barang.kategori == KategoriBarang.BARANG_JADI).all()
    bahan_baku = db.query(Barang).filter(Barang.kategori == KategoriBarang.BAHAN_BAKU).all()
    semua_barang = db.query(Barang).all()
    
    tgl_cetak = datetime.date.today().strftime("%d %B %Y")

    # =========================================================
    # TAB 1: GUDANG BARANG JADI
    # =========================================================
    with t1:
        st.subheader("Persediaan Barang Jadi / Barang Dagang")
        if barang_jadi:
            df_jadi = pd.DataFrame([{
                "SKU": b.kode_sku, 
                "Nama Barang": b.nama_barang, 
                "Total Pcs": f"{b.stok_saat_ini:g} Pcs", 
                "Total Lusin": f"{(b.stok_saat_ini / 12):.1f} LS",
                "Harga Jual (LS)": format_rp(b.harga_jual)
            } for b in barang_jadi])
            df_jadi.index = df_jadi.index + 1
            st.dataframe(df_jadi, use_container_width=True)
            
            # EXPORT PDF 6: GUDANG BARANG JADI
            st.markdown("<hr>", unsafe_allow_html=True)
            col_pdf1, col_pdf2 = st.columns([3, 1])
            with col_pdf2:
                st.download_button(
                    label="📄 Download PDF Gudang Baju",
                    data=export_dataframe_pdf("LAPORAN FISIK PERSEDIAAN BARANG JADI", tgl_cetak, df_jadi, [30, 65, 25, 30, 40]),
                    file_name=f"Stok_Baju_{tgl_cetak}.pdf",
                    mime="application/pdf",
                    type="primary"
                )
        else:
            st.warning("Gudang Barang Jadi kosong.")

    # =========================================================
    # TAB 2: GUDANG BAHAN BAKU
    # =========================================================
    with t2:
        st.subheader("Persediaan Bahan Baku (Kain/Aksesoris)")
        if bahan_baku:
            df_baku = pd.DataFrame([{
                "Kode": b.kode_sku, 
                "Nama Bahan": b.nama_barang, 
                "Stok Fisik": f"{b.stok_saat_ini:g} {b.satuan}", 
                "Harga Modal": format_rp(b.harga_modal)
            } for b in bahan_baku])
            df_baku.index = df_baku.index + 1
            st.dataframe(df_baku, use_container_width=True)
            
            # EXPORT PDF 7: GUDANG BAHAN BAKU
            st.markdown("<hr>", unsafe_allow_html=True)
            col_pdf1, col_pdf2 = st.columns([3, 1])
            with col_pdf2:
                st.download_button(
                    label="📄 Download PDF Gudang Bahan",
                    data=export_dataframe_pdf("LAPORAN FISIK PERSEDIAAN BAHAN BAKU", tgl_cetak, df_baku, [35, 80, 35, 40]),
                    file_name=f"Stok_Kain_{tgl_cetak}.pdf",
                    mime="application/pdf",
                    type="primary"
                )
        else:
            st.warning("Gudang Bahan Baku kosong.")

    # =========================================================
    # TAB 3: PENYESUAIAN PERSEDIAAN (STOCK OPNAME)
    # =========================================================
    with t3:
        st.subheader("Penyesuaian Persediaan (Barang Rusak / Hilang / Susut)")
        st.write("Gunakan menu ini jika ada perbedaan antara stok di komputer dan fisik di gudang.")
        
        if semua_barang:
            with st.form("form_penyesuaian"):
                pilihan_barang = st.selectbox("Pilih Barang yang Disesuaikan", semua_barang, format_func=lambda x: f"[{x.kategori.value}] {x.kode_sku} - {x.nama_barang} (Stok Sistem: {x.stok_saat_ini:g} {x.satuan})")
                
                c1, c2 = st.columns(2)
                stok_fisik_asli = c1.number_input("Jumlah Fisik Sebenarnya di Gudang", min_value=0.0, step=0.5, value=float(pilihan_barang.stok_saat_ini or 0.0))
                alasan = c2.text_input("Keterangan / Alasan Penyesuaian", value="Stock Opname Akhir Bulan")
                
                if st.form_submit_button("⚖️ Update Stok Komputer"):
                    selisih = stok_fisik_asli - pilihan_barang.stok_saat_ini
                    
                    if selisih == 0:
                        st.info("Tidak ada selisih stok. Komputer dan fisik sudah sama.")
                    else:
                        # Update Stok Database
                        pilihan_barang.stok_saat_ini = stok_fisik_asli
                        
                        # Hitung nilai kerugian/keuntungan dari selisih
                        nilai_selisih = abs(selisih) * pilihan_barang.harga_modal
                        
                        # Kode Akun Disinkronkan dengan Sistem yang Baru
                        if pilihan_barang.kategori == KategoriBarang.BARANG_JADI:
                            akun_persediaan = "12150"
                            nama_akun_persediaan = "Persediaan Barang Jadi"
                        else:
                            akun_persediaan = "12110"
                            nama_akun_persediaan = "Persediaan Bahan Baku (Kain)"
                        
                        if selisih < 0: # Stok Hilang / Susut (Rugi)
                            db.add(JurnalUmum(kode_akun="51390", nama_akun="BOP - Biaya Selisih/Kerusakan Stok", keterangan=f"{alasan} ({pilihan_barang.kode_sku})", debit=nilai_selisih, kredit=0))
                            db.add(JurnalUmum(kode_akun=akun_persediaan, nama_akun=nama_akun_persediaan, keterangan=f"{alasan} ({pilihan_barang.kode_sku})", debit=0, kredit=nilai_selisih))
                            st.warning(f"Stok dikurangi {abs(selisih):g} {pilihan_barang.satuan}. Tercatat sebagai beban kerugian.")
                        else: # Stok Lebih 
                            db.add(JurnalUmum(kode_akun=akun_persediaan, nama_akun=nama_akun_persediaan, keterangan=f"{alasan} ({pilihan_barang.kode_sku})", debit=nilai_selisih, kredit=0))
                            db.add(JurnalUmum(kode_akun="41190", nama_akun="Pendapatan Lain-lain (Selisih Stok)", keterangan=f"{alasan} ({pilihan_barang.kode_sku})", debit=0, kredit=nilai_selisih))
                            st.success(f"Stok ditambahkan {abs(selisih):g} {pilihan_barang.satuan}.")
                        
                        db.commit()
                        st.rerun()
        else:
            st.info("Belum ada data barang sama sekali.")

    db.close()