import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import get_db
import models
import schemas

router = APIRouter(prefix="/api/laporan", tags=["Laporan Keuangan"])

def get_saldo_sqlite(db: Session, kode_prefix: str, tgl_mulai=None, tgl_akhir=None):
    """Mendapatkan saldo agregat dari SQLite ledger berdasarkan prefix akun"""
    query = db.query(models.JurnalUmum)
    
    if tgl_mulai: query = query.filter(models.JurnalUmum.tanggal >= tgl_mulai)
    if tgl_akhir: query = query.filter(models.JurnalUmum.tanggal <= tgl_akhir)
    
    query = query.filter(models.JurnalUmum.kode_akun.startswith(kode_prefix))
    
    jurnals = query.all()
    
    total = 0
    detail = {}
    
    for j in jurnals:
        nama_akun = j.nama_akun or "Unknown"
        val = (j.debit or 0) - (j.kredit or 0)
        
        if j.kode_akun.startswith(("2", "3", "4")):
            val = (j.kredit or 0) - (j.debit or 0)
            
        total += val
        detail[nama_akun] = detail.get(nama_akun, 0) + val
        
    return total, detail

@router.get("/keuangan")
def get_laporan_keuangan(bulan: int, tahun: int, db: Session = Depends(get_db)):
    try:
        start_date = datetime.datetime(tahun, bulan, 1)
        if bulan == 12: end_date = datetime.datetime(tahun+1, 1, 1)
        else: end_date = datetime.datetime(tahun, bulan+1, 1)

        # 1. HPP (Cost of Goods Manufactured / Sold)
        # 511xx: Bahan Baku & HPP Terjual
        # 512xx: BTKL
        # 513xx: BOP
        # 51199: Ikhtisar Produksi (Credit for stock output)
        
        baku_val, d_baku = get_saldo_sqlite(db, "5111", start_date, end_date)
        btkl_val, d_btkl = get_saldo_sqlite(db, "512", start_date, end_date)
        bop_val, d_bop = get_saldo_sqlite(db, "513", start_date, end_date)
        ikhtisar_val, d_ikh = get_saldo_sqlite(db, "51199", start_date, end_date)
        terjual_val, d_terjual = get_saldo_sqlite(db, "51120", start_date, end_date) # khusus HPP barang jual
        
        # Dalam Akuntansi Manufaktur: HPP = Bahan + BTKL + BOP - Ikhtisar (WIP/Output)
        # Namun di sini Ikhtisar 51199 dicatat di Kredit saat barang jadi masuk gudang.
        # Jadi total_hpp_produksi = baku + btkl + bop - ikhtisar_val
        total_hpp_periode = baku_val + btkl_val + bop_val - ikhtisar_val
        
        # 2. Laba Rugi
        omzet, d_omzet = get_saldo_sqlite(db, "411", start_date, end_date)
        beban_jual, d_bjual = get_saldo_sqlite(db, "61", start_date, end_date) # 61xxx: Pemasaran
        beban_admin, d_badmin = get_saldo_sqlite(db, "62", start_date, end_date) # 62xxx: Admin & Umum
        
        laba_kotor = omzet - total_hpp_periode
        laba_bersih = laba_kotor - beban_jual - beban_admin

        # 3. Neraca (Saldo Akumulasi hingga saat ini)
        aset_lancar, d_al = get_saldo_sqlite(db, "11", None, end_date) # 11: Kas, Bank, Piutang
        persediaan, d_psd = get_saldo_sqlite(db, "12", None, end_date) # 12: Persediaan
        aset_tetap, d_at = get_saldo_sqlite(db, "13", None, end_date) # 13: Aset Tetap
        # Akumulasi penyusutan di 13x20, 13x40 dll
        # Kita hitung dari saldo kredit di akun yang mengandung "Akumulasi"
        penyusutan = 0
        d_peny = {}
        for j in db.query(models.JurnalUmum).filter(models.JurnalUmum.nama_akun.like("%Akumulasi%")).all():
            val = (j.kredit or 0) - (j.debit or 0)
            penyusutan += val
            d_peny[j.nama_akun] = d_peny.get(j.nama_akun, 0) + val
        
        utang_pdk, d_updk = get_saldo_sqlite(db, "21", None, end_date)
        utang_pjg, d_upjg = get_saldo_sqlite(db, "22", None, end_date)
        modal_disetor, d_md = get_saldo_sqlite(db, "311", None, end_date)
        prive_val, d_prive = get_saldo_sqlite(db, "312", None, end_date)
        
        # Ekuitas = Laba Kumulatif
        laba_kumulatif, _ = get_saldo_sqlite(db, "41", None, end_date)
        hpp_kumulatif, _ = get_saldo_sqlite(db, "51", None, end_date)
        beban_kumulatif, _ = get_saldo_sqlite(db, "6", None, end_date) # Semua kepala 6
        beban_kumulatif -= hpp_kumulatif # hpp_kumulatif sudah dihitung dari 51
        # Wait, get_saldo_sqlite handles the sign based on first digit.
        # Let's just calculate manually for clarity
        total_laba_akum = laba_kumulatif - hpp_kumulatif - (beban_kumulatif if beban_kumulatif > 0 else 0)

        return {
            "success": True,
            "data": {
                "hpp": {
                    "total_hpp": total_hpp_periode, 
                    "bahan": {"total": baku_val, "detail": d_baku}, 
                    "btkl": {"total": btkl_val, "detail": d_btkl}, 
                    "bop": {"total": bop_val, "detail": d_bop},
                    "terjual": {"total": terjual_val, "detail": d_terjual},
                    "ikhtisar": {"total": ikhtisar_val, "detail": d_ikh}
                },
                "laba_rugi": {
                    "pendapatan": {"total": omzet, "detail": d_omzet},
                    "hpp_negatif": total_hpp_periode,
                    "laba_kotor": laba_kotor,
                    "beban_jual": {"total": beban_jual, "detail": d_bjual},
                    "beban_admin": {"total": beban_admin, "detail": d_badmin},
                    "laba_bersih": laba_bersih
                },
                "neraca": {
                    "aset_lancar": {"total": aset_lancar, "detail": d_al},
                    "persediaan": {"total": persediaan, "detail": d_psd},
                    "aset_tetap": {"total": aset_tetap, "detail": d_at},
                    "penyusutan": {"total": penyusutan, "detail": d_peny},
                    "total_aset": aset_lancar + persediaan + aset_tetap - penyusutan,
                    
                    "utang_pdk": {"total": utang_pdk, "detail": d_updk},
                    "utang_pjg": {"total": utang_pjg, "detail": d_upjg},
                    "modal_disetor": {"total": modal_disetor, "detail": d_md},
                    "laba_akumulasi": total_laba_akum,
                    "prive": {"total": prive_val, "detail": d_prive},
                    
                    "total_pasiva": utang_pdk + utang_pjg + modal_disetor + total_laba_akum - prive_val,
                    "is_balance": abs((aset_lancar + persediaan + aset_tetap - penyusutan) - (utang_pdk + utang_pjg + modal_disetor + total_laba_akum - prive_val)) < 100
                },
                "ekuitas": {
                    "modal_awal": modal_disetor,
                    "laba_akumulasi": total_laba_akum,
                    "prive": prive_val,
                    "modal_akhir": modal_disetor + total_laba_akum - prive_val
                }
            }
        }
    except Exception as e:
        return {"success": False, "message": str(e)}
