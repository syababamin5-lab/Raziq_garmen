from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from models import get_db, JurnalUmum, Mitra, Karyawan, CompanyConfig
import models
import pdf_generator
import io
import datetime

router = APIRouter(prefix="/api/reports-mitra", tags=["Laporan Kartu Mitra"])

@router.get("/cetak-kartu")
def cetak_kartu_mitra(
    type: str, # 'hutang' or 'piutang' or 'kasbon'
    mitra_id: int = None,
    db: Session = Depends(get_db)
):
    try:
        config = db.query(CompanyConfig).first()
        
        # Penanda Tangan (No-Code Config)
        n_ttd = config.ttd_laporan_nama if (config and config.ttd_laporan_nama) else (config.nama_pemilik if config else "Yana Taryana")
        j_ttd = config.ttd_laporan_jabatan if (config and config.ttd_laporan_jabatan) else (config.jabatan_pemilik if config else "Direktur Operasional")

        # Tentukan Kode Akun
        if type == 'hutang':
            kode_akun = "21110" # Utang Usaha
            judul = "KARTU HUTANG SUPPLIER"
        elif type == 'piutang':
            kode_akun = "11210" # Piutang Usaha
            judul = "KARTU PIUTANG CUSTOMER"
        else:
            kode_akun = "11220" # Piutang Karyawan (Kasbon)
            judul = "KARTU KASBON KARYAWAN"

        # Ambil Data Mitra
        if mitra_id:
            if type == 'kasbon':
                mitra = db.query(Karyawan).filter(Karyawan.id == mitra_id).first()
                nama_mitra = mitra.nama_karyawan if mitra else "Unknown"
            else:
                mitra = db.query(Mitra).filter(Mitra.id == mitra_id).first()
                nama_mitra = mitra.nama_mitra if mitra else "Unknown"
            
            # Cari Jurnal yang mengandung nama mitra
            jurnals = db.query(JurnalUmum).filter(
                JurnalUmum.kode_akun == kode_akun,
                JurnalUmum.keterangan.contains(nama_mitra)
            ).order_by(JurnalUmum.tanggal.asc()).all()

            # Kalkulasi Saldo Berjalan
            mutasi = []
            running_saldo = 0
            for j in jurnals:
                # Untuk Hutang (Kredit menambah saldo, Debit mengurangi)
                # Untuk Piutang (Debit menambah saldo, Kredit mengurangi)
                if type == 'hutang':
                    running_saldo += (j.kredit - j.debit)
                else:
                    running_saldo += (j.debit - j.kredit)
                
                mutasi.append({
                    "tanggal": j.tanggal,
                    "keterangan": j.keterangan,
                    "debit": j.debit,
                    "kredit": j.kredit,
                    "saldo": running_saldo
                })

            pdf_bytes = pdf_generator.export_kartu_mitra_pdf(
                judul, 
                f"S/D {datetime.datetime.now().strftime('%d %B %Y')}", 
                nama_mitra, 
                mutasi, 
                running_saldo, 
                config, n_ttd, j_ttd
            )
            
            filename = f"Kartu_{type}_{nama_mitra.replace(' ', '_')}.pdf"
            return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"inline; filename={filename}"})
        
        else:
            # TODO: Cetak SEMUA (Bisa dibuat dalam satu PDF panjang atau daftar saldo)
            # Untuk sekarang kita buat daftar saldo ringkas jika tidak ada ID
            return {"success": False, "message": "Pilih Mitra terlebih dahulu untuk cetak kartu detail."}

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {"success": False, "message": str(e)}
@router.get("/cetak-semua")
def cetak_semua_saldo(
    type: str, # 'hutang' or 'piutang' or 'kasbon'
    db: Session = Depends(get_db)
):
    try:
        config = db.query(CompanyConfig).first()
        n_ttd = config.ttd_laporan_nama if (config and config.ttd_laporan_nama) else (config.nama_pemilik if config else "Yana Taryana")
        j_ttd = config.ttd_laporan_jabatan if (config and config.ttd_laporan_jabatan) else (config.jabatan_pemilik if config else "Direktur Operasional")

        rows = []
        grand_total = 0
        
        if type == 'hutang':
            data = db.query(Mitra).filter(Mitra.saldo_utang != 0).all()
            judul = "LAPORAN KUMULATIF HUTANG SUPPLIER"
            label = "Nama Supplier"
            for i, m in enumerate(data):
                rows.append([i+1, m.nama_mitra, m.saldo_utang])
                grand_total += m.saldo_utang
        elif type == 'piutang':
            data = db.query(Mitra).filter(Mitra.saldo_piutang != 0).all()
            judul = "LAPORAN KUMULATIF PIUTANG CUSTOMER"
            label = "Nama Customer"
            for i, m in enumerate(data):
                rows.append([i+1, m.nama_mitra, m.saldo_piutang])
                grand_total += m.saldo_piutang
        else:
            data = db.query(Karyawan).filter(Karyawan.saldo_kasbon != 0).all()
            judul = "LAPORAN KUMULATIF KASBON KARYAWAN"
            label = "Nama Karyawan"
            for i, m in enumerate(data):
                rows.append([i+1, m.nama_karyawan, m.saldo_kasbon])
                grand_total += m.saldo_kasbon

        if not rows:
            return {"success": False, "message": "Tidak ada data saldo aktif untuk laporan kumulatif ini."}

        # Tambahkan Baris TOTAL di paling bawah
        rows.append(["", "TOTAL KUMULATIF", grand_total])

        import pandas as pd
        df = pd.DataFrame(rows, columns=["No", label, "Total Saldo"])
        
        pdf_bytes = pdf_generator.export_dataframe_pdf(
            judul, 
            f"Per Tanggal: {datetime.datetime.now().strftime('%d %B %Y')}", 
            df, 
            [15, 120, 55], 
            config, n_ttd, j_ttd
        )
        
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"inline; filename=Kumulatif_{type}.pdf"})
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {"success": False, "message": str(e)}
