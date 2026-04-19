import streamlit as st
import pandas as pd
import re
from database import SessionLocal
from models import JurnalUmum

def tampilkan_wip_cutting():
    st.title("📊 Stok Barang Setengah Jadi (WIP Cutting)")
    st.write("Memantau total potongan kain yang sudah di-cutting namun belum masuk ke proses jahit/finishing.")
    
    db = SessionLocal()

    try:
        # ==========================================
        # 1. TARIK & EKSTRAK DATA CUTTING (Kode: 51110)
        # ==========================================
        jurnal_cutting = db.query(JurnalUmum).filter(
            JurnalUmum.kode_akun == "51110",
            JurnalUmum.keterangan.like("Cutting%")
        ).all()

        data_cutting = []
        for j in jurnal_cutting:
            ket = str(j.keterangan)
            # Mengambil Qty Pcs dan Nama Barang dari format string Jurnal
            # Contoh target: "Cutting 100 pcs dari 5.0kg Kain Combed 30s [Potong:..."
            match = re.search(r'Cutting (\d+) pcs dari [\d.]+kg (.*?) \[Potong:', ket)
            if match:
                qty_potong = int(match.group(1))
                nama_barang = match.group(2).strip()
                data_cutting.append({
                    "Nama SKU": nama_barang, 
                    "Total Potong": qty_potong
                })

        df_cutting = pd.DataFrame(data_cutting)
        if not df_cutting.empty:
            # Kelompokkan berdasarkan Nama SKU
            df_cutting = df_cutting.groupby("Nama SKU")["Total Potong"].sum().reset_index()
        else:
            df_cutting = pd.DataFrame(columns=["Nama SKU", "Total Potong"])

        # ==========================================
        # 2. TARIK & EKSTRAK DATA JAHIT (Kode: 12150)
        # ==========================================
        jurnal_jahit = db.query(JurnalUmum).filter(
            JurnalUmum.kode_akun == "12150",
            JurnalUmum.keterangan.like("Masuk% (Jahit)")
        ).all()

        data_jahit = []
        for j in jurnal_jahit:
            ket = str(j.keterangan)
            # Mengambil Qty Pcs dan Nama SKU dari format string Jurnal
            # Contoh target: "Masuk 120 pcs KMJ-01 (Jahit)"
            match = re.search(r'Masuk (\d+) pcs (.*?) \(Jahit\)', ket)
            if match:
                qty_jahit = int(match.group(1))
                nama_sku = match.group(2).strip()
                data_jahit.append({
                    "Nama SKU": nama_sku, 
                    "Total Masuk Jahit": qty_jahit
                })

        df_jahit = pd.DataFrame(data_jahit)
        if not df_jahit.empty:
            # Kelompokkan berdasarkan Nama SKU
            df_jahit = df_jahit.groupby("Nama SKU")["Total Masuk Jahit"].sum().reset_index()
        else:
            df_jahit = pd.DataFrame(columns=["Nama SKU", "Total Masuk Jahit"])

        # ==========================================
        # 3. GABUNGKAN & HITUNG SISA (MATEMATIKA PANDAS)
        # ==========================================
        if df_cutting.empty and df_jahit.empty:
            st.info("Belum ada data produksi (Cutting/Jahit) yang tercatat.")
        else:
            # Outer Join agar barang yang baru di-cutting (belum ada jahit) tetap muncul
            df_wip = pd.merge(df_cutting, df_jahit, on="Nama SKU", how="outer")
            
            # Ubah nilai NaN (kosong) menjadi 0
            df_wip = df_wip.fillna(0)
            
            # Logika Perhitungan: Sisa Kain Siap Jahit
            df_wip["Sisa Belum Dijahit"] = df_wip["Total Potong"] - df_wip["Total Masuk Jahit"]
            
            # Rapikan format angka menjadi integer utuh
            df_wip["Total Potong"] = df_wip["Total Potong"].astype(int)
            df_wip["Total Masuk Jahit"] = df_wip["Total Masuk Jahit"].astype(int)
            df_wip["Sisa Belum Dijahit"] = df_wip["Sisa Belum Dijahit"].astype(int)

            # (Opsional) Filter hanya menampilkan yang sisa belum dijahitnya lebih dari 0
            # df_wip = df_wip[df_wip["Sisa Belum Dijahit"] > 0]

            # ==========================================
            # 4. TAMPILKAN KE UI STREAMLIT
            # ==========================================
            st.dataframe(
                df_wip, 
                use_container_width=True,
                hide_index=True,
                column_config={
                    "Nama SKU": st.column_config.TextColumn("Nama SKU / Barang"),
                    "Total Potong": st.column_config.NumberColumn("Total Potong (Pcs)"),
                    "Total Masuk Jahit": st.column_config.NumberColumn("Total Masuk Jahit (Pcs)"),
                    "Sisa Belum Dijahit": st.column_config.NumberColumn(
                        "Sisa Belum Dijahit (Pcs)",
                        help="Hasil dari: Total Potong - Total Masuk Jahit"
                    )
                }
            )

    except Exception as e:
        st.error(f"Terjadi kesalahan saat memproses data: {str(e)}")
    finally:
        db.close()

# Panggil fungsi ini jika disatukan di file utama
if __name__ == "__main__":
    tampilkan_wip_cutting()