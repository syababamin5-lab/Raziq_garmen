import models
from sqlalchemy import text
from models import SessionLocal

def force_migrate_tenant_id():
    db = SessionLocal()
    target_tables = [
        "barang", "mitra", "karyawan", "header_penjualan", "detail_penjualan",
        "header_pembelian", "detail_pembelian", "production_logs", "wip_saldo_awal",
        "jurnal_umum", "akun_buku_besar", "users", "user_logs", "company_config",
        "chat_messages", "menu_registry"
    ]
    
    print("FORCING DATA CONSISTENCY...")
    for table in target_tables:
        try:
            # 1. Pastikan kolom ada
            try:
                db.execute(text(f"ALTER TABLE {table} ADD COLUMN tenant_id INTEGER DEFAULT 1"))
                db.commit()
            except:
                db.rollback()
            
            # 2. Paksa UPDATE NULL menjadi 1
            db.execute(text(f"UPDATE {table} SET tenant_id = 1 WHERE tenant_id IS NULL OR tenant_id = 0"))
            db.commit()
            
            # 3. Paksa is_active = 1 jika ada kolom tersebut
            try:
                db.execute(text(f"UPDATE {table} SET is_active = 1 WHERE is_active IS NULL"))
                db.commit()
            except:
                db.rollback()
                
            print(f"Table {table}: Cleaned.")
        except Exception as e:
            print(f"Error in table {table}: {e}")
            db.rollback()

    db.close()
    print("ALL DATA CONSISTENCY FIXED.")

if __name__ == "__main__":
    force_migrate_tenant_id()
