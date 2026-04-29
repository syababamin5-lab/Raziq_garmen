from sqlalchemy import create_engine, text

engine = create_engine('sqlite:///D:/sistem_garmen/erp_api/garmen.db')
with engine.connect() as conn:
    # 1. Update AkunBukuBesar
    conn.execute(text("UPDATE akun_buku_besar SET nama_akun = 'Kas di Bank' WHERE kode_akun = '11120'"))
    conn.execute(text("UPDATE akun_buku_besar SET nama_akun = 'Modal Disetor' WHERE kode_akun = '31110'"))
    
    # Check if 21210 exists, if not add it
    res = conn.execute(text("SELECT * FROM akun_buku_besar WHERE kode_akun = '21210'")).fetchone()
    if not res:
        conn.execute(text("INSERT INTO akun_buku_besar (kode_akun, nama_akun, kategori) VALUES ('21210', 'Utang Gaji & Upah', 'Kewajiban')"))
    
    # 2. Update existing JurnalUmum to standardize names based on code
    conn.execute(text("UPDATE jurnal_umum SET nama_akun = 'Kas di Bank' WHERE kode_akun = '11120'"))
    conn.execute(text("UPDATE jurnal_umum SET nama_akun = 'Modal Disetor' WHERE kode_akun = '31110'"))
    conn.execute(text("UPDATE jurnal_umum SET nama_akun = 'Kas Tunai' WHERE kode_akun = '11110'"))
    conn.execute(text("UPDATE jurnal_umum SET nama_akun = 'BOP - Pemakaian Bahan Penolong & Packing' WHERE kode_akun = '51320'"))
    
    conn.commit()
print('Database Cleanup & Standardization Success!')
