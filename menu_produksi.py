import streamlit as st
import pandas as pd
import datetime
import time 
import re 
from database import SessionLocal
from models import Barang, KategoriBarang, Karyawan, JurnalUmum, TipeGaji
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
    st.title(":material/content_cut: Produksi Harian (Cutting & Jahit)")
    db = SessionLocal()
    
    karyawans = db.query(Karyawan).all()
    kain_list = db.query(Barang).filter(Barang.kategori == KategoriBarang.BAHAN_BAKU).all()
    baju_list = db.query(Barang).filter(Barang.kategori == KategoriBarang.BARANG_JADI).all()

    if not karyawans or not baju_list:
        st.warning("⚠️ Data Barang Jadi atau Karyawan masih kosong di Master Data.")
        return

    t1, t2, t3, t4 = st.tabs([
        ":material/content_cut: **Cutting** (Kg -> Pcs)", 
        ":material/apparel: **Jahit/Finishing** (Pcs -> Lusin)", 
        ":material/payments: **Rekap Tagihan Cutting**",
        ":material/inventory_2: **WIP Cutting**"
    ])

    # ==========================================
    # TAB 1: FASE CUTTING
    # ==========================================
    with t1:
        st.write("Catat pemakaian kain untuk dipotong menjadi pola baju.")
        
        kain = st.selectbox("Pilih Kain", kain_list, format_func=lambda x: f"{x.nama_barang} (Stok: {x.stok_saat_ini:g} Kg)")
        produk_cut = st.selectbox("🧷 Model Baju yang Dipotong", baju_list, format_func=lambda x: f"{x.kode_sku} - {x.nama_barang}", key="produk_cut_wip")
        
        with st.form("form_cutting_v2", clear_on_submit=True):

            tgl_cutting = st.date_input("📅 Tanggal Pemotongan", datetime.date.today())
            
            c1, c2 = st.columns(2)
            kg_pakai = c1.number_input("Kain Terpakai (Kg)", min_value=0.1, step=0.5)
            hasil_pcs = c2.number_input("Hasil Potongan (Pcs)", min_value=1)
            
            c3, c4 = st.columns(2)
            tukang_potong = c3.selectbox("Tukang Potong", karyawans, format_func=lambda x: x.nama_karyawan)
            ongkos_per_pcs = c4.number_input("Ongkos Potong per Pcs (Rp)", min_value=0, value=1000)

            if st.form_submit_button(":material/save: Simpan Data Cutting"):
                if not kain:
                    st.error("Pilih kain terlebih dahulu!")
                elif kg_pakai > kain.stok_saat_ini:
                    st.error(f"Stok kain tidak cukup! Sisa: {kain.stok_saat_ini:g} Kg")
                else:
                    try:
                        waktu_cutting = datetime.datetime.combine(tgl_cutting, datetime.datetime.now().time())
                        
                        kain_db = db.query(Barang).filter(Barang.id == kain.id).first()
                        kain_db.stok_saat_ini -= kg_pakai

                        nilai_kain_terpakai = kg_pakai * (kain.harga_modal or 0)
                        total_upah = hasil_pcs * ongkos_per_pcs

                        ket_jurnal = f"Cutting {hasil_pcs} pcs dari {kg_pakai}kg {kain.nama_barang} [SKU:{produk_cut.kode_sku}] [Potong: {tukang_potong.nama_karyawan} | Upah: {total_upah}]"

                        db.add(JurnalUmum(tanggal=waktu_cutting, kode_akun="51110", nama_akun="Pemakaian Bahan Baku", keterangan=ket_jurnal, debit=nilai_kain_terpakai, kredit=0))
                        db.add(JurnalUmum(tanggal=waktu_cutting, kode_akun="12110", nama_akun="Persediaan Bahan Baku (Kain)", keterangan=f"Pemakaian Kain {kain.nama_barang}", debit=0, kredit=nilai_kain_terpakai))
                        
                        db.commit()
                        st.success(f"Berhasil! Stok {kain.nama_barang} berkurang untuk tanggal {tgl_cutting.strftime('%d-%m-%Y')}.")
                        time.sleep(1.5) 
                        st.rerun()
                    except Exception as e:
                        db.rollback()
                        st.error(f"🚨 Transaksi Gagal! Error: {str(e)}")

    # ==========================================
    # TAB 2: FASE JAHIT (Nama Penjahit Dihilangkan)
    # ==========================================
    with t2:
        st.write("Untuk mencatat Baju yang selesai finishing. Stok gudang akan bertambah dalam satuan **Lusin**.")
        
        produk = st.selectbox("**Daftar Model**", baju_list, format_func=lambda x: f"{x.kode_sku} - {x.nama_barang}")
        
        with st.form("form_jahit_v2", clear_on_submit=True):

            tgl_jahit = st.date_input("📅 Tanggal Selesai Jahit", datetime.date.today())
            
            qty_ls = st.number_input("Jumlah Selesai (**dalam Lusin**)", min_value=0.1, step=1.0)
            
            st.caption("Input Barang yang sudah proses Finishing. (Pembayaran ongkos jahit direkap global di menu Biaya/Opex).")

            if st.form_submit_button(":material/save: Simpan ke Gudang"):
                if not produk:
                    st.error("Pilih model baju terlebih dahulu!")
                else:
                    try:
                        waktu_jahit = datetime.datetime.combine(tgl_jahit, datetime.datetime.now().time())
                        
                        total_pcs = int(qty_ls * 12)
                        produk_db = db.query(Barang).filter(Barang.id == produk.id).first()
                        produk_db.stok_saat_ini += total_pcs
                        
                        nilai_masuk = qty_ls * (produk_db.harga_modal or 0)
                        
                        db.add(JurnalUmum(tanggal=waktu_jahit, kode_akun="12150", nama_akun="Persediaan Barang Jadi", keterangan=f"Masuk {total_pcs} pcs {produk_db.kode_sku} (Jahit)", debit=nilai_masuk, kredit=0))
                        db.add(JurnalUmum(tanggal=waktu_jahit, kode_akun="51199", nama_akun="Ikhtisar Produksi", keterangan=f"Masuk Gudang {produk_db.kode_sku}", debit=0, kredit=nilai_masuk))
                        
                        db.commit()
                        st.success(f"Berhasil! {qty_ls} Lusin masuk gudang untuk tanggal {tgl_jahit.strftime('%d-%m-%Y')}.")
                        time.sleep(1.5)
                        st.rerun()
                    except Exception as e:
                        db.rollback()
                        st.error(f"🚨 Transaksi Gagal! Error: {str(e)}")

    # ==========================================
    # TAB 3: REKAP TAGIHAN CUTTING
    # ==========================================
    with t3:
        st.subheader("Rekap Borongan Cutting (Mingguan)")
        st.write("Data di bawah ini merekap total potongan untuk mempermudah hitung gaji di hari Sabtu.")
        
        jurnal_cutting = db.query(JurnalUmum).filter(JurnalUmum.kode_akun == "51110", JurnalUmum.keterangan.like("%[Potong:%")).order_by(JurnalUmum.tanggal.desc()).all()
        
        if jurnal_cutting:
            data_rekap = []
            for j in jurnal_cutting:
                ket = str(j.keterangan)
                try:
                    info_potong = ket.split("[Potong: ")[1].split("]")[0] 
                    nama = info_potong.split(" | ")[0].strip()
                    upah = float(info_potong.split("Upah: ")[1].strip())
                    
                    pcs_match = re.search(r'Cutting (\d+) pcs', ket)
                    pcs = int(pcs_match.group(1)) if pcs_match else 0
                    
                    tgl = j.tanggal.strftime("%Y-%m-%d %H:%M") if hasattr(j.tanggal, 'strftime') else str(j.tanggal.date())
                    
                    data_rekap.append({
                        "Waktu": tgl,
                        "Tukang Potong": nama,
                        "Hasil Potong": f"{pcs} Pcs",
                        "Tagihan Upah": upah
                    })
                except:
                    pass

            if data_rekap:
                st.markdown("**Rincian Potong Harian:**")
                df_rekap = pd.DataFrame(data_rekap)
                st.dataframe(df_rekap, use_container_width=True)
                
                st.markdown("---")
                st.markdown("### :material/account_balance_wallet: Total Tagihan Gaji per Karyawan")
                df_group = df_rekap.groupby("Tukang Potong")["Tagihan Upah"].sum().reset_index()
                df_group["Tagihan Upah"] = df_group["Tagihan Upah"].apply(format_rp)
                st.table(df_group)
                
                st.info("💡 **Catatan untuk Hari Sabtu:** Kalau sudah melihat total tagihan **Cutting** di atas, silakan bayar upah cutting melalui menu **Pembelian & Biaya -> Tab Biaya Pabrik** (Pilih Akun: `51210 - BTKL - Upah Cutting`).", icon=":material/lightbulb:")
            else:
                st.info("Belum ada data rekap cutting (Data lama tidak direkap karena belum ada tag nama).", icon=":material/info:")
        else:
            st.info("Belum ada data produksi cutting sama sekali.", icon=":material/info:")

    # ==========================================
    # TAB 4: WIP CUTTING (Sisa Belum Dijahit)
    # ==========================================
    with t4:
        st.subheader(":material/stockpot: Stok Barang Setengah Jadi (WIP Cutting)")
        st.info(
            "Sisa potongan kain yang sudah **Cutting** tapi **belum masuk Jahit/Finishing**. "
            "Mulai sekarang, selalu pilih **Model Baju** saat input Cutting agar data lebih akurat.",
            icon=":material/lightbulb:"
        )

        j_cut = db.query(JurnalUmum).filter(
            JurnalUmum.kode_akun == "51110",
            JurnalUmum.keterangan.like("%Cutting%")
        ).all()

        j_jht = db.query(JurnalUmum).filter(
            JurnalUmum.kode_akun == "12150",
            JurnalUmum.keterangan.like("%Jahit%")
        ).all()

        cut_rows = []
        for j in j_cut:
            ket = str(j.keterangan)
            pm = re.search(r'Cutting (\d+) pcs', ket)
            sm = re.search(r'\[SKU:([^\]]+)\]', ket)
            if pm:
                cut_rows.append({"kode_sku": sm.group(1).strip() if sm else "—", "total_potong": int(pm.group(1))})

        jht_rows = []
        for j in j_jht:
            ket = str(j.keterangan)
            m = re.search(r'Masuk (\d+) pcs (\S+) \(Jahit\)', ket)
            if m:
                jht_rows.append({"kode_sku": m.group(2).strip(), "total_jahit": int(m.group(1))})

        df_c = pd.DataFrame(cut_rows) if cut_rows else pd.DataFrame(columns=["kode_sku", "total_potong"])
        df_j = pd.DataFrame(jht_rows) if jht_rows else pd.DataFrame(columns=["kode_sku", "total_jahit"])

        df_cg = df_c.groupby("kode_sku")["total_potong"].sum().reset_index() if not df_c.empty else df_c
        df_jg = df_j.groupby("kode_sku")["total_jahit"].sum().reset_index() if not df_j.empty else df_j

        df_wip = pd.merge(df_cg, df_jg, on="kode_sku", how="outer").fillna(0)
        df_wip["total_potong"] = df_wip["total_potong"].astype(int)
        df_wip["total_jahit"] = df_wip["total_jahit"].astype(int)
        df_wip["sisa_wip"] = df_wip["total_potong"] - df_wip["total_jahit"]
        barang_d = {b.kode_sku: b.nama_barang for b in baju_list}
        df_wip["nama_barang"] = df_wip["kode_sku"].map(barang_d).fillna("Tidak Diketahui")

        df_show = df_wip[["kode_sku", "nama_barang", "total_potong", "total_jahit", "sisa_wip"]].copy()
        df_show.columns = ["Kode SKU", "Nama Barang", "Total Potong (Pcs)", "Total Masuk Jahit (Pcs)", "Sisa Belum Dijahit (Pcs)"]
        df_show = df_show.sort_values("Sisa Belum Dijahit (Pcs)", ascending=False).reset_index(drop=True)

        if df_show.empty or df_show["Total Potong (Pcs)"].sum() == 0:
            st.info("Belum ada data WIP. Mulai input Cutting dan pilih Model Baju.", icon=":material/inventory_2:")
        else:
            def _style_sisa(val):
                if val > 0: return 'background-color:#fff9c4;color:#5d4037;font-weight:bold'
                if val < 0: return 'background-color:#ffcdd2;color:#b71c1c;font-weight:bold'
                return 'background-color:#c8e6c9;color:#1b5e20;font-weight:bold'

            st.dataframe(
                df_show.style.map(_style_sisa, subset=["Sisa Belum Dijahit (Pcs)"]),
                use_container_width=True, hide_index=True
            )
            c1, c2, c3 = st.columns(3)
            c1.metric(":material/content_cut: Total Dipotong", f"{int(df_show['Total Potong (Pcs)'].sum()):,} Pcs")
            c2.metric(":material/thread_unread: Total Dijahit", f"{int(df_show['Total Masuk Jahit (Pcs)'].sum()):,} Pcs")
            c3.metric(":material/inventory_2: WIP Antre Jahit", f"{int(df_show['Sisa Belum Dijahit (Pcs)'].sum()):,} Pcs")

            if (df_wip["kode_sku"] == "—").any():
                st.warning("⚠️ Ada data cutting lama tanpa info SKU. Mulai sekarang selalu pilih **Model Baju** saat input Cutting.", icon=":material/warning:")

    db.close()