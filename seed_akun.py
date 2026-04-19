from database import SessionLocal
from models import AkunBukuBesar

def tanam_akun_otomatis():
    db = SessionLocal()
    
    # Daftar LENGKAP Akun Sistem (1, 2, 3, 4) + Beban (5, 6)
    daftar_akun_lengkap = [
        # --- KELOMPOK 1: ASET (Harta) ---
        {"kode": "11110", "nama": "Kas Tunai", "kategori": "Aset"},
        {"kode": "11120", "nama": "Bank", "kategori": "Aset"},
        {"kode": "11210", "nama": "Piutang Usaha", "kategori": "Aset"},
        {"kode": "11220", "nama": "Piutang Karyawan", "kategori": "Aset"},
        {"kode": "12110", "nama": "Persediaan Bahan Baku (Kain)", "kategori": "Aset"},
        {"kode": "12120", "nama": "Persediaan Bahan Penolong", "kategori": "Aset"},
        {"kode": "12150", "nama": "Persediaan Barang Jadi", "kategori": "Aset"},
        {"kode": "13110", "nama": "Tanah & Bangunan", "kategori": "Aset"},
        {"kode": "13120", "nama": "Akumulasi Penyusutan Bangunan", "kategori": "Aset"},
        {"kode": "13210", "nama": "Mesin Produksi & Peralatan", "kategori": "Aset"},
        {"kode": "13220", "nama": "Akumulasi Penyusutan Mesin", "kategori": "Aset"},
        {"kode": "13310", "nama": "Kendaraan Operasional", "kategori": "Aset"},
        {"kode": "13320", "nama": "Akumulasi Penyusutan Kendaraan", "kategori": "Aset"},
        {"kode": "13410", "nama": "Furniture & Inventaris Kantor", "kategori": "Aset"},
        {"kode": "13420", "nama": "Akumulasi Penyusutan Furniture", "kategori": "Aset"},
        
        # --- KELOMPOK 2: KEWAJIBAN (Utang) ---
        {"kode": "21110", "nama": "Utang Usaha", "kategori": "Kewajiban"},
        
        # --- KELOMPOK 3: EKUITAS (Modal) ---
        {"kode": "31110", "nama": "Modal Disetor Pemilik", "kategori": "Ekuitas"},
        
        # --- KELOMPOK 4: PENDAPATAN ---
        {"kode": "41110", "nama": "Pendapatan Penjualan", "kategori": "Pendapatan"},
        {"kode": "41120", "nama": "Retur Penjualan", "kategori": "Pendapatan"},
        
        # --- KELOMPOK 5 & 6: HARGA POKOK & BEBAN ---
        {"kode": "51110", "nama": "Pemakaian Bahan Baku", "kategori": "Beban"},
        {"kode": "51120", "nama": "Harga Pokok Penjualan (HPP)", "kategori": "Beban"},
        {"kode": "51199", "nama": "Ikhtisar Produksi", "kategori": "Beban"},
        
        # (Beban Opex yang tadi sudah kita masukkan)
        {"kode": "51210", "nama": "BTKL - Upah Cutting", "kategori": "Beban"},
        {"kode": "51220", "nama": "BTKL - Upah Jahit / Makloon", "kategori": "Beban"},
        {"kode": "51230", "nama": "BTKL - Upah QC & Finishing", "kategori": "Beban"},
        {"kode": "51310", "nama": "BOP - Jasa Sablon / Makloon Luar", "kategori": "Beban"},
        {"kode": "51320", "nama": "BOP - Pemakaian Bahan Penolong & Packing", "kategori": "Beban"},
        {"kode": "51330", "nama": "BOP - Listrik, Air, Gas & BBM Pabrik", "kategori": "Beban"},
        {"kode": "51340", "nama": "BOP - Pemeliharaan & Sparepart Mesin Pabrik", "kategori": "Beban"},
        {"kode": "51350", "nama": "BOP - Beban Penyusutan Pabrik", "kategori": "Beban"},
        {"kode": "51390", "nama": "BOP - Asuransi & Biaya Pabrik Lainnya", "kategori": "Beban"},
        {"kode": "61110", "nama": "Beban Gaji Pemasaran & Komisi", "kategori": "Beban"},
        {"kode": "61120", "nama": "Beban Iklan & Promosi", "kategori": "Beban"},
        {"kode": "61130", "nama": "Beban Ongkos Kirim / Ekspedisi ke Customer", "kategori": "Beban"},
        {"kode": "62110", "nama": "Beban Gaji Admin & Umum", "kategori": "Beban"},
        {"kode": "62120", "nama": "Beban ATK & Konsumsi Kantor", "kategori": "Beban"},
        {"kode": "62130", "nama": "Beban Komunikasi & Internet", "kategori": "Beban"},
        {"kode": "62140", "nama": "Beban Perjalanan Dinas & Transport Kantor", "kategori": "Beban"},
        {"kode": "62150", "nama": "Beban Listrik, Air & Keamanan Kantor", "kategori": "Beban"},
        {"kode": "62160", "nama": "Beban Sewa, Pajak & Retribusi", "kategori": "Beban"},
        {"kode": "62170", "nama": "Beban Penyusutan Aset Kantor", "kategori": "Beban"},
        {"kode": "62180", "nama": "Beban Subscription Digital", "kategori": "Beban"},
        {"kode": "62190", "nama": "Beban Lain-lain", "kategori": "Beban"}
    ]

    jumlah_masuk = 0
    for data in daftar_akun_lengkap:
        cek = db.query(AkunBukuBesar).filter(AkunBukuBesar.kode_akun == data["kode"]).first()
        if not cek:
            akun_baru = AkunBukuBesar(
                kode_akun=data["kode"], 
                nama_akun=data["nama"], 
                kategori=data["kategori"]
            )
            db.add(akun_baru)
            jumlah_masuk += 1

    db.commit()
    db.close()
    
    print(f"✅ SUKSES! {jumlah_masuk} Akun baru berhasil ditanam ke database.")

if __name__ == "__main__":
    tanam_akun_otomatis()