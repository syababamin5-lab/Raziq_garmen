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

        # 1. HPP
        baku_val, d_baku = get_saldo_sqlite(db, "5111", start_date, end_date) # 51110: Bahan
        btkl_val, d_btkl = get_saldo_sqlite(db, "5112", start_date, end_date) # 51120: BTKL/HPP
        bop_val, d_bop = get_saldo_sqlite(db, "5113", start_date, end_date)   # 51130: BOP
        ikhtisar_val, d_ikh = get_saldo_sqlite(db, "5119", start_date, end_date) # 51199: Ikhtisar
        terjual_val, d_terjual = get_saldo_sqlite(db, "51120", start_date, end_date) # khusus HPP barang jual
        total_hpp = baku_val + btkl_val + bop_val - ikhtisar_val

        # 2. Laba Rugi
        omzet, d_omzet = get_saldo_sqlite(db, "411", start_date, end_date)
        beban_jual, d_bjual = get_saldo_sqlite(db, "611", start_date, end_date)
        beban_admin, d_badmin = get_saldo_sqlite(db, "612", start_date, end_date)
        laba_kotor = omzet - total_hpp
        laba_bersih = laba_kotor - beban_jual - beban_admin

        # 3. Neraca (Saldo Akumulasi hingga saat ini)
        aset_lancar, d_al = get_saldo_sqlite(db, "11", None, end_date)
        aset_tetap, d_at = get_saldo_sqlite(db, "12", None, end_date)
        penyusutan, d_peny = get_saldo_sqlite(db, "129", None, end_date) # 129xx: Akumulasi Penyusutan
        
        utang_pdk, d_updk = get_saldo_sqlite(db, "21", None, end_date)
        utang_pjg, d_upjg = get_saldo_sqlite(db, "22", None, end_date)
        modal_disetor, d_md = get_saldo_sqlite(db, "311", None, end_date)
        prive_val, d_prive = get_saldo_sqlite(db, "312", None, end_date)
        
        # Ekuitas = Laba Kumulatif
        laba_kumulatif, _ = get_saldo_sqlite(db, "41", None, end_date)
        hpp_kumulatif, _ = get_saldo_sqlite(db, "51", None, end_date)
        beban_kumulatif, _ = get_saldo_sqlite(db, "61", None, end_date)
        total_laba_akum = laba_kumulatif - hpp_kumulatif - beban_kumulatif

        return {
            "success": True,
            "data": {
                "hpp": {
                    "total_hpp": total_hpp, 
                    "bahan": {"total": baku_val, "detail": d_baku}, 
                    "btkl": {"total": btkl_val, "detail": d_btkl}, 
                    "bop": {"total": bop_val, "detail": d_bop},
                    "terjual": {"total": terjual_val, "detail": d_terjual},
                    "ikhtisar": {"total": ikhtisar_val, "detail": d_ikh}
                },
                "laba_rugi": {
                    "pendapatan": {"total": omzet, "detail": d_omzet},
                    "hpp_negatif": total_hpp,
                    "laba_kotor": laba_kotor,
                    "beban_jual": {"total": beban_jual, "detail": d_bjual},
                    "beban_admin": {"total": beban_admin, "detail": d_badmin},
                    "laba_bersih": laba_bersih
                },
                "neraca": {
                    "aset_lancar": {"total": aset_lancar, "detail": d_al},
                    "aset_tetap": {"total": aset_tetap, "detail": d_at},
                    "penyusutan": {"total": penyusutan, "detail": d_peny},
                    "total_aset": aset_lancar + aset_tetap - penyusutan,
                    
                    "utang_pdk": {"total": utang_pdk, "detail": d_updk},
                    "utang_pjg": {"total": utang_pjg, "detail": d_upjg},
                    "modal_disetor": {"total": modal_disetor, "detail": d_md},
                    "laba_akumulasi": total_laba_akum,
                    "prive": {"total": prive_val, "detail": d_prive},
                    
                    "total_pasiva": utang_pdk + utang_pjg + modal_disetor + total_laba_akum - prive_val,
                    "is_balance": abs((aset_lancar + aset_tetap - penyusutan) - (utang_pdk + utang_pjg + modal_disetor + total_laba_akum - prive_val)) < 100
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
            judul = "LAPORAN NERACA"
            pdf_list.append(("ASET LANCAR", None, True))
            for k, v in data["neraca"]["aset_lancar"]["detail"].items(): pdf_list.append((k, v, False))
            pdf_list.append(("ASET TETAP", None, True))
            for k, v in data["neraca"]["aset_tetap"]["detail"].items(): pdf_list.append((k, v, False))
            pdf_list.append(("AKUMULASI PENYUSUTAN (-)", -data["neraca"]["penyusutan"]["total"], True))
            
            pdf_list.append(("KEWAJIBAN & MODAL", None, True))
            for k, v in data["neraca"]["utang_pdk"]["detail"].items(): pdf_list.append((k, v, False))
            for k, v in data["neraca"]["utang_pjg"]["detail"].items(): pdf_list.append((k, v, False))
            for k, v in data["neraca"]["modal_disetor"]["detail"].items(): pdf_list.append((k, v, False))
            pdf_list.append(("LABA DITAHAN & BERJALAN", data["neraca"]["laba_akumulasi"], False))
            
            label_total = "TOTAL AKTIVA"
            val_total = data["neraca"]["total_aset"]
            
        pdf_bytes = export_laporan_2kolom_pdf(judul, f"{bulan}/{tahun}", pdf_list, label_total, val_total)
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=Laporan_{tipe}_{bulan}_{tahun}.pdf"})
        
    except Exception as e:
        return {"success": False, "message": str(e)}

def new_date(y, m, d):
    return datetime.datetime(y, m, d)
