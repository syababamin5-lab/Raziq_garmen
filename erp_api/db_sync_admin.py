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
        ('ttd_admin_jabatan', 'VARCHAR(255)', "'Administrasi'")
    ]
    
    with engine.connect() as conn:
        for col_name, col_type, default_val in columns_to_add:
            try:
                if "postgresql" in db_url:
                    query = text(f"ALTER TABLE company_config ADD COLUMN IF NOT EXISTS {col_name} {col_type} DEFAULT {default_val}")
                else:
                    query = text(f"ALTER TABLE company_config ADD COLUMN {col_name} {col_type}")
                
                conn.execute(query)
                # Di SQLAlchemy 2.0+ butuh commit manual pada connection
                try:
                    conn.commit()
                except:
                    pass
                print(f"✅ Column {col_name} checked/added.")
            except Exception as e:
                # Untuk SQLite, IF NOT EXISTS mungkin tidak didukung di ADD COLUMN, jadi kita pakai catch
                if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                    print(f"ℹ️ Column {col_name} already exists.")
                else:
                    print(f"❌ Error adding {col_name}: {e}")

if __name__ == "__main__":
    sync_db()
