import os
import datetime
import sqlite3

dbs = [
    r"D:\sistem_garmen_v2\garmen.db",
    r"D:\sistem_garmen_v2\erp_api\garmen.db"
]

now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
keterangan = "[KONSOLIDASI_SISTEM] Migrasi saldo produksi lama ke sistem WIP Perpetual (Clean-Up Laporan)"

for db_path in dbs:
    if not os.path.exists(db_path):
        continue
        
    print(f"\n--- Migrating {db_path} ---")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Ambil Saldo
        cursor.execute("SELECT SUM(debit - kredit) FROM jurnal_umum WHERE kode_akun LIKE '5111%'")
        baku_bal = cursor.fetchone()[0] or 0
        cursor.execute("SELECT SUM(debit - kredit) FROM jurnal_umum WHERE kode_akun LIKE '512%'")
        btkl_bal = cursor.fetchone()[0] or 0
        cursor.execute("SELECT SUM(debit - kredit) FROM jurnal_umum WHERE kode_akun LIKE '51199%'")
        ikh_bal = cursor.fetchone()[0] or 0
        
        print(f"Balances: Bahan={baku_bal}, BTKL={btkl_bal}, Ikhtisar={ikh_bal}")
        
        if baku_bal == 0 and btkl_bal == 0 and ikh_bal == 0:
            print("Already migrated or no data.")
            conn.close()
            continue

        # A. Bahan -> WIP
        if baku_bal != 0:
            cursor.execute("INSERT INTO jurnal_umum (tanggal, kode_akun, nama_akun, keterangan, debit, kredit) VALUES (?, '12130', 'Persediaan Barang Dalam Proses (WIP)', ?, ?, 0)", (now, f"{keterangan} - Bahan", baku_bal))
            cursor.execute("INSERT INTO jurnal_umum (tanggal, kode_akun, nama_akun, keterangan, debit, kredit) VALUES (?, '51110', 'Beban Bahan Baku', ?, 0, ?)", (now, f"{keterangan} - Penyesuaian", baku_bal))

        # B. BTKL -> WIP
        if btkl_bal != 0:
            cursor.execute("INSERT INTO jurnal_umum (tanggal, kode_akun, nama_akun, keterangan, debit, kredit) VALUES (?, '12130', 'Persediaan Barang Dalam Proses (WIP)', ?, ?, 0)", (now, f"{keterangan} - Upah", btkl_bal))
            cursor.execute("INSERT INTO jurnal_umum (tanggal, kode_akun, nama_akun, keterangan, debit, kredit) VALUES (?, '51210', 'Beban Tenaga Kerja Langsung', ?, 0, ?)", (now, f"{keterangan} - Penyesuaian", btkl_bal))

        # C. Ikhtisar -> WIP
        if ikh_bal != 0:
            cursor.execute("INSERT INTO jurnal_umum (tanggal, kode_akun, nama_akun, keterangan, debit, kredit) VALUES (?, '51199', 'Ikhtisar Produksi', ?, ?, 0)", (now, f"{keterangan} - Closing", abs(ikh_bal)))
            cursor.execute("INSERT INTO jurnal_umum (tanggal, kode_akun, nama_akun, keterangan, debit, kredit) VALUES (?, '12130', 'Persediaan Barang Dalam Proses (WIP)', ?, 0, ?)", (now, f"{keterangan} - Transfer Output", abs(ikh_bal)))

        conn.commit()
        print("MIGRATION SUCCESSFUL")
        conn.close()
    except Exception as e:
        print(f"Error migrating {db_path}: {e}")
