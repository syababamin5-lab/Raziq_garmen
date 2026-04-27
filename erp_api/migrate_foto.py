import sqlite3
import os

db_path = r"d:\sistem_garmen\erp_api\garmen.db"

def migrate():
    if not os.path.exists(db_path):
        print("Database not found")
        return
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN foto_url TEXT")
        print("Column foto_url added to users table")
    except sqlite3.OperationalError as e:
        print(f"Error or column already exists: {e}")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