@router.get("/buku-besar")
def get_buku_besar(kode_akun: str, bulan: int, tahun: int, filter_nama: str = "", db: Session = Depends(get_db)):
    try:
        start_date = datetime.datetime(tahun, bulan, 1)
        if bulan == 12: end_date = datetime.datetime(tahun+1, 1, 1)
        else: end_date = datetime.datetime(tahun, bulan+1, 1)
        
        # Saldo Awal (sebelum tgl_mulai)
        debit_awal = db.query(func.sum(models.JurnalUmum.debit)).filter(models.JurnalUmum.kode_akun == kode_akun, models.JurnalUmum.tanggal < start_date).scalar() or 0
        kredit_awal = db.query(func.sum(models.JurnalUmum.kredit)).filter(models.JurnalUmum.kode_akun == kode_akun, models.JurnalUmum.tanggal < start_date).scalar() or 0
        
        saldo_awal = debit_awal - kredit_awal
        if kode_akun.startswith(("2", "3", "4")):
            saldo_awal = kredit_awal - debit_awal
            
        # Mutasi Periode Ini
        query = db.query(models.JurnalUmum).filter(models.JurnalUmum.kode_akun == kode_akun, models.JurnalUmum.tanggal >= start_date, models.JurnalUmum.tanggal < end_date)
        if filter_nama:
            query = query.filter(models.JurnalUmum.keterangan.ilike(f"%{filter_nama}%"))
            
        jurnals = query.order_by(models.JurnalUmum.tanggal.asc()).all()
        
        list_mutasi = [{
            "tanggal": start_date.isoformat(),
            "keterangan": "SALDO AWAL",
            "debit": 0, "kredit": 0, "saldo": saldo_awal
        }]
        
        curr_saldo = saldo_awal
        for j in jurnals:
            val = (j.debit or 0) - (j.kredit or 0)
            if kode_akun.startswith(("2", "3", "4")):
                val = (j.kredit or 0) - (j.debit or 0)
            
            curr_saldo += val
            list_mutasi.append({
                "tanggal": j.tanggal.isoformat(),
                "keterangan": j.keterangan,
                "debit": j.debit,
                "kredit": j.kredit,
                "saldo": curr_saldo
            })
            
        return {"success": True, "data": {"list": list_mutasi}}
    except Exception as e:
        return {"success": False, "message": str(e)}

