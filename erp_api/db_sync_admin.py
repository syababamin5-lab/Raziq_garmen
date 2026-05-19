import os
import datetime
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
                print(f"[OK] Column company_config.{col_name} checked/added.")
            except Exception as e:
                print(f"[INFO] Info on company_config.{col_name}: {e}")
 
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
                print(f"[OK] Column users.{col_name} checked/added.")
            except Exception as e:
                print(f"[INFO] Info on users.{col_name}: {e}")
 
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
                print(f"[OK] Column production_logs.{col_name} checked/added.")
            except Exception as e:
                print(f"[INFO] Info on production_logs.{col_name}: {e}")
 
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
            print(f"[INFO] WIP Sync Info: {e}")
 
        # 5. KONSOLIDASI SALDO LAMA (51199, 5111, 512 -> 12130)
        try:
            print("--- Menjalankan Konsolidasi Saldo Produksi Lama ---")
            # Ambil saldo
            baku_bal = conn.execute(text("SELECT SUM(debit - kredit) FROM jurnal_umum WHERE kode_akun LIKE '5111%'")).scalar() or 0
            btkl_bal = conn.execute(text("SELECT SUM(debit - kredit) FROM jurnal_umum WHERE kode_akun LIKE '512%'")).scalar() or 0
            ikh_bal = conn.execute(text("SELECT SUM(debit - kredit) FROM jurnal_umum WHERE kode_akun LIKE '51199%'")).scalar() or 0
 
            # Toleransi kecil untuk floating point
            if abs(baku_bal) > 1 or abs(btkl_bal) > 1 or abs(ikh_bal) > 1:
                print(f"Ditemukan saldo lama: Bahan={baku_bal}, BTKL={btkl_bal}, Ikhtisar={ikh_bal}")
                tgl = datetime.datetime.now()
                ket = "[KONSOLIDASI_SISTEM] Migrasi saldo produksi lama ke sistem WIP Perpetual (Railway-Sync)"
 
                # A. Pindahkan Bahan (5111) ke WIP (12130)
                if abs(baku_bal) > 1:
                    conn.execute(text("INSERT INTO jurnal_umum (tanggal, kode_akun, nama_akun, keterangan, debit, kredit) VALUES (:t, '12130', 'Persediaan Barang Dalam Proses (WIP)', :k, :d, 0)"), {"t": tgl, "k": f"{ket} - Bahan", "d": baku_bal})
                    conn.execute(text("INSERT INTO jurnal_umum (tanggal, kode_akun, nama_akun, keterangan, debit, kredit) VALUES (:t, '51110', 'Beban Bahan Baku', :k, 0, :c)"), {"t": tgl, "k": f"{ket} - Penyesuaian", "c": baku_bal})
 
                # B. Pindahkan BTKL (512) ke WIP (12130)
                if abs(btkl_bal) > 1:
                    conn.execute(text("INSERT INTO jurnal_umum (tanggal, kode_akun, nama_akun, keterangan, debit, kredit) VALUES (:t, '12130', 'Persediaan Barang Dalam Proses (WIP)', :k, :d, 0)"), {"t": tgl, "k": f"{ket} - Upah", "d": btkl_bal})
                    conn.execute(text("INSERT INTO jurnal_umum (tanggal, kode_akun, nama_akun, keterangan, debit, kredit) VALUES (:t, '51210', 'Beban Tenaga Kerja Langsung', :k, 0, :c)"), {"t": tgl, "k": f"{ket} - Penyesuaian", "c": btkl_bal})
 
                # C. Nolkan Ikhtisar (51199) -> Masuk ke WIP sebagai Kredit (Output)
                if abs(ikh_bal) > 1:
                    val = abs(ikh_bal)
                    conn.execute(text("INSERT INTO jurnal_umum (tanggal, kode_akun, nama_akun, keterangan, debit, kredit) VALUES (:t, '51199', 'Ikhtisar Produksi', :k, :d, 0)"), {"t": tgl, "k": f"{ket} - Closing", "d": val})
                    conn.execute(text("INSERT INTO jurnal_umum (tanggal, kode_akun, nama_akun, keterangan, debit, kredit) VALUES (:t, '12130', 'Persediaan Barang Dalam Proses (WIP)', :k, 0, :c)"), {"t": tgl, "k": f"{ket} - Transfer Output", "c": val})
 
                conn.commit()
                print("[OK] Konsolidasi Akuntansi Produksi Berhasil.")
        except Exception as e:
            print(f"[INFO] Konsolidasi Info: {e}")
 
        # 6. SANITASI KODE AKUN (Mencegah Double Code di Masa Depan)
        try:
            # Mengubah semua input bahan baku (51110) & upah (51210) menjadi WIP (12130) secara otomatis
            # Ini memastikan tidak ada lagi 'Double Code' antara beban langsung vs WIP.
            conn.execute(text("UPDATE jurnal_umum SET kode_akun = '12130', nama_akun = 'Persediaan Barang Dalam Proses (WIP)' WHERE kode_akun IN ('51110', '51210')"))
            conn.commit()
            print("[OK] Sanitasi Kode Akun Berhasil: Mengarahkan seluruh biaya produksi ke WIP (12130).")
        except Exception as e:
            print(f"[INFO] Sanitasi Info: {e}")
 
        # 7. SINKRONISASI SALDO MITRA DAN KASBON KARYAWAN DENGAN LEDGER
        try:
            print("--- Menjalankan Sinkronisasi Saldo Mitra & Karyawan ke Ledger ---")
            # Ambil semua mitra
            mitras = conn.execute(text("SELECT id, nama_mitra, kategori, saldo_piutang, saldo_utang FROM mitra")).fetchall()
            
            # Ambil semua jurnal piutang (11210) dan hutang (21110) untuk dicocokkan di memori
            jurnals_piutang = conn.execute(text("SELECT keterangan, debit, kredit FROM jurnal_umum WHERE kode_akun = '11210'")).fetchall()
            jurnals_utang = conn.execute(text("SELECT keterangan, debit, kredit FROM jurnal_umum WHERE kode_akun = '21110'")).fetchall()
            
            for m in mitras:
                m_id, name, cat, s_piutang, s_utang = m
                if not name: continue
                name_lower = name.lower()
                
                if cat == "Customer / Klien" or "customer" in cat.lower():
                    # Ambil invoice customer ini
                    invs = conn.execute(text("SELECT no_invoice FROM header_penjualan WHERE nama_customer = :n"), {"n": name}).fetchall()
                    inv_set = {r[0].lower() for r in invs if r[0]}
                    
                    # Hitung saldo piutang dari jurnal
                    saldo_j = 0.0
                    for ket, deb, kre in jurnals_piutang:
                        if not ket: continue
                        ket_lower = ket.lower()
                        match = name_lower in ket_lower
                        if not match:
                            for inv in inv_set:
                                if inv in ket_lower:
                                    match = True
                                    break
                        if match:
                            saldo_j += (float(deb or 0) - float(kre or 0))
                    
                    new_piutang = max(0.0, saldo_j)
                    if abs((s_piutang or 0.0) - new_piutang) > 0.01:
                        conn.execute(text("UPDATE mitra SET saldo_piutang = :v WHERE id = :id"), {"v": new_piutang, "id": m_id})
                        print(f"Updated saldo_piutang {name}: {s_piutang} -> {new_piutang}")
                else:
                    # Ambil PO supplier ini
                    pos = conn.execute(text("SELECT no_po FROM header_pembelian WHERE nama_supplier = :n"), {"n": name}).fetchall()
                    po_set = {r[0].lower() for r in pos if r[0]}
                    
                    # Hitung saldo utang dari jurnal
                    saldo_j = 0.0
                    for ket, deb, kre in jurnals_utang:
                        if not ket: continue
                        ket_lower = ket.lower()
                        match = name_lower in ket_lower
                        if not match:
                            for po in po_set:
                                if po in ket_lower:
                                    match = True
                                    break
                        if match:
                            saldo_j += (float(kre or 0) - float(deb or 0))
                            
                    new_utang = max(0.0, saldo_j)
                    if abs((s_utang or 0.0) - new_utang) > 0.01:
                        conn.execute(text("UPDATE mitra SET saldo_utang = :v WHERE id = :id"), {"v": new_utang, "id": m_id})
                        print(f"Updated saldo_utang {name}: {s_utang} -> {new_utang}")
            
            # Ambil semua karyawan
            karyawans = conn.execute(text("SELECT id, nama_karyawan, saldo_kasbon FROM karyawan")).fetchall()
            jurnals_kasbon = conn.execute(text("SELECT keterangan, debit, kredit FROM jurnal_umum WHERE kode_akun = '11220'")).fetchall()
            
            for k in karyawans:
                k_id, name, s_kasbon = k
                if not name: continue
                name_lower = name.lower()
                
                saldo_j = 0.0
                for ket, deb, kre in jurnals_kasbon:
                    if not ket: continue
                    if name_lower in ket.lower():
                        saldo_j += (float(deb or 0) - float(kre or 0))
                        
                new_kasbon = max(0.0, saldo_j)
                if abs((s_kasbon or 0.0) - new_kasbon) > 0.01:
                    conn.execute(text("UPDATE karyawan SET saldo_kasbon = :v WHERE id = :id"), {"v": new_kasbon, "id": k_id})
                    print(f"Updated saldo_kasbon {name}: {s_kasbon} -> {new_kasbon}")
            
            conn.commit()
            print("[OK] Sinkronisasi Saldo Mitra & Karyawan Berhasil.")
        except Exception as e:
            print(f"[INFO] Sinkronisasi Saldo Mitra & Karyawan Info/Error: {e}")
 
 
if __name__ == "__main__":
    sync_db()
