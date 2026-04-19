from database import SessionLocal
from models import Barang, KategoriBarang

db = SessionLocal()

# Data kaos
data_kaos = [
    ("EMB-01", "Embos M", "EMB-01M", 270000), ("EMB-01", "Embos L", "EMB-01L", 270000),
    ("EMB-01", "Embos XL", "EMB-01XL", 270000), ("EMB-01", "Embos XXL", "EMB-01XXL", 270000),
    ("F-004", "Fashion pendek 04", "F-04", 270000), ("F-009", "Fashion pendek 09", "F-09", 270000),
    ("F-012", "Fashion pendek 12", "F-12", 270000), ("FLO-01", "Floking tulisan", "FLO-01", 270000),
    ("FLO-01", "Floking Tulisan M", "FLO-01M", 270000), ("FLO-01", "Floking tulisan L", "FLO-01L", 270000),
    ("FLO-01", "Floking tulisan XL", "FLO-01XL", 270000), ("FLO-01", "Floking Tulisan XXL", "FLO-01XXL", 270000),
    ("FLO-02", "Floking logo M", "FLO-02M", 270000), ("FLO-02", "Floking Logo L", "FLO-02L", 270000),
    ("FLO-02", "Floking logo Xl", "FLO-02XL", 270000), ("FLO-02", "Floking logo XXL", "FLO-02XXL", 270000),
    ("JAKET", "Jaket bang Rahesh", "JAKET-JKT", 0),
    ("KK-02", "Kemeja Kantong Hitam", "KK-JB", 800000), ("KK-02", "Kemeja Kantong Putih", "KK-PN", 800000),
    ("KK-02", "Kemej Kantong Light Brown", "KK-LB", 800000), ("KK-02", "Kemeja Kanring Steal Blue", "KK-SB", 800000),
    ("KK-02", "Kemeja kancing Navy", "KK-NV", 800000), ("KKJ-01", "Kemeja kerah jas maroon", "KKJ-MR", 804000),
    ("KKJ-01", "Kemeja kerah jas navy", "KKJ-NV", 804000), ("KKJ-01", "Kemeja kerah jas Hitam", "KKJ-JB", 804000),
    ("KKJ-01", "Kemeja kerah jas putih", "KKJ-PT", 804000), ("KKJ-01", "Kemeja kerah jas Beigi", "KKJ-01-K-BG", 804000),
    ("KKJ-01", "Kemeja Kerah jas Tofee", "KKJ-01-K-TF", 804000), ("KKJ-01", "Kemeja kerah jas steal blue", "KKJ-01-K-SB", 804000),
    ("KKJ-01", "Kemeja kerah jas light brown", "KKJ-01-K-LL", 804000), ("KKJ-02", "KKJ -02 Tofee", "KKJ-02-KJ-TF", 840000),
    ("KKJ-02", "KKJ-02 Hitam", "KKJ-02-KJ-JB", 840000), ("KKJ-02", "KKJ-02 Putih", "KKJ-02-KJ-PN", 840000),
    ("KKJ-02", "KKJ-02 Light Brown", "KKJ-02-KJ-LB", 840000), ("KKJ-02", "kkj-02 steal blue", "KKJ-02-KJ-SB", 840000),
    ("KKJ-02", "KKJ-02 Navy", "KKJ-02-KJ-NV", 840000), ("KKJ-MTF", "Kemeja kerah jas motif", "KKJ-MTF-K", 780000),
    ("KR-09", "Kerah Lacoste Sky Blue", "KR-SB", 520000), ("KR-09", "Kerah Lacoste Navy", "KR-NV", 520000),
    ("KR-09", "Kerah Lacoste Army", "KR-ARM", 520000), ("OVS-01 MFR", "Oversize 01 Micro Fiber Roman Hitam", "OVS-01-MFR-JBR", 840000),
    ("OVS-01 MFR", "Oversize 01 Micro Fiber Roman navy", "OVS-01-MFR-NVR", 840000), ("OVS-01 MFR", "Oversize 01 Micro Fiber Roman khaki", "OVS-01-MFR-KKR", 840000),
    ("OVS-07", "Oversize 07 Olive", "OVS-07-OL", 520000), ("OVS-07", "Oversize 07 Sage", "OVS-07-SG", 520000),
    ("OVS-07", "Oversize 07 Dusty Blue", "OVS-07-DB", 520000), ("OVS-07", "Oversize 07 Jet Black", "OVS-07-JB", 520000),
    ("OVS-07", "Oversize 07 Tofee", "OVS-07-TF", 520000), ("OVS-07", "Oversize 07 Navy", "OVS-07-NV", 520000),
    ("OVS-07", "Oversize 07 Putih", "OVS-07-PT", 520000), ("OVS-07", "Oversize 07 Maplle", "OVS-07-MP", 520000),
    ("OVS-07", "Oversize 07 Mineral green", "OVS-07-MG", 520000), ("OVS-07", "Oversize 07 Coksu", "OVS-07-CS", 520000),
    ("OVS-07", "Oversize 07 Cinnamon", "OVS-07-CN", 520000), ("OVS-07", "Oversize 07 Mineral Blue", "OVS-07-MB", 520000),
    ("OVS-07", "Oversize 07 Abu tua", "OVS-07-AT", 520000), ("OVS-07", "Oversize 07 Almond", "OVS-07-AMD", 520000),
    ("OVS-07", "Oversize 07 Beigi", "OVS-07-BG", 520000), ("OVS-07", "Oversize 07 LightLatte", "OVS-07-LL", 520000),
    ("OVS-07K", "Oversize 07K Hitam", "OVS-07K-JB", 390000), ("OVS-07K", "Oversize 07k Putih", "OVS-07K-PT", 390000),
    ("OVS-07K", "Oversize 07k Mineral green", "OVS-07K-MG", 390000), ("OVS-07K", "Oversize 07k Navy", "OVS-07K-NV", 390000),
    ("OVS-07K", "Oversize 07k Coklat susu", "OVS-07K-CS", 390000), ("OVS-07K", "Oversize 07k Mineral Blue", "OVS-07K-MB", 390000),
    ("OVS-07K", "Oversize 07k Cinnamon", "OVS-07K-CN", 390000), ("OVS-07K", "Oversize 07k Hijau Botol", "OVS-07K-HB", 390000),
    ("OVS-07K", "Oversize 07k Olive", "OVS-07K-OL", 390000), ("OVS-07K", "Oversize 07k Abu tua", "OVS-07K-AT", 390000),
    ("OVS-07K", "Oversize 07k Dusty Blue", "OVS-07K-DB", 390000), ("OVS-07K", "Oversize 07k Tofee", "OVS-07K-TF", 390000),
    ("OVS-07T", "Oversize 07T Hitam", "OVS-07T-JB", 520000), ("OVS-07T", "Oversize 07T Putih Netral", "OVS-07T-PN", 520000),
    ("OVS-08", "Oversize 08 Jet black", "OVS-08-JB", 520000), ("OVS-08", "Oversize 08 Tofee", "OVS-08-TF", 520000),
    ("OVS-08", "Oversize 08 Mineral green", "OVS-08-MG", 520000), ("OVS-08", "Oversize 08 Navy", "OVS-08-NV", 520000),
    ("OVS-08", "Oversize 08 Olive", "OVS-08-OL", 520000), ("OVS-08", "Oversize 08 Beigi", "OVS-08-BG", 520000),
    ("OVS-08", "Oversize 08 Abu tua", "OVS-08-AT", 520000), ("OVS-08", "Oversize 08 Putih", "OVS-08-PT", 520000),
    ("OVS-08", "Oversize 08 Sage", "OVS-08-SG", 520000), ("OVS-08", "Oversize 08 Maple", "OVS-08-MP", 520000),
    ("OVS-08", "Oversize 08 Cinnamon", "OVS-08-CN", 520000), ("OVS-08", "Oversize 08 Mineral Blue", "OVS-08-MB", 520000),
    ("OVS-08", "Oversize 08 almond", "OVS-08-AMD", 520000), ("OVS-08", "Oversize 08 coksu", "OVS-08-CS", 520000),
    ("OVS-08", "Oversize 08 Dusty blue", "OVS-08-DB", 520000), ("OVS-08K", "Oversize 08k Hitam", "OVS-08K-JB", 390000),
    ("OVS-08K", "Oversize 08k Putih", "OVS-08K-PT", 390000), ("OVS-08K", "Oversize 08k Coksu", "OVS-08K-CS", 390000),
    ("OVS-08K", "Oversize 08k Mineral green", "OVS-08K-MG", 390000), ("OVS-08K", "Oversize 08k Navy", "OVS-08K-NV", 390000),
    ("OVS-08K", "Oversize 08k Tofee", "OVS-08K-TF", 390000), ("OVS-14", "Oversize 14 Navy", "OVS-14-NV", 500000),
    ("OVS-14", "Oversize 14 Tofee", "OVS-14-TF", 500000), ("OVS-14", "Oversize 14 Jet black", "OVS-14-JB", 500000),
    ("OVS-14", "Oversize 14 Putih", "OVS-14-PT", 500000), ("OVS-14", "Oversize 14 Olive", "OVS-14-OL", 500000),
    ("OVS-14", "Oversize 14 Abu tua", "OVS-14-AT", 500000), ("OVS-14", "Oversize 14 Almond", "OVS-14-AMD", 500000),
    ("OVS-14", "Oversize 14 Dusty Blue", "OVS-14-DB", 500000), ("OVS-14", "Oversize 14 Beigi", "OVS-14-BG", 500000),
    ("OVS-14", "Oversize 14 Sage", "OVS-14-SG", 500000), ("OVS-14", "Oversize 14 Maple", "OVS-14-MP", 500000),
    ("OVS-14", "Oversize 14 Mineral Blue", "OVS-14-MB", 500000), ("OVS-14", "Oversize 14 Cinnamon", "OVS-14-CN", 500000),
    ("OVS-14", "Oversize 14 Light latte", "OVS-14-LT", 500000), ("OVS-14", "Oversize 14 Mineral Green", "OVS-14-MG", 500000),
    ("OVS-14", "Oversize 14 coksu", "OVS-14-CS", 500000), ("OVS-14MF", "Oversize polos Micro fiber Hitam", "OVS-14MF-JB", 840000),
    ("OVS-14MF", "Oversize polos Micro fiber Putih", "OVS-14MF-PT", 840000), ("OVS-14MF", "Oversize polos Micro fiber Abu tua", "OVS-14MF-AT", 840000),
    ("OVS-14MF", "Oversize polos Micro Fiber Sage", "OVS-14MF-SG", 840000), ("OVS-14MF", "Oversize polos Micro fiber Navy", "OVS-14MF-NV", 840000),
    ("OVS-14MF", "Oversize polos Micro fiber Khaki", "OVS-14MF-KK", 840000), ("OVS-18", "Oversize 18 Putih", "OVS-18-PT", 520000),
    ("OVS-18", "Oversize 18 Olive", "OVS-18-OL", 520000), ("OVS-18", "Oversize 18 Navy", "OVS-18-NV", 520000),
    ("OVS-18", "Oversize 18 Maple", "OVS-18-MP", 520000), ("OVS-33", "Oversize 33 Hitam", "OVS-33-JB", 520000),
    ("OVS-33", "Oversize 33 Putih", "OVS-33-PT", 520000), ("OVS-33", "Oversize 33 Navy", "OVS-33-NV", 520000),
    ("OVS-33", "Oversize 33 Cinnamon", "OVS-33-CN", 520000), ("OVS-33", "Oversize 33 Mineral green", "OVS-33-MG", 520000),
    ("OVS-33", "Oversize 33 Almond", "OVS-33-AMD", 520000), ("OVS-33", "Oversize 33 Dusty Blue", "OVS-33-DB", 520000),
    ("OVS-33", "Oversize 33 Beigi", "OVS-33-BG", 520000), ("OVS-33", "Oversize 33 tofee", "OVS-33-TF", 520000),
    ("OVS-33", "Oversize 33 Abu tua", "OVS-33-AT", 520000), ("OVS-33", "Oversize 33 Olive", "OVS-33-OL", 520000),
    ("OVS-33", "Oversize 33 coksu", "OVS-33-CS", 520000), ("OVS-33", "Oversize 33 Mineral Blue", "OVS-33-MB", 520000),
    ("OVS-33", "Oversize 33 sage", "OVS-33-SG", 520000), ("OVS-33", "Oversize 33 Light Latte", "OVS-33-LL", 520000),
    ("OVS-33K", "Oversize 33k Hitam", "OVS-33K-JB", 390000), ("OVS-33K", "Oversize 33k Putih", "OVS-33K-PT", 390000),
    ("OVS-33K", "Oversize 33k Coksu", "OVS-33K-CS", 390000), ("OVS-33K", "Oversize 33k Mineral green", "OVS-33K-MG", 390000),
    ("OVS-33K", "Oversize 33k Navy", "OVS-33K-NV", 390000), ("OVS-33K", "Oversize 33k Tofee", "OVS-33K-TF", 390000),
    ("OVS-33K", "Oversize 33k Mineral Blue", "Ovs-33K-MB", 390000), ("OVS-34", "Oversize bordir jet black", "OVS-34-JB", 700000),
    ("OVS-34", "Oversize bordir Tannin", "OVS-34-TN", 700000), ("OVS-K", "Oversize kerah hitam", "OVS-K-JB", 390000),
    ("OVS-K", "Oversize kerah Putih", "OVS-K-PT", 390000), ("OVS-K", "Oversize kerah Navy", "OVS-K-NV", 390000),
    ("OVS-MTF", "Oversize Motif", "OVS-MTF", 500000), ("OVS-SLR", "Oversize Salur", "OVS-SLR-02", 530000)
]

print("Mulai mengimpor data...")
for model, nama, sku, harga in data_kaos:
    # Cek SKU agar tidak error duplikat
    cek_barang = db.query(Barang).filter(Barang.kode_sku == sku).first()
    if not cek_barang:
        baru = Barang(model_code=model, nama_barang=nama, kode_sku=sku, harga_jual=harga, kategori=KategoriBarang.BARANG_JADI, satuan="Pcs")
        db.add(baru)

db.commit()
print(f"Selesai! {len(data_kaos)} SKU berhasil dimasukkan ke database.")
db.close()