@router.get("/export-pdf-buku-besar")
def export_buku_besar_pdf_endpoint(kode_akun: str = "", bulan: int = 4, tahun: int = 2026, filter_nama: str = "", db: Session = Depends(get_db)):
    try:
        from pdf_generator import export_dataframe_pdf, export_buku_besar_massal_pdf
        import pandas as pd
        from fastapi.responses import Response
        from sqlalchemy import func
        
        config = db.query(models.CompanyConfig).first()
        n_ttd = config.ttd_laporan_nama if (config and config.ttd_laporan_nama) else (config.nama_pemilik if config else "Yana Taryana")
        j_ttd = config.ttd_laporan_jabatan if (config and config.ttd_laporan_jabatan) else (config.jabatan_pemilik if config else "Direktur Operasional")
        
        # Tanda Tangan Admin
        n_admin = config.ttd_admin_nama if (config and config.ttd_admin_nama) else "Admin Keuangan"
        j_admin = config.ttd_admin_jabatan if (config and config.ttd_admin_jabatan) else "Administrasi"
        
        periode_str = f"{new_date(2000, bulan, 1).strftime('%B')} {tahun}"

        # MODE: CETAK SEMUA AKUN
        if not kode_akun or kode_akun == "ALL":
            # Ambil semua akun yang ada di jurnal umum pada periode ini
            start_date = datetime.datetime(tahun, bulan, 1)
            if bulan == 12: end_date = datetime.datetime(tahun+1, 1, 1)
            else: end_date = datetime.datetime(tahun, bulan+1, 1)
            
            akun_aktif = db.query(models.JurnalUmum.kode_akun, models.JurnalUmum.nama_akun)\
                .filter(models.JurnalUmum.tanggal >= start_date, models.JurnalUmum.tanggal < end_date)\
                .distinct().all()
            
            if not akun_aktif:
                # Jika tidak ada mutasi, ambil semua akun yang punya saldo awal (transaksi sebelumnya)
                akun_aktif = db.query(models.JurnalUmum.kode_akun, models.JurnalUmum.nama_akun)\
                    .filter(models.JurnalUmum.tanggal < end_date)\
                    .distinct().all()

            if not akun_aktif:
                return {"status": "error", "message": "Tidak ada data transaksi buku besar untuk periode ini."}

            data_massal = []
            # Urutkan berdasarkan kode akun
            akun_aktif = sorted(akun_aktif, key=lambda x: x[0])
            
            for k_akun, n_akun in akun_aktif:
                res = get_buku_besar(k_akun, bulan, tahun, "", db)
                if res["success"]:
                    data_massal.append({
                        "nama_akun": n_akun,
                        "kode_akun": k_akun,
                        "rows": res["data"]["list"]
                    })
            
            pdf_bytes = export_buku_besar_massal_pdf(data_massal, periode_str, config, n_ttd, j_ttd, n_admin, j_admin)
            return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"inline; filename=BukuBesar_Lengkap_{bulan}_{tahun}.pdf"})

        # MODE: CETAK PER AKUN (INDIVIDU)
        res = get_buku_besar(kode_akun, bulan, tahun, filter_nama, db)
        if not res["success"]: return {"status": "error", "message": "Gagal ambil data"}
        
        data = res["data"]["list"]
        df_list = []
        for d in data:
            df_list.append({
                "Tanggal": d["tanggal"][:10],
                "Keterangan": d["keterangan"],
                "Debit": f"Rp {int(d['debit']):,}" if d['debit'] else "-",
                "Kredit": f"Rp {int(d['kredit']):,}" if d['kredit'] else "-",
                "Saldo": f"Rp {int(d['saldo']):,}"
            })
            
        df = pd.DataFrame(df_list)
        
        akun = db.query(models.AkunBukuBesar).filter(models.AkunBukuBesar.kode_akun == kode_akun).first()
        nama_akun = akun.nama_akun if akun else kode_akun
        judul = f"BUKU BESAR - {nama_akun}"

        pdf_bytes = export_dataframe_pdf(judul, periode_str, df, [30, 95, 40, 40, 45], config, n_ttd, j_ttd, n_admin, j_admin)
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"inline; filename=BukuBesar_{kode_akun}_{bulan}_{tahun}.pdf"})

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {"status": "error", "message": str(e)}

