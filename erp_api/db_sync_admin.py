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

        # 3. DATA REPAIR: Restore SKU OVS-08-JB & Cleanup Bad Journals
        try:
            sku = "OVS-08-JB"
            print(f"--- Running Data Repair for {sku} ---")
            
            # Check if SKU exists (case insensitive for safety)
            res = conn.execute(text("SELECT id, is_active FROM barang WHERE UPPER(kode_sku) = :sku"), {"sku": sku.upper()}).first()
            
            if res:
                if res.is_active == 0:
                    conn.execute(text("UPDATE barang SET is_active = 1 WHERE id = :id"), {"id": res.id})
                    conn.commit()
                    print(f"✅ Reactivated SKU {sku}")
            else:
                # Re-create if missing
                conn.execute(text("""
                    INSERT INTO barang (model_code, nama_barang, kode_sku, kategori, satuan, stok_saat_ini, harga_jual, harga_modal, is_active) 
                    VALUES ('OVS-08', 'Oversize 08 Jet black', :sku, 'Barang Jadi (Baju)', 'Pcs', 0, 520000, 39405, 1)
                """), {"sku": sku})
                conn.commit()
                print(f"✅ Re-created missing SKU {sku}")
                
            # Cleanup problematic VOID journals that doubled the WIP minus
            # This will allow the new get_wip logic to work with clean data
            conn.execute(text("DELETE FROM jurnal_umum WHERE keterangan LIKE '%VOID%' AND keterangan LIKE :sku_p"), {"sku_p": f"%{sku}%"})
            conn.commit()
            print(f"✅ Cleaned up problematic VOID journals for {sku}")
            
        except Exception as e:
            print(f"ℹ️ Data Repair Info: {e}")

if __name__ == "__main__":
    sync_db()
