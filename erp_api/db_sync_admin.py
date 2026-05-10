import os
from sqlalchemy import create_engine, text

def sync_db():
    # Ambil URL dari environment
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        # Fallback ke SQLite lokal jika tidak ada (untuk dev)
        base_dir = os.path.dirname(os.path.abspath(__file__))
        db_url = f"sqlite:///{os.path.join(base_dir, 'garmen.db')}"
    
    # Fix postgres:// vs postgresql://
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    print(f"Connecting for migration...")
    engine = create_engine(db_url)
    
    columns_to_add = [
        ('ttd_admin_nama', 'VARCHAR(255)', "'Admin Keuangan'"),
        ('ttd_admin_jabatan', 'VARCHAR(255)', "'Administrasi'"),
        ('foto_base64', 'TEXT', 'NULL'),
        ('logo_base64', 'TEXT', 'NULL'),
        ('ttd_base64', 'TEXT', 'NULL')
    ]
    
    # Check for specific tables if adding to different ones
    with engine.connect() as conn:
        # 1. Update company_config
        for col_name, col_type, default_val in [
            ('ttd_admin_nama', 'VARCHAR(255)', "'Admin Keuangan'"),
            ('ttd_admin_jabatan', 'VARCHAR(255)', "'Administrasi'"),
            ('logo_base64', 'TEXT', 'NULL'),
            ('ttd_base64', 'TEXT', 'NULL')
        ]:
            try:
                if "postgresql" in db_url:
                    query = text(f"ALTER TABLE company_config ADD COLUMN IF NOT EXISTS {col_name} {col_type} DEFAULT {default_val}")
                else:
                    query = text(f"ALTER TABLE company_config ADD COLUMN {col_name} {col_type}")
                conn.execute(query)
                conn.commit()
                print(f"✅ Column company_config.{col_name} checked/added.")
            except Exception as e:
                print(f"ℹ️ Info on company_config.{col_name}: {e}")

        # 2. Update users
        for col_name, col_type, default_val in [
            ('foto_base64', 'TEXT', 'NULL'),
            ('email', 'VARCHAR(255)', 'NULL'),
            ('no_hp', 'VARCHAR(20)', 'NULL'),
            ('is_active', 'INTEGER', '1')
        ]:
            try:
                if "postgresql" in db_url:
                    query = text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type} DEFAULT {default_val}")
                else:
                    query = text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
                conn.execute(query)
                conn.commit()
                print(f"✅ Column users.{col_name} checked/added.")
            except Exception as e:
                print(f"ℹ️ Info on users.{col_name}: {e}")

        # 3. Update production_logs
        for col_name, col_type, default_val in [
            ('kain_id', 'INTEGER', 'NULL'),
            ('qty_pakai', 'DOUBLE PRECISION', 'NULL'),
            ('karyawan_id', 'INTEGER', 'NULL'),
            ('ongkos_per_pcs', 'DOUBLE PRECISION', '0'),
            ('total_ongkos', 'DOUBLE PRECISION', '0'),
            ('keterangan', 'TEXT', 'NULL')
        ]:
            try:
                if "postgresql" in db_url:
                    query = text(f"ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS {col_name} {col_type} DEFAULT {default_val}")
                else:
                    query = text(f"ALTER TABLE production_logs ADD COLUMN {col_name} {col_type}")
                conn.execute(query)
                conn.commit()
                print(f"✅ Column production_logs.{col_name} checked/added.")
            except Exception as e:
                print(f"ℹ️ Info on production_logs.{col_name}: {e}")

        # 4. WIP SYNC: Pindahkan nilai barang yang sedang antre jahit ke akun 12130 (WIP)
        try:
            print("--- Menjalankan Sinkronisasi WIP ke Buku Besar ---")
            # Ambil sisa WIP fisik (Potong - Jahit)
            res_wip = conn.execute(text("""
                SELECT kode_sku, 
                       SUM(CASE WHEN divisi = 'Cutting' THEN qty_hasil ELSE 0 END) - 
                       SUM(CASE WHEN divisi = 'Jahit' THEN qty_hasil ELSE 0 END) as sisa_wip
                FROM production_logs 
                GROUP BY kode_sku
                HAVING SUM(CASE WHEN divisi = 'Cutting' THEN qty_hasil ELSE 0 END) > 
                       SUM(CASE WHEN divisi = 'Jahit' THEN qty_hasil ELSE 0 END)
            """)).fetchall()

            for sku, sisa_qty in res_wip:
                if not sku: continue
                
                # Cek apakah sudah pernah dimigrasi
                migrated = conn.execute(text("SELECT id FROM jurnal_umum WHERE kode_akun = '12130' AND keterangan LIKE :m"), {"m": f"%[MIGRASI_WIP:{sku}]%"}).first()
                if migrated: continue

                # Estimasi nilai per pcs: Cari total debit di 51110 & 51210 untuk SKU ini
                row_val = conn.execute(text("""
                    SELECT 
                        (SELECT SUM(debit) FROM jurnal_umum WHERE kode_akun = '51110' AND keterangan LIKE :sk_p) as total_bahan,
                        (SELECT SUM(debit) FROM jurnal_umum WHERE kode_akun = '51210' AND keterangan LIKE :sk_p) as total_upah,
                        (SELECT SUM(qty_hasil) FROM production_logs WHERE kode_sku = :sku AND divisi = 'Cutting') as total_qty
                """), {"sku": sku, "sk_p": f"%{sku}%"}).first()

                # Jika tidak ada data histori, gunakan default (Bahan: 35rb, Upah: 1rb) agar angka muncul
                avg_b = (row_val[0] / row_val[2]) if row_val and row_val[2] and row_val[0] else 35000
                avg_u = (row_val[1] / row_val[2]) if row_val and row_val[2] and row_val[1] else 1000
                
                val_bahan = avg_b * sisa_qty
                val_upah = avg_u * sisa_qty

                if val_bahan > 0 or val_upah > 0:
                    print(f"Menyuntikkan WIP untuk {sku}: {sisa_qty} pcs (Bahan: {int(val_bahan)}, Upah: {int(val_upah)})")
                    tgl = datetime.datetime.now()
                    
                    # Entry Bahan
                    conn.execute(text("INSERT INTO jurnal_umum (tanggal, kode_akun, nama_akun, keterangan, debit, kredit) VALUES (:t, '12130', 'Persediaan Barang Dalam Proses (WIP)', :k, :d, 0)"), {"t": tgl, "k": f"Kapitalisasi WIP (Bahan): {sisa_qty} pcs [MIGRASI_WIP:{sku}]", "d": val_bahan})
                    conn.execute(text("INSERT INTO jurnal_umum (tanggal, kode_akun, nama_akun, keterangan, debit, kredit) VALUES (:t, '51110', 'Pemakaian Bahan Baku', :k, 0, :c)"), {"t": tgl, "k": f"Kapitalisasi WIP (Bahan): {sisa_qty} pcs [MIGRASI_WIP:{sku}]", "c": val_bahan})
                    
                    # Entry Upah
                    conn.execute(text("INSERT INTO jurnal_umum (tanggal, kode_akun, nama_akun, keterangan, debit, kredit) VALUES (:t, '12130', 'Persediaan Barang Dalam Proses (WIP)', :k, :d, 0)"), {"t": tgl, "k": f"Kapitalisasi WIP (Upah): {sisa_qty} pcs [MIGRASI_WIP:{sku}]", "d": val_upah})
                    conn.execute(text("INSERT INTO jurnal_umum (tanggal, kode_akun, nama_akun, keterangan, debit, kredit) VALUES (:t, '51210', 'BTKL - Upah Cutting', :k, 0, :c)"), {"t": tgl, "k": f"Kapitalisasi WIP (Upah): {sisa_qty} pcs [MIGRASI_WIP:{sku}]", "c": val_upah})
                    
                    conn.commit()

        except Exception as e:
            print(f"ℹ️ WIP Sync Info: {e}")


if __name__ == "__main__":
    sync_db()