@router.get("/export-pdf")
def export_laporan_pdf(tipe: str, bulan: int, tahun: int, db: Session = Depends(get_db)):
    try:
        from pdf_generator import export_laporan_2kolom_pdf
        from fastapi.responses import Response
        
        # Ambil data laporan
        report_res = get_laporan_keuangan(bulan, tahun, db)
        if not report_res["success"]: return {"status": "error", "message": "Gagal ambil data"}
        
        data = report_res["data"]
        periode_str = f"{new_date(2000, bulan, 1).strftime('%B')} {tahun}" # Simple enough
        
        # Map data ke format PDF
        pdf_list = []
        judul = ""
        label_total = ""
        val_total = 0
        
        if tipe == "HPP":
            judul = "LAPORAN HARGA POKOK PRODUKSI"
            # Bahan
            pdf_list.append(("PEMAKAIAN BAHAN BAKU", None, True))
            for k, v in data["hpp"]["bahan"]["detail"].items(): pdf_list.append((k, v, False))
            # BTKL
            pdf_list.append(("BIAYA TENAGA KERJA", None, True))
            for k, v in data["hpp"]["btkl"]["detail"].items(): pdf_list.append((k, v, False))
            # BOP
            pdf_list.append(("OVERHEAD PABRIK", None, True))
            for k, v in data["hpp"]["bop"]["detail"].items(): pdf_list.append((k, v, False))
            
            label_total = "TOTAL HPP"
            val_total = data["hpp"]["total_hpp"]
            
        elif tipe == "LR":
            judul = "LAPORAN LABA RUGI"
            pdf_list.append(("PENDAPATAN", None, True))
            for k, v in data["laba_rugi"]["pendapatan"]["detail"].items(): pdf_list.append((k, v, False))
            pdf_list.append(("HARGA POKOK PRODUKSI (-)", -data["laba_rugi"]["hpp_negatif"], True))
            pdf_list.append(("BEBAN PEMASARAN", None, True))
            for k, v in data["laba_rugi"]["beban_jual"]["detail"].items(): pdf_list.append((k, v, False))
            pdf_list.append(("BEBAN ADMIN & UMUM", None, True))
            for k, v in data["laba_rugi"]["beban_admin"]["detail"].items(): pdf_list.append((k, v, False))
            
            label_total = "LABA (RUGI) BERSIH"
            val_total = data["laba_rugi"]["laba_bersih"]
            
        elif tipe == "NERACA":
            judul = "LAPORAN NERACA (SKONTRO)"
            # SISI KIRI (AKTIVA)
            left_list = []
            left_list.append(("ASET LANCAR", None, True))
            for k, v in data["neraca"]["aset_lancar"]["detail"].items(): left_list.append((k, v, False))
            left_list.append(("PERSEDIAAN", None, True))
            for k, v in data["neraca"]["persediaan"]["detail"].items(): left_list.append((k, v, False))
            left_list.append(("ASET TETAP", None, True))
            for k, v in data["neraca"]["aset_tetap"]["detail"].items(): left_list.append((k, v, False))
            left_list.append(("AKUMULASI PENYUSUTAN (-)", -data["neraca"]["penyusutan"]["total"], True))
            
            # SISI KANAN (PASIVA)
            right_list = []
            right_list.append(("KEWAJIBAN JANGKA PENDEK", None, True))
            for k, v in data["neraca"]["utang_pdk"]["detail"].items(): right_list.append((k, v, False))
            right_list.append(("KEWAJIBAN JANGKA PANJANG", None, True))
            for k, v in data["neraca"]["utang_pjg"]["detail"].items(): right_list.append((k, v, False))
            right_list.append(("EKUITAS / MODAL", None, True))
            for k, v in data["neraca"]["modal_disetor"]["detail"].items(): right_list.append((k, v, False))
            right_list.append(("LABA DITAHAN & BERJALAN", data["neraca"]["laba_akumulasi"], False))
            
            # Ambil Profil
            config = db.query(models.CompanyConfig).first()
            
            from pdf_generator import export_neraca_skontro_pdf
            pdf_bytes = export_neraca_skontro_pdf(
                judul, periode_str, left_list, right_list, 
                data["neraca"]["total_aset"], data["neraca"]["total_pasiva"], config
            )
            return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"inline; filename=Neraca_{bulan}_{tahun}.pdf"})

        elif tipe == "EKUITAS":
            judul = "LAPORAN PERUBAHAN EKUITAS"
            pdf_list.append(("MODAL AWAL / DISETOR", data["ekuitas"]["modal_awal"], False))
            pdf_list.append(("LABA DITAHAN & BERJALAN", data["ekuitas"]["laba_akumulasi"], False))
            pdf_list.append(("PRIVE (PENGAMBILAN PRIBADI) (-)", -data["ekuitas"]["prive"], False))
            
            label_total = "MODAL AKHIR"
            val_total = data["ekuitas"]["modal_akhir"]

        # DEFAULT (HPP / LR / EKUITAS) - Tetap 2 Kolom
        # Ambil Profil & Config TTD
        config = db.query(models.CompanyConfig).first()
        n_ttd = config.ttd_laporan_nama if (config and config.ttd_laporan_nama) else (config.nama_pemilik if config else "Yana Taryana")
        j_ttd = config.ttd_laporan_jabatan if (config and config.ttd_laporan_jabatan) else (config.jabatan_pemilik if config else "Direktur Operasional")
        
        n_admin = config.ttd_admin_nama if (config and config.ttd_admin_nama) else "Admin Keuangan"
        j_admin = config.ttd_admin_jabatan if (config and config.ttd_admin_jabatan) else "Administrasi"

        pdf_bytes = export_laporan_2kolom_pdf(judul, periode_str, pdf_list, label_total, val_total, config, n_ttd, j_ttd, n_admin, j_admin)
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"inline; filename=Laporan_{tipe}_{bulan}_{tahun}.pdf"})
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {"status": "error", "message": str(e)}

def new_date(y, m, d):
    return datetime.datetime(y, m, d)
