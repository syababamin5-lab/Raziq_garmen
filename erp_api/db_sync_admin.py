import os
from sqlalchemy import create_engine, text
from models import SQLALCHEMY_DATABASE_URL

def sync_db():
    print(f"Connecting to: {SQLALCHEMY_DATABASE_URL.split('@')[-1] if '@' in SQLALCHEMY_DATABASE_URL else SQLALCHEMY_DATABASE_URL}")
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    columns_to_add = [
        ('ttd_admin_nama', 'VARCHAR(255)', "'Admin Keuangan'"),
        ('ttd_admin_jabatan', 'VARCHAR(255)', "'Administrasi'")
    ]
    
    with engine.connect() as conn:
        for col_name, col_type, default_val in columns_to_add:
            try:
                # Cek apakah kolom sudah ada (khusus Postgres/SQLite)
                if "postgresql" in SQLALCHEMY_DATABASE_URL:
                    query = text(f"ALTER TABLE company_config ADD COLUMN {col_name} {col_type} DEFAULT {default_val}")
                else:
                    query = text(f"ALTER TABLE company_config ADD COLUMN {col_name} {col_type}")
                
                conn.execute(query)
                conn.commit()
                print(f"✅ Column {col_name} added successfully.")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                    print(f"ℹ️ Column {col_name} already exists, skipping.")
                else:
                    print(f"❌ Error adding {col_name}: {e}")

if __name__ == "__main__":
    sync_db()
