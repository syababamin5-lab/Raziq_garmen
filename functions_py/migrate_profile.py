import sqlite3
import os

db_path = r"d:\sistem_garmen\erp_api\garmen.db"

def migrate():
    if not os.path.exists(db_path):
        print("Database not found")
        return
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    for col in ["email", "no_hp"]:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col} TEXT")
            print(f"Column {col} added to users table")
        except sqlite3.OperationalError:
            print(f"Column {col} already exists")
            
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
