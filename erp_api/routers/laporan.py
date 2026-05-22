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
    detail_by_code = {} # Menggunakan kode_akun sebagai key agar konsisten
    name_map = {}       # Menyimpan nama terbaru untuk setiap kode
    
    for j in jurnals:
        kode = j.kode_akun
        nama_akun = j.nama_akun or "Unknown"
        val = (j.debit or 0) - (j.kredit or 0)
        
        if kode.startswith(("2", "3", "4")):
            val = (j.kredit or 0) - (j.debit or 0)
            
        total += val
        detail_by_code[kode] = detail_by_code.get(kode, 0) + val
        # Ambil nama akun dari jurnal terbaru untuk kode tersebut
        name_map[kode] = nama_akun
        
    # Kembalikan detail dalam format {nama_akun: saldo} untuk kompatibilitas UI
    detail_final = {}
    for kode, val in detail_by_code.items():
        # Coba ambil nama resmi dari COA jika tersedia, jika tidak pakai dari jurnal
        official_acc = db.query(models.AkunBukuBesar).filter(models.AkunBukuBesar.kode_akun == kode).first()
        label = official_acc.nama_akun if official_acc else name_map[kode]
        detail_final[label] = detail_final.get(label, 0) + val
        
    return total, detail_final

@router.get("/keuangan")
def get_laporan_keuangan(bulan: int, tahun: int, db: Session = Depends(get_db)):
    try:
        start_date = datetime.datetime(tahun, bulan, 1)
        if bulan == 12: end_date = datetime.datetime(tahun+1, 1, 1)
        else: end_date = datetime.datetime(tahun, bulan+1, 1)

        # 1. HPP (Standard Manufacturing Flow)
        # Ambil dari Akun Beban Langsung (51xx)
        baku_val, d_baku = get_saldo_sqlite(db, "5111", start_date, end_date)
        btkl_val, d_btkl = get_saldo_sqlite(db, "512", start_date, end_date)
        bop_val, d_bop = get_saldo_sqlite(db, "513", start_date, end_date)
        ikhtisar_val, d_ikh = get_saldo_sqlite(db, "51199", start_date, end_date)
        terjual_val, d_terjual = get_saldo_sqlite(db, "51120", start_date, end_date) 

        # --- TAMBAHAN: Ambil biaya yang masuk lewat WIP (12130) agar rincian tetap muncul ---
        # Kami mencari mutasi DEBIT di 12130 selama periode ini
        wip_debits = db.query(models.JurnalUmum).filter(
            models.JurnalUmum.kode_akun == "12130",
            models.JurnalUmum.tanggal >= start_date,
            models.JurnalUmum.tanggal < end_date,
            models.JurnalUmum.debit > 0
        ).all()

        for j in wip_debits:
            ket = str(j.keterangan).lower()
            if "bahan" in ket or "cutting" in ket:
                baku_val += j.debit
                d_baku["Pemakaian Bahan (WIP)"] = d_baku.get("Pemakaian Bahan (WIP)", 0) + j.debit
            elif "upah" in ket:
                btkl_val += j.debit
                d_btkl["Upah Produksi (WIP)"] = d_btkl.get("Upah Produksi (WIP)", 0) + j.debit

        # --- HITUNG WIP ADJUSTMENT (PENTING UNTUK CUT-OFF) ---
        # WIP Awal = Saldo akun 12130 sebelum start_date
        d_awal_wip = db.query(func.sum(models.JurnalUmum.debit)).filter(models.JurnalUmum.kode_akun == "12130", models.JurnalUmum.tanggal < start_date).scalar() or 0
        k_awal_wip = db.query(func.sum(models.JurnalUmum.kredit)).filter(models.JurnalUmum.kode_akun == "12130", models.JurnalUmum.tanggal < start_date).scalar() or 0
        wip_awal = d_awal_wip - k_awal_wip

        # WIP Akhir = Saldo akun 12130 hingga end_date
        d_akhir_wip = db.query(func.sum(models.JurnalUmum.debit)).filter(models.JurnalUmum.kode_akun == "12130", models.JurnalUmum.tanggal < end_date).scalar() or 0
        k_akhir_wip = db.query(func.sum(models.JurnalUmum.kredit)).filter(models.JurnalUmum.kode_akun == "12130", models.JurnalUmum.tanggal < end_date).scalar() or 0
        wip_akhir = d_akhir_wip - k_akhir_wip

        # Jika biaya produksi dicatat langsung ke 12130 (Perpetual), maka HPP Produksi adalah 
        # Total mutasi DEBIT 12130 (Usage) + WIP Awal - WIP Akhir.
        # Namun agar laporan tetap detail (Baku, BTKL, dll), kita ambil dari 51xx (jika ada) 
        # atau dari mutasi debit 12130 yang spesifik.
        
        # Penyesuaian HPP Produksi (WIP Movement)
        # Rumus: (Biaya Produksi) + (WIP Awal - WIP Akhir)
        # Akun 51199 (Ikhtisar) sekarang menangkap output produksi reguler
        # --- FINAL HPP CALCULATION (PERPETUAL METHOD) ---
        # Di sistem perpetual, HPP yang masuk ke Laba Rugi adalah MURNI dari Akun 51120 (Barang Terjual).
        # Biaya produksi (5111, 512, 12130) adalah mutasi aset (stok) dan tidak boleh dijumlahkan lagi agar tidak dobel.
        total_hpp_periode = terjual_val
        
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
        
        # Ekuitas = Laba Kumulatif (Pendapatan - HPP - Beban)
        laba_kumulatif, _ = get_saldo_sqlite(db, "41", None, end_date) # 41: Pendapatan
        hpp_kumulatif, _ = get_saldo_sqlite(db, "51", None, end_date)  # 51: HPP
        beban_kumulatif, _ = get_saldo_sqlite(db, "6", None, end_date)   # 6: Beban Operasional
        
        # total_laba_akum adalah Pendapatan - (HPP + Beban)
        total_laba_akum = laba_kumulatif - hpp_kumulatif - beban_kumulatif

        # 4. Arus Kas (Metode Langsung)
        # Saldo Awal Kas & Bank (Bulan sebelumnya)
        d_awal_kas = db.query(func.sum(models.JurnalUmum.debit)).filter(models.JurnalUmum.kode_akun.startswith("111"), models.JurnalUmum.tanggal < start_date).scalar() or 0
        k_awal_kas = db.query(func.sum(models.JurnalUmum.kredit)).filter(models.JurnalUmum.kode_akun.startswith("111"), models.JurnalUmum.tanggal < start_date).scalar() or 0
        saldo_awal_kas = d_awal_kas - k_awal_kas

        # Ambil transaksi saldo awal setup (untuk ditampilkan di Saldo Awal paling atas)
        setup_awal = db.query(func.sum(models.JurnalUmum.debit - models.JurnalUmum.kredit)).filter(
            models.JurnalUmum.kode_akun.startswith("111"),
            models.JurnalUmum.tanggal >= start_date,
            models.JurnalUmum.tanggal < end_date,
            models.JurnalUmum.keterangan.like("%Saldo Awal%")
        ).scalar() or 0
        
        saldo_awal_fix = saldo_awal_kas + setup_awal

        # Transaksi Bulan Ini (Kecuali setup awal)
        jurnals_kas = db.query(models.JurnalUmum).filter(
            models.JurnalUmum.kode_akun.startswith("111"), 
            models.JurnalUmum.tanggal >= start_date, 
            models.JurnalUmum.tanggal < end_date,
            ~models.JurnalUmum.keterangan.like("%Saldo Awal%")
        ).all()
        
        arus_ops = {"masuk": 0, "keluar": 0, "detail_masuk": {}, "detail_keluar": {}}
        arus_inv = {"masuk": 0, "keluar": 0, "detail_masuk": {}, "detail_keluar": {}}
        arus_fin = {"masuk": 0, "keluar": 0, "detail_masuk": {}, "detail_keluar": {}}

        for j in jurnals_kas:
            pasangan = db.query(models.JurnalUmum).filter(
                models.JurnalUmum.tanggal == j.tanggal,
                models.JurnalUmum.id != j.id
            ).first()

            target_kat = "ops"
            if pasangan:
                p_kode = pasangan.kode_akun
                if p_kode.startswith("13"): target_kat = "inv"
                elif p_kode.startswith("31"): target_kat = "fin"
                elif p_kode.startswith(("4", "112", "113")): target_kat = "ops" # 112 adalah Piutang
                elif p_kode.startswith(("5", "6", "12", "21", "111")): target_kat = "ops"
            
            ref_dict = arus_ops if target_kat == "ops" else arus_inv if target_kat == "inv" else arus_fin
            label = pasangan.nama_akun if pasangan else "Transaksi Kas"
            
            if j.debit > 0:
                ref_dict["masuk"] += j.debit
                ref_dict["detail_masuk"][label] = ref_dict["detail_masuk"].get(label, 0) + j.debit
            else:
                ref_dict["keluar"] += j.kredit
                ref_dict["detail_keluar"][label] = ref_dict["detail_keluar"].get(label, 0) + j.kredit

        return {
            "success": True,
            "data": {
                "hpp": {
                    "total_hpp": total_hpp_periode, 
                    "bahan": {"total": baku_val, "detail": d_baku}, 
                    "btkl": {"total": btkl_val, "detail": d_btkl}, 
                    "bop": {"total": bop_val, "detail": d_bop},
                    "terjual": {"total": terjual_val, "detail": d_terjual},
                    "ikhtisar": {"total": ikhtisar_val, "detail": d_ikh},
                    "wip_awal": wip_awal,
                    "wip_akhir": wip_akhir
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
                },
                "arus_kas": {
                    "saldo_awal": saldo_awal_fix,
                    "operasional": arus_ops,
                    "investasi": arus_inv,
                    "pendanaan": arus_fin,
                    "total_kenaikan": (arus_ops["masuk"] - arus_ops["keluar"]) + (arus_inv["masuk"] - arus_inv["keluar"]) + (arus_fin["masuk"] - arus_fin["keluar"]),
                    "saldo_akhir": saldo_awal_fix + (arus_ops["masuk"] - arus_ops["keluar"]) + (arus_inv["masuk"] - arus_inv["keluar"]) + (arus_fin["masuk"] - arus_fin["keluar"])
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
            # Penyesuaian WIP (Standard Manufacturing)
            pdf_list.append(("PERSEDIAAN WIP AWAL (+)", data["hpp"]["wip_awal"], True))
            pdf_list.append(("PERSEDIAAN WIP AKHIR (-)", -data["hpp"]["wip_akhir"], True))
            
            label_total = "TOTAL HARGA POKOK PRODUKSI"
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

        elif tipe == "ARUSKAS":
            judul = "LAPORAN ARUS KAS (METODE LANGSUNG)"
            pdf_list.append(("SALDO AWAL KAS & BANK", data["arus_kas"]["saldo_awal"], True))
            
            # Operasional
            pdf_list.append(("AKTIVITAS OPERASIONAL", None, True))
            pdf_list.append(("Uang Masuk Operasional", data["arus_kas"]["operasional"]["masuk"], False))
            pdf_list.append(("Uang Keluar Operasional", -data["arus_kas"]["operasional"]["keluar"], False))
            
            # Investasi
            if data["arus_kas"]["investasi"]["masuk"] > 0 or data["arus_kas"]["investasi"]["keluar"] > 0:
                pdf_list.append(("AKTIVITAS INVESTASI", None, True))
                pdf_list.append(("Uang Masuk Investasi", data["arus_kas"]["investasi"]["masuk"], False))
                pdf_list.append(("Uang Keluar Investasi", -data["arus_kas"]["investasi"]["keluar"], False))
            
            # Pendanaan
            pdf_list.append(("AKTIVITAS PENDANAAN", None, True))
            pdf_list.append(("Uang Masuk Pendanaan", data["arus_kas"]["pendanaan"]["masuk"], False))
            pdf_list.append(("Uang Keluar Pendanaan", -data["arus_kas"]["pendanaan"]["keluar"], False))
            
            pdf_list.append(("TOTAL KENAIKAN / PENURUNAN KAS", data["arus_kas"]["total_kenaikan"], True))
            
            label_total = "SALDO AKHIR KAS & BANK"
            val_total = data["arus_kas"]["saldo_akhir"]

        # DEFAULT (HPP / LR / EKUITAS / ARUSKAS) - Tetap 2 Kolom
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

@router.get("/export-pdf-penjualan-rekap")
def export_penjualan_rekap_pdf_endpoint(bulan: int, tahun: int, db: Session = Depends(get_db)):
    try:
        from pdf_generator import export_rekap_penjualan_bulanan_pdf
        from fastapi.responses import Response
        
        start_date = datetime.datetime(tahun, bulan, 1)
        if bulan == 12: end_date = datetime.datetime(tahun+1, 1, 1)
        else: end_date = datetime.datetime(tahun, bulan+1, 1)
        
        # 1. Ambil Semua Header Penjualan Periode Ini
        sales = db.query(models.HeaderPenjualan).filter(
            models.HeaderPenjualan.tanggal >= start_date,
            models.HeaderPenjualan.tanggal < end_date
        ).all()
        
        # 2. Ambil Semua Detail Penjualan (untuk hitung retur)
        invoices_nos = [s.no_invoice for s in sales]
        details = db.query(models.DetailPenjualan).filter(models.DetailPenjualan.no_invoice.in_(invoices_nos)).all() if invoices_nos else []
        
        # Mapping retur per invoice
        retur_map = {}
        for d in details:
            if d.qty_retur and d.qty_retur > 0:
                val_retur = d.qty_retur * d.harga_per_lusin
                retur_map[d.no_invoice] = retur_map.get(d.no_invoice, 0) + val_retur

        # 3. Proses Data Harian
        daily_data = {} 
        for s in sales:
            tgl_str = s.tanggal.strftime("%d/%m/%Y")
            if tgl_str not in daily_data:
                daily_data[tgl_str] = {"count": 0, "bruto": 0, "diskon": 0}
            
            daily_data[tgl_str]["count"] += 1
            daily_data[tgl_str]["bruto"] += (s.total_tagihan + (s.diskon or 0))
            daily_data[tgl_str]["diskon"] += (s.diskon or 0)
            
        daily_rows = []
        for tgl in sorted(daily_data.keys()):
            d = daily_data[tgl]
            daily_rows.append([tgl, d["count"], d["bruto"], d["diskon"], d["bruto"] - d["diskon"]])

        # 4. Proses Data Per Client
        client_data = {} 
        for s in sales:
            name = s.nama_customer or "Umum"
            if name not in client_data:
                client_data[name] = {"bruto": 0, "diskon": 0, "retur": 0, "piutang": 0}
            
            bruto = s.total_tagihan + (s.diskon or 0)
            client_data[name]["bruto"] += bruto
            client_data[name]["diskon"] += (s.diskon or 0)
            client_data[name]["retur"] += retur_map.get(s.no_invoice, 0)
            
            if s.status == "Tempo":
                client_data[name]["piutang"] += (s.total_tagihan - (s.uang_muka or 0))

        client_rows = []
        g_totals = {"bruto": 0, "diskon": 0, "retur": 0, "netto": 0, "piutang": 0}
        
        for name in sorted(client_data.keys()):
            c = client_data[name]
            netto = c["bruto"] - c["diskon"] - c["retur"]
            client_rows.append([name, c["bruto"], c["diskon"], c["retur"], netto, c["piutang"]])
            
            g_totals["bruto"] += c["bruto"]
            g_totals["diskon"] += c["diskon"]
            g_totals["retur"] += c["retur"]
            g_totals["netto"] += netto
            g_totals["piutang"] += c["piutang"]

        # 5. Generate PDF
        config = db.query(models.CompanyConfig).first()
        periode_str = f"{new_date(2000, bulan, 1).strftime('%B')} {tahun}"
        
        n_ttd = config.ttd_laporan_nama if (config and config.ttd_laporan_nama) else (config.nama_pemilik if config else "Yana Taryana")
        j_ttd = config.ttd_laporan_jabatan if (config and config.ttd_laporan_jabatan) else (config.jabatan_pemilik if config else "Direktur Operasional")
        n_admin = config.ttd_admin_nama if (config and config.ttd_admin_nama) else "Admin Keuangan"
        j_admin = config.ttd_admin_jabatan if (config and config.ttd_admin_jabatan) else "Administrasi"

        pdf_bytes = export_rekap_penjualan_bulanan_pdf(
            "REKAPITULASI PENJUALAN BULANAN", periode_str, 
            daily_rows, client_rows, g_totals, 
            config, n_ttd, j_ttd, n_admin, j_admin
        )
        
        return Response(
            content=pdf_bytes, 
            media_type="application/pdf", 
            headers={"Content-Disposition": f"inline; filename=Rekap_Penjualan_{bulan}_{tahun}.pdf"}
        )

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {"status": "error", "message": str(e)}

@router.get("/export-pdf-pembelian-rekap")
def export_pembelian_rekap_pdf_endpoint(bulan: int, tahun: int, db: Session = Depends(get_db)):
    try:
        from pdf_generator import export_rekap_pembelian_bulanan_pdf
        from fastapi.responses import Response
        
        start_date = datetime.datetime(tahun, bulan, 1)
        if bulan == 12: end_date = datetime.datetime(tahun+1, 1, 1)
        else: end_date = datetime.datetime(tahun, bulan+1, 1)
        
        # 1. Ambil Semua Header Pembelian Periode Ini
        purchases = db.query(models.HeaderPembelian).filter(
            models.HeaderPembelian.tanggal >= start_date,
            models.HeaderPembelian.tanggal < end_date
        ).all()
        
        # 2. Proses Data Harian
        daily_data = {} 
        for p in purchases:
            tgl_str = p.tanggal.strftime("%d/%m/%Y")
            if tgl_str not in daily_data:
                daily_data[tgl_str] = {"count": 0, "bruto": 0, "diskon": 0}
            
            daily_data[tgl_str]["count"] += 1
            daily_data[tgl_str]["bruto"] += (p.total_tagihan + (p.diskon or 0))
            daily_data[tgl_str]["diskon"] += (p.diskon or 0)
            
        daily_rows = []
        for tgl in sorted(daily_data.keys()):
            d = daily_data[tgl]
            daily_rows.append([tgl, d["count"], d["bruto"], d["diskon"], d["bruto"] - d["diskon"]])

        # 3. Proses Data Per Supplier
        supplier_data = {} 
        for p in purchases:
            name = p.nama_supplier or "Umum"
            if name not in supplier_data:
                supplier_data[name] = {"bruto": 0, "diskon": 0, "hutang": 0}
            
            bruto = p.total_tagihan + (p.diskon or 0)
            supplier_data[name]["bruto"] += bruto
            supplier_data[name]["diskon"] += (p.diskon or 0)
            
            if p.status == "Tempo":
                supplier_data[name]["hutang"] += (p.total_tagihan - (p.uang_muka or 0))

        supplier_rows = []
        g_totals = {"bruto": 0, "diskon": 0, "netto": 0, "hutang": 0}
        
        for name in sorted(supplier_data.keys()):
            s = supplier_data[name]
            netto = s["bruto"] - s["diskon"]
            supplier_rows.append([name, s["bruto"], s["diskon"], netto, s["hutang"]])
            
            g_totals["bruto"] += s["bruto"]
            g_totals["diskon"] += s["diskon"]
            g_totals["netto"] += netto
            g_totals["hutang"] += s["hutang"]

        # 4. Generate PDF
        config = db.query(models.CompanyConfig).first()
        periode_str = f"{new_date(2000, bulan, 1).strftime('%B')} {tahun}"
        
        n_ttd = config.ttd_laporan_nama if (config and config.ttd_laporan_nama) else (config.nama_pemilik if config else "Yana Taryana")
        j_ttd = config.ttd_laporan_jabatan if (config and config.ttd_laporan_jabatan) else (config.jabatan_pemilik if config else "Direktur Operasional")
        n_admin = config.ttd_admin_nama if (config and config.ttd_admin_nama) else "Admin Keuangan"
        j_admin = config.ttd_admin_jabatan if (config and config.ttd_admin_jabatan) else "Administrasi"

        pdf_bytes = export_rekap_pembelian_bulanan_pdf(
            "REKAPITULASI PEMBELIAN BULANAN", periode_str, 
            daily_rows, supplier_rows, g_totals, 
            config, n_ttd, j_ttd, n_admin, j_admin
        )
        
        return Response(
            content=pdf_bytes, 
            media_type="application/pdf", 
            headers={"Content-Disposition": f"inline; filename=Rekap_Pembelian_{bulan}_{tahun}.pdf"}
        )

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {"status": "error", "message": str(e)}

@router.get("/export-pdf-produksi-rekap")
def export_produksi_rekap_pdf_endpoint(bulan: int, tahun: int, db: Session = Depends(get_db)):
    try:
        from pdf_generator import export_rekap_produksi_bulanan_pdf
        from fastapi.responses import Response
        
        start_date = datetime.datetime(tahun, bulan, 1)
        if bulan == 12: end_date = datetime.datetime(tahun+1, 1, 1)
        else: end_date = datetime.datetime(tahun, bulan+1, 1)
        
        # 1. Ambil Semua Log Produksi Periode Ini
        logs = db.query(models.ProductionLog).filter(
            models.ProductionLog.tanggal >= start_date,
            models.ProductionLog.tanggal < end_date
        ).all()
        
        # 2. Proses Data Harian
        daily_data = {} 
        for l in logs:
            tgl_str = l.tanggal.strftime("%d/%m/%Y")
            if tgl_str not in daily_data:
                daily_data[tgl_str] = {"cutting": 0, "jahit": 0}
            
            if l.divisi == "Cutting":
                daily_data[tgl_str]["cutting"] += (l.qty_hasil or 0)
            elif l.divisi == "Jahit":
                daily_data[tgl_str]["jahit"] += (l.qty_hasil or 0)
            
        daily_rows = []
        for tgl in sorted(daily_data.keys()):
            d = daily_data[tgl]
            daily_rows.append([tgl, d["cutting"], d["jahit"]])

        # 3. Proses Data Per SKU
        sku_data = {} 
        for l in logs:
            sku = l.kode_sku or "UNKNOWN"
            if sku not in sku_data:
                sku_data[sku] = {"nama": l.nama_barang, "cutting": 0, "jahit": 0}
            
            if l.divisi == "Cutting":
                sku_data[sku]["cutting"] += (l.qty_hasil or 0)
            elif l.divisi == "Jahit":
                sku_data[sku]["jahit"] += (l.qty_hasil or 0)

        sku_rows = []
        g_totals = {"cutting": 0, "jahit": 0}
        
        for sku in sorted(sku_data.keys()):
            s = sku_data[sku]
            sku_rows.append([sku, s["nama"], s["cutting"], s["jahit"]])
            g_totals["cutting"] += s["cutting"]
            g_totals["jahit"] += s["jahit"]

        # 4. Generate PDF
        config = db.query(models.CompanyConfig).first()
        periode_str = f"{new_date(2000, bulan, 1).strftime('%B')} {tahun}"
        
        n_ttd = config.ttd_laporan_nama if (config and config.ttd_laporan_nama) else (config.nama_pemilik if config else "Yana Taryana")
        j_ttd = config.ttd_laporan_jabatan if (config and config.ttd_laporan_jabatan) else (config.jabatan_pemilik if config else "Direktur Operasional")
        n_admin = config.ttd_admin_nama if (config and config.ttd_admin_nama) else "Admin Keuangan"
        j_admin = config.ttd_admin_jabatan if (config and config.ttd_admin_jabatan) else "Administrasi"

        pdf_bytes = export_rekap_produksi_bulanan_pdf(
            "REKAPITULASI OUTPUT PRODUKSI", periode_str, 
            daily_rows, sku_rows, g_totals, 
            config, n_ttd, j_ttd, n_admin, j_admin
        )
        
        return Response(
            content=pdf_bytes, 
            media_type="application/pdf", 
            headers={"Content-Disposition": f"inline; filename=Rekap_Produksi_{bulan}_{tahun}.pdf"}
        )

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {"status": "error", "message": str(e)}

@router.get("/audit-investigasi-kas")
def audit_investigasi_kas(db: Session = Depends(get_db)):
    """Mencari sumber uang keluar 15 juta yang mencurigakan"""
    try:
        wib = datetime.timezone(datetime.timedelta(hours=7))
        now = datetime.datetime.now(wib).replace(tzinfo=None)
        first_day = now.replace(day=1, hour=0, minute=0, second=0)
        
        # Cari semua uang keluar (Kas/Bank) bulan ini
        uang_keluar = db.query(models.JurnalUmum).filter(
            models.JurnalUmum.kode_akun.startswith('111'),
            models.JurnalUmum.kredit > 0,
            models.JurnalUmum.tanggal >= first_day
        ).all()
        
        return {
            "status": "success",
            "total_ditemukan": len(uang_keluar),
            "data": [
                {
                    "id": u.id,
                    "tgl": u.tanggal.isoformat(),
                    "akun": u.nama_akun,
                    "ket": u.keterangan,
                    "kredit": u.kredit
                } for u in uang_keluar
            ]
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/grafik-penjualan")
def get_grafik_penjualan(bulan: int, tahun: int, filter_tipe: str = "mingguan", db: Session = Depends(get_db)):
    try:
        start_date = datetime.datetime(tahun, bulan, 1)
        if bulan == 12: end_date = datetime.datetime(tahun+1, 1, 1)
        else: end_date = datetime.datetime(tahun, bulan+1, 1)
        
        sales = db.query(models.HeaderPenjualan).filter(
            models.HeaderPenjualan.tanggal >= start_date,
            models.HeaderPenjualan.tanggal < end_date
        ).all()

        data = []
        if filter_tipe == "harian":
            daily_data = {}
            for s in sales:
                tgl_str = s.tanggal.strftime("%d %b")
                if tgl_str not in daily_data:
                    daily_data[tgl_str] = 0
                daily_data[tgl_str] += s.total_tagihan + (s.diskon or 0)
            
            sorted_keys = sorted(daily_data.keys(), key=lambda x: datetime.datetime.strptime(f"{x} {tahun}", "%d %b %Y"))
            data = [{"label": k, "value": daily_data[k]} for k in sorted_keys]
            
        elif filter_tipe == "mingguan":
            weekly_data = {"Minggu 1": 0, "Minggu 2": 0, "Minggu 3": 0, "Minggu 4": 0, "Minggu 5": 0}
            for s in sales:
                day = s.tanggal.day
                if day <= 7: weekly_data["Minggu 1"] += s.total_tagihan + (s.diskon or 0)
                elif day <= 14: weekly_data["Minggu 2"] += s.total_tagihan + (s.diskon or 0)
                elif day <= 21: weekly_data["Minggu 3"] += s.total_tagihan + (s.diskon or 0)
                elif day <= 28: weekly_data["Minggu 4"] += s.total_tagihan + (s.diskon or 0)
                else: weekly_data["Minggu 5"] += s.total_tagihan + (s.diskon or 0)
            
            data = [{"label": k, "value": v} for k, v in weekly_data.items()]
            
        return {"success": True, "data": data}
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {"success": False, "message": str(e)}


@router.get("/kartu-stok/{kode_sku}")
def get_kartu_stok(kode_sku: str, db: Session = Depends(get_db)):
    """Mengambil riwayat mutasi stok untuk satu SKU (Kartu Stok)"""
    try:
        # 1. Ambil info barang
        barang = db.query(models.Barang).filter(models.Barang.kode_sku == kode_sku).first()
        if not barang:
            return {"success": False, "message": "Barang tidak ditemukan"}
            
        is_barang_jadi = "Barang Jadi" in (barang.kategori or "")
        
        mutasi = []
        
        # 2. Ambil dari Produksi (Jahit menambah Barang Jadi, Cutting mengurangi Bahan Baku)
        logs = db.query(models.ProductionLog).filter(models.ProductionLog.kode_sku == kode_sku).all()
        for l in logs:
            qty = l.qty_hasil or 0
            if l.divisi == "Jahit":
                # Masuk ke Barang Jadi
                mutasi.append({
                    "tanggal": l.tanggal,
                    "keterangan": f"Produksi Jahit: {l.nama_barang}",
                    "masuk": qty,
                    "keluar": 0,
                    "tipe": "PRODUKSI"
                })
            elif l.divisi == "Cutting":
                # Keluar dari Bahan Baku (Log ini biasanya mencatat hasil potong, bukan pemakaian kain)
                # Namun di sistem ini, log cutting mencatat berapa pcs yang dipotong.
                # Jika SKU yang dicari adalah Bahan Baku, pemakaian kain dicatat di Jurnal (51110).
                pass

        # 3. Ambil dari Penjualan (Mengurangi Barang Jadi)
        sales = db.query(models.DetailPenjualan).filter(models.DetailPenjualan.kode_sku == kode_sku).all()
        for s in sales:
            # Cari tanggal dari header
            header = db.query(models.HeaderPenjualan).filter(models.HeaderPenjualan.no_invoice == s.no_invoice).first()
            wib = datetime.timezone(datetime.timedelta(hours=7))
            tgl = header.tanggal if header else datetime.datetime.now(wib).replace(tzinfo=None)
            
            # Penjualan Normal (Keluar)
            mutasi.append({
                "tanggal": tgl,
                "keterangan": f"Penjualan: {s.no_invoice} ({(header.nama_customer if header else 'Umum')})",
                "masuk": 0,
                "keluar": s.qty_lusin * 12, # Konversi ke Pcs jika barang jadi
                "tipe": "PENJUALAN"
            })
            
            # Retur Penjualan (Masuk kembali)
            if s.qty_retur and s.qty_retur > 0:
                mutasi.append({
                    "tanggal": tgl, # Idealnya tanggal retur, tapi saat ini tersimpan di detail invoice
                    "keterangan": f"Retur Penjualan: {s.no_invoice} ({(header.nama_customer if header else 'Umum')})",
                    "masuk": s.qty_retur * 12,
                    "keluar": 0,
                    "tipe": "RETUR"
                })

        # 4. Ambil dari Pembelian (Menambah Bahan Baku)
        purchases = db.query(models.DetailPembelian).filter(models.DetailPembelian.kode_sku == kode_sku).all()
        for p in purchases:
            header = db.query(models.HeaderPembelian).filter(models.HeaderPembelian.no_po == p.no_po).first()
            wib = datetime.timezone(datetime.timedelta(hours=7))
            tgl = header.tanggal if header else datetime.datetime.now(wib).replace(tzinfo=None)
            mutasi.append({
                "tanggal": tgl,
                "keterangan": f"Pembelian: {p.no_po} ({(header.nama_supplier if header else 'Umum')})",
                "masuk": p.qty_kg,
                "keluar": 0,
                "tipe": "PEMBELIAN"
            })

        # 5. Ambil dari Jurnal Umum (Penyesuaian / Stock Opname / Pemakaian)
        # Cari jurnal yang mengandung SKU di keterangan dan akun persediaan (12110 atau 12150)
        kode_akun_psd = "12150" if is_barang_jadi else "12110"
        jurnals = db.query(models.JurnalUmum).filter(
            models.JurnalUmum.kode_akun == kode_akun_psd,
            models.JurnalUmum.keterangan.ilike(f"%{kode_sku}%")
        ).all()
        
        for j in jurnals:
            # Cek apakah sudah ada di mutasi (hindari double count dari jahit/penjualan yang juga menjurnal)
            # Biasanya keterangan jurnal otomatis mengandung tag (Jahit), (Jual), INV-, PO-, dll.
            skip_keywords = ["(Jahit)", "(Cutting)", "Penjualan", "PO-", "INV-", "(Jual)", "Retur"]
            if any(keyword in j.keterangan for keyword in skip_keywords):
                continue
                
            qty_adj = 0
            # Coba ekstrak qty dari keterangan jika ada format "... [Qty: 10] ..."
            import re
            match = re.search(r'\[Qty:\s*([\d\.]+)\]', j.keterangan)
            if match:
                qty_adj = float(match.group(1))
            else:
                # Jika tidak ada, kita asumsikan ini adjustment nilai uang, tapi user butuh Qty.
                # Untuk Stock Opname, biasanya ada qty.
                pass
            
            if j.debit > 0:
                mutasi.append({
                    "tanggal": j.tanggal,
                    "keterangan": j.keterangan,
                    "masuk": qty_adj,
                    "keluar": 0,
                    "tipe": "ADJUSTMENT"
                })
            else:
                mutasi.append({
                    "tanggal": j.tanggal,
                    "keterangan": j.keterangan,
                    "masuk": 0,
                    "keluar": qty_adj,
                    "tipe": "ADJUSTMENT"
                })

        # Urutkan berdasarkan tanggal
        mutasi.sort(key=lambda x: x["tanggal"])
        
        # Hitung Saldo Berjalan
        # Karena kita tidak punya snapshot saldo awal historis yang kaku, 
        # kita asumsikan stok saat ini adalah hasil akhir.
        # Jadi kita hitung mundur? Tidak, biasanya kartu stok mulai dari 0 atau Saldo Awal Sistem.
        
        return {
            "success": True,
            "barang": {
                "nama": barang.nama_barang,
                "sku": barang.kode_sku,
                "stok_akhir": barang.stok_saat_ini,
                "satuan": barang.satuan
            },
            "history": mutasi
        }
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {"success": False, "message": str(e)}

@router.post("/fix-hapus-jurnal-masal")
def fix_hapus_jurnal_masal(ids: list[int], db: Session = Depends(get_db)):
    """Hard Delete Jurnal berdasarkan ID (Untuk pembersihan data salah)"""
    try:
        deleted = db.query(models.JurnalUmum).filter(models.JurnalUmum.id.in_(ids)).delete(synchronize_session=False)
        db.commit()
        return {"status": "success", "message": f"{deleted} baris jurnal telah dihapus selamanya."}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

@router.get("/notifikasi-transaksi")
def get_transaction_notifications(limit: int = 15, db: Session = Depends(get_db)):
    """Ambil transaksi terbaru untuk notifikasi Owner/GM/SuperAdmin"""
    try:
        # Kita ambil jurnal terbaru, fokus pada akun Kas, Pendapatan, dan Biaya
        jurnals = db.query(models.JurnalUmum).order_by(models.JurnalUmum.id.desc()).limit(limit * 4).all()
        
        notifications = []
        seen_keys = set() # Untuk de-duplikasi pasangan debit/kredit
        
        for j in jurnals:
            # Key de-duplikasi: tanggal + keterangan + nominal
            nominal = abs((j.debit or 0) - (j.kredit or 0))
            if nominal == 0: continue
            
            key = f"{j.tanggal}_{j.keterangan}_{nominal}"
            if key in seen_keys: continue
            
            msg = ""
            icon = "notifications"
            color = "blue"
            
            # 1. Deteksi Penjualan (Akun 411)
            if j.kode_akun.startswith("411"):
                # Cari pasangannya apakah Kas atau Piutang
                is_cash = db.query(models.JurnalUmum).filter(
                    models.JurnalUmum.tanggal == j.tanggal,
                    models.JurnalUmum.keterangan == j.keterangan,
                    models.JurnalUmum.kode_akun.startswith(("11110", "11120"))
                ).first()
                tipe = "TUNAI" if is_cash else "KREDIT"
                
                # Ekstrak nama customer dari keterangan "Penjualan: ... (Nama)"
                import re
                cust_match = re.search(r'\((.*?)\)', j.keterangan)
                customer = cust_match.group(1) if cust_match else "Umum"
                
                msg = f"Ada transaksi penjualan sebesar Rp {nominal:,.0f} kepada {customer} dengan {tipe}"
                icon = "shopping_cart"
                color = "emerald"
                seen_keys.add(key)
            
            # 2. Deteksi Pembelian Barang (Bahan Baku / Jadi) - Akun 121 (Persediaan) yang didebit
            elif j.kode_akun.startswith("121") and (j.debit or 0) > 0:
                msg = f"Ada transaksi pengeluaran uang sebesar Rp {nominal:,.0f} untuk pembelian {j.nama_akun}"
                icon = "inventory_2"
                color = "orange"
                seen_keys.add(key)
                
            # 3. Deteksi Biaya Operasional (Akun 5xxx atau 6xxx)
            elif j.kode_akun.startswith(("5", "6")):
                msg = f"Ada transaksi pengeluaran uang hari ini untuk membayar {j.nama_akun} sebesar Rp {nominal:,.0f}"
                icon = "receipt_long"
                color = "rose"
                seen_keys.add(key)
            
            # 4. Transaksi Kas Lainnya (Mutasi / Setoran / Prive)
            elif j.kode_akun.startswith(("11110", "11120")):
                direction = "MASUK" if (j.debit or 0) > 0 else "KELUAR"
                msg = f"Ada transaksi uang kas {direction} sebesar Rp {nominal:,.0f} - {j.keterangan}"
                icon = "account_balance_wallet"
                color = "sky"
                seen_keys.add(key)

            if msg and len(notifications) < limit:
                notifications.append({
                    "id": j.id,
                    "message": msg,
                    "tanggal": j.tanggal.isoformat() + "Z",
                    "icon": icon,
                    "color": color
                })
        
        return {"success": True, "data": notifications}
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {"success": False, "message": str(e)}

def new_date(y, m, d):
    return datetime.datetime(y, m, d)
