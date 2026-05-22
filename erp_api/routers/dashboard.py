from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import get_db
import models
import schemas
import datetime
from sqlalchemy import func

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/balances")
def get_balances(db: Session = Depends(get_db)):
    try:
        # Menghitung saldo secara efisien hanya untuk akun Kas (11110) dan BCA (11120)
        tunai = db.query(func.sum(models.JurnalUmum.debit - models.JurnalUmum.kredit))\
            .filter(models.JurnalUmum.kode_akun == "11110").scalar() or 0
        bank = db.query(func.sum(models.JurnalUmum.debit - models.JurnalUmum.kredit))\
            .filter(models.JurnalUmum.kode_akun == "11120").scalar() or 0
        return {"success": True, "tunai": tunai, "bank": bank}
    except Exception as e:
        return {"success": False, "message": str(e), "tunai": 0, "bank": 0}

@router.get("/summary", response_model=schemas.DashboardResponse)
def get_dashboard_summary(db: Session = Depends(get_db)):
    try:
        wib = datetime.timezone(datetime.timedelta(hours=7))
        now = datetime.datetime.now(wib).replace(tzinfo=None)
        first_day = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Start of current week (Monday)
        start_of_week = now - datetime.timedelta(days=now.weekday())
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # 1. KEUANGAN
        try:
            jurnals = db.query(models.JurnalUmum).all()
            tunai, bank, masuk_ini, keluar_ini = 0, 0, 0, 0
            for j in jurnals:
                d, k = j.debit or 0, j.kredit or 0
                # 1a. Saldo Kas & Bank (Posisi Sekarang)
                if j.kode_akun == "11110": tunai += (d - k)
                elif j.kode_akun == "11120": bank += (d - k)
                
                # 1b. Ringkasan Arus Kas Bulan Ini (Cash-Flow Based)
                if j.tanggal and j.tanggal >= first_day:
                    kode_s = str(j.kode_akun)
                    
                    # Jika mutasi terjadi di akun Kas atau Bank (111xx)
                    if kode_s.startswith("111"):
                        # EXCLUDE INTERNAL TRANSFERS (Mutasi Kas <-> Bank)
                        # Agar tidak terhitung masuk/keluar ganda di dashboard
                        is_internal = any(x in (j.keterangan or "") for x in ["Penarikan Bank ke Kas", "Setoran Kas ke Bank", "Mutasi Internal"])
                        
                        if not is_internal:
                            masuk_ini += d  # Uang masuk ke kas/bank (bukan mutasi)
                            keluar_ini += k # Uang keluar dari kas/bank (bukan mutasi)
        except Exception as e:
            print(f"DEBUG Dashboard Keuangan Error: {e}")
            tunai, bank, masuk_ini, keluar_ini = 0, 0, 0, 0

        # 2. PENJUALAN
        try:
            # Ambil lebih banyak data (top 50) agar bisa difilter di frontend
            sales = db.query(models.HeaderPenjualan).order_by(models.HeaderPenjualan.tanggal.desc()).limit(50).all()
            penjualan_terkini = []
            for s in sales:
                # Dinamis berdasarkan status pembayaran
                if s.status == "RETUR TOTAL":
                    status_display = "RETUR"
                else:
                    status_display = "SELESAI" if s.status == "Lunas" else "BELUM"
                
                penjualan_terkini.append(schemas.PenjualanRecentItem(
                    no_invoice=s.no_invoice,
                    nama_produk=s.nama_customer,
                    total_tagihan=s.total_tagihan or 0,
                    uang_muka=s.uang_muka or 0,
                    diskon=s.diskon or 0,
                    status=status_display,
                    tanggal=s.tanggal.strftime("%Y-%m-%d") if s.tanggal else "-"
                ))
        except Exception as e:
            print(f"DEBUG Dashboard Penjualan Error: {e}")
            penjualan_terkini = []

        # 3. GUDANG (RE-STABILIZED)
        try:
            # Menggunakan ilike agar tidak sensitif huruf besar/kecil
            barang_jadi = db.query(models.Barang).filter(
                models.Barang.kategori.ilike("%Barang Jadi%")
            ).all()
            total_baju_pcs = sum(b.stok_saat_ini or 0 for b in barang_jadi)
            
            # Mengambil nilai estimasi dari saldo akun 12150 (Persediaan Barang Jadi)
            # as requested: "mengisinya dari nominal persediaan barang jadi"
            total_baju_nilai = db.query(func.sum(models.JurnalUmum.debit - models.JurnalUmum.kredit))\
                .filter(models.JurnalUmum.kode_akun == "12150").scalar() or 0
            
            # Jika saldo akun 0 atau negatif (karena data awal), fallback ke kalkulasi stok * modal jika ada
            if total_baju_nilai <= 0:
                total_baju_nilai = sum((b.stok_saat_ini or 0) * (b.harga_modal or 0) for b in barang_jadi)
            
            # 3a. Stok Kain (Bahan Baku)
            kain_all = db.query(models.Barang).filter(
                models.Barang.kategori.ilike("%Bahan Baku%") | 
                models.Barang.kategori.ilike("%Kain%")
            ).all()
            total_kain_kg = sum(k.stok_saat_ini or 0 for k in kain_all)
            
            # Urutkan berdasarkan stok terbanyak dan ambil 5 teratas yang tidak nol
            kain_sorted = sorted([k for k in kain_all if (k.stok_saat_ini or 0) > 0], 
                                key=lambda x: x.stok_saat_ini, reverse=True)
            detail_kain = [{"nama": k.nama_barang, "kg": k.stok_saat_ini} for k in kain_sorted[:5]]

            # 3b. TARGET & AKTUAL CUTTING (Mingguan)
            config = db.query(models.CompanyConfig).first()
            target_pcs = config.target_cutting_mingguan if config else 1000
            
            # Buffering: Karena DB menyimpan UTC (WIB-7)
            buffer_hours = 7
            start_of_week_utc = start_of_week - datetime.timedelta(hours=buffer_hours)

            # Hitung Aktual dari ProductionLog (Tanpa batas atas agar data terbaru masuk)
            actual_cutting = db.query(func.sum(models.ProductionLog.qty_hasil))\
                .filter(models.ProductionLog.divisi.ilike("Cutting"), models.ProductionLog.tanggal >= start_of_week_utc)\
                .scalar() or 0
            
            cutting_pct = (actual_cutting / target_pcs * 100) if target_pcs > 0 else 0
        except Exception as e:
            # Fallback jika ada error, minimal data stok muncul (hardcoded as debug)
            print(f"Stats Error Gudang: {e}")
            total_baju_pcs, total_baju_nilai, total_kain_kg, detail_kain = 0, 0, 0, []
            actual_cutting, target_pcs, cutting_pct = 0, 1000, 0

        # 4. HUTANG & PIUTANG (TOP 5)
        # Piutang Klien (Customer)
        piutang_list = db.query(models.Mitra).filter(models.Mitra.saldo_piutang > 0).order_by(models.Mitra.saldo_piutang.desc()).limit(5).all()
        top_piutang = [schemas.MitraDebtItem(mitra_id=m.id, nama_mitra=m.nama_mitra, nominal=m.saldo_piutang, kategori="PIUTANG KLIEN") for m in piutang_list]
        
        # Hutang Supplier
        utang_list = db.query(models.Mitra).filter(models.Mitra.saldo_utang > 0).order_by(models.Mitra.saldo_utang.desc()).limit(5).all()
        top_utang = [schemas.MitraDebtItem(mitra_id=m.id, nama_mitra=m.nama_mitra, nominal=m.saldo_utang, kategori="HUTANG SUPPLIER") for m in utang_list]

        # Kasbon Karyawan
        kasbon_list = db.query(models.Karyawan).filter(models.Karyawan.saldo_kasbon > 0).order_by(models.Karyawan.saldo_kasbon.desc()).limit(5).all()
        top_kasbon = [schemas.MitraDebtItem(mitra_id=k.id, nama_mitra=k.nama_karyawan, nominal=k.saldo_kasbon, kategori="KASBON") for k in kasbon_list]

        # 5. SALES ANALYTICS (NEW)
        try:
            # Time Ranges
            last_month_first = (first_day - datetime.timedelta(days=1)).replace(day=1)
            last_month_last = first_day - datetime.timedelta(seconds=1)
            
            last_week_start = start_of_week - datetime.timedelta(days=7)
            last_week_end = start_of_week - datetime.timedelta(seconds=1)
            
            # Helper for Sales Nominal (Account 41110 - Net Sales)
            def get_sales_nominal(start, end):
                sales = db.query(func.sum(models.JurnalUmum.kredit - models.JurnalUmum.debit))\
                    .filter(models.JurnalUmum.kode_akun == "41110", models.JurnalUmum.tanggal >= start, models.JurnalUmum.tanggal <= end).scalar() or 0
                returns = db.query(func.sum(models.JurnalUmum.debit - models.JurnalUmum.kredit))\
                    .filter(models.JurnalUmum.kode_akun == "41120", models.JurnalUmum.tanggal >= start, models.JurnalUmum.tanggal <= end).scalar() or 0
                return sales - returns
            
            # Helper for Total Pcs (DetailPenjualan)
            def get_total_pcs(start, end):
                return db.query(func.sum(models.DetailPenjualan.qty_lusin * 12))\
                    .join(models.HeaderPenjualan, models.HeaderPenjualan.no_invoice == models.DetailPenjualan.no_invoice)\
                    .filter(models.HeaderPenjualan.tanggal >= start, models.HeaderPenjualan.tanggal <= end).scalar() or 0

            s_this_month = get_sales_nominal(first_day, now)
            s_last_month = get_sales_nominal(last_month_first, last_month_last)
            
            s_this_week = get_sales_nominal(start_of_week, now)
            s_last_week = get_sales_nominal(last_week_start, last_week_end)
            
            pcs_this_month = get_total_pcs(first_day, now)
            pcs_this_week = get_total_pcs(start_of_week, now)
            
            def calc_pct(curr, prev):
                if prev == 0: return 100 if curr > 0 else 0
                return ((curr - prev) / prev) * 100
                
            sales_analytics = schemas.SalesAnalytics(
                nominal_bulan_ini=s_this_month,
                nominal_minggu_ini=s_this_week,
                perubahan_bulan_pct=calc_pct(s_this_month, s_last_month),
                perubahan_minggu_pct=calc_pct(s_this_week, s_last_week),
                total_pcs_terjual_bulan_ini=pcs_this_month,
                total_pcs_terjual_minggu_ini=pcs_this_week
            )
            
            # Helper for Total Produksi Jahit (Pcs)
            def get_total_produksi_jahit(start, end):
                buffer_h = 7
                start_utc = start - datetime.timedelta(hours=buffer_h)
                return db.query(func.sum(models.ProductionLog.qty_hasil))\
                    .filter(models.ProductionLog.divisi == "Jahit", models.ProductionLog.tanggal >= start_utc).scalar() or 0
                    
            prod_pcs_month = get_total_produksi_jahit(first_day, now)
            prod_pcs_week = get_total_produksi_jahit(start_of_week, now)
            
            first_day_utc = first_day - datetime.timedelta(hours=7)

            prod_detail_raw = db.query(
                models.ProductionLog.nama_barang, 
                func.sum(models.ProductionLog.qty_hasil).label("total_pcs")
            ).filter(
                models.ProductionLog.divisi == "Jahit", 
                models.ProductionLog.tanggal >= first_day_utc
            ).group_by(models.ProductionLog.nama_barang).all()
            
            detail_prod = [{"nama_barang": r.nama_barang, "qty_lusin": r.total_pcs / 12} for r in prod_detail_raw]
            
            production_analytics = schemas.ProductionAnalytics(
                total_lusin_bulan_ini=prod_pcs_month / 12,
                total_lusin_minggu_ini=prod_pcs_week / 12,
                detail_bulan_ini=detail_prod
            )
        except Exception as e:
            print(f"Stats Error Sales/Prod Analytics: {e}")
            sales_analytics = None
            production_analytics = None

        return schemas.DashboardResponse(
            keuangan=schemas.DashboardKeuangan(sisa_saldo_tunai=tunai, sisa_saldo_bank=bank, total_uang_masuk_bulan_ini=masuk_ini, total_uang_keluar_bulan_ini=keluar_ini, perubahan_kas_pct=0, perubahan_keluar_pct=0),
            penjualan_terkini=penjualan_terkini,
            sales_analytics=sales_analytics,
            production_analytics=production_analytics,
            gudang=schemas.GudangStatus(
                cutting_minggu_ini_pcs=actual_cutting, cutting_target_pcs=target_pcs, cutting_pct=cutting_pct,
                persediaan_baju_jadi_lusin=total_baju_pcs / 12 if total_baju_pcs else 0,
                persediaan_baju_jadi_nilai=total_baju_nilai,
                sisa_kain_kg=total_kain_kg,
                detail_kain=detail_kain
            ),
            top_piutang=top_piutang,
            top_utang=top_utang,
            top_kasbon=top_kasbon,
            tanggal_refresh=now.isoformat()
        )
    except Exception as e:
        print(f"Stats Error: {e}")
        wib = datetime.timezone(datetime.timedelta(hours=7))
        return schemas.DashboardResponse(
            keuangan=schemas.DashboardKeuangan(sisa_saldo_tunai=0, sisa_saldo_bank=0, total_uang_masuk_bulan_ini=0, total_uang_keluar_bulan_ini=0, perubahan_kas_pct=0, perubahan_keluar_pct=0),
            penjualan_terkini=[],
            gudang=schemas.GudangStatus(cutting_minggu_ini_pcs=0, cutting_target_pcs=0, cutting_pct=0, persediaan_baju_jadi_lusin=0, persediaan_baju_jadi_nilai=0, sisa_kain_kg=0, detail_kain=[]),
            top_piutang=[],
            top_utang=[],
            top_kasbon=[],
            tanggal_refresh=datetime.datetime.now(wib).isoformat()
        )

@router.get("/stats", response_model=schemas.DashboardStats)
def get_stats(db: Session = Depends(get_db)):
    # Biarkan endpoint ini ada untuk compatibility, tapi gunakan SQLite
    wib = datetime.timezone(datetime.timedelta(hours=7))
    now = datetime.datetime.now(wib).replace(tzinfo=None)
    first_day = now.replace(day=1)
    
    omzet = db.query(func.sum(models.JurnalUmum.kredit - models.JurnalUmum.debit)).filter(models.JurnalUmum.kode_akun == "41110", models.JurnalUmum.tanggal >= first_day).scalar() or 0
    hpp = db.query(func.sum(models.JurnalUmum.debit - models.JurnalUmum.kredit)).filter(models.JurnalUmum.kode_akun.startswith("5"), models.JurnalUmum.tanggal >= first_day).scalar() or 0
    biaya = db.query(func.sum(models.JurnalUmum.debit - models.JurnalUmum.kredit)).filter(models.JurnalUmum.kode_akun.startswith("6"), models.JurnalUmum.tanggal >= first_day).scalar() or 0
    saldo_kas = db.query(func.sum(models.JurnalUmum.debit - models.JurnalUmum.kredit)).filter(models.JurnalUmum.kode_akun.in_(["11110", "11120"])).scalar() or 0
    
    tot_piutang = db.query(func.sum(models.Mitra.saldo_piutang)).scalar() or 0
    tot_utang = db.query(func.sum(models.Mitra.saldo_utang)).scalar() or 0

    return schemas.DashboardStats(
        omzet_bulan_ini=omzet,
        laba_kotor=omzet - hpp,
        total_piutang=tot_piutang,
        total_utang=tot_utang,
        saldo_kas_bank=saldo_kas,
        biaya_operasional=biaya
    )

@router.post("/update-target")
def update_target(data: dict, db: Session = Depends(get_db)):
    try:
        new_target = data.get("target", 1000)
        config = db.query(models.CompanyConfig).first()
        if not config:
            config = models.CompanyConfig()
            db.add(config)
        
        config.target_cutting_mingguan = new_target
        db.commit()
        return {"success": True, "message": f"Target diperbarui ke {new_target} Pcs"}
    except Exception as e:
        db.rollback()
        return {"success": False, "message": str(e)}

@router.get("/detail-persediaan")
def get_detail_persediaan(db: Session = Depends(get_db)):
    """Detail persediaan baju jadi, dikelompokkan per model_code"""
    try:
        barang_jadi = db.query(models.Barang).filter(
            models.Barang.kategori.ilike("%Barang Jadi%"),
            models.Barang.is_active == 1
        ).order_by(models.Barang.model_code, models.Barang.nama_barang).all()

        grouped = {}
        for b in barang_jadi:
            code = b.model_code or "TANPA KODE"
            if code not in grouped:
                grouped[code] = {"model_code": code, "items": [], "total_stok_pcs": 0, "total_nilai": 0}
            
            stok = b.stok_saat_ini or 0
            nilai = stok * (b.harga_modal or 0)
            grouped[code]["items"].append({
                "id": b.id,
                "kode_sku": b.kode_sku,
                "nama_barang": b.nama_barang,
                "stok_pcs": stok,
                "stok_lusin": round(stok / 12, 2),
                "harga_modal": b.harga_modal or 0,
                "harga_jual": b.harga_jual or 0,
                "nilai_persediaan": nilai
            })
            grouped[code]["total_stok_pcs"] += stok
            grouped[code]["total_nilai"] += nilai

        result = sorted(grouped.values(), key=lambda x: x["total_stok_pcs"], reverse=True)
        grand_total_pcs = sum(g["total_stok_pcs"] for g in result)
        grand_total_nilai = sum(g["total_nilai"] for g in result)

        return {
            "success": True,
            "data": result,
            "grand_total_pcs": grand_total_pcs,
            "grand_total_lusin": round(grand_total_pcs / 12, 2),
            "grand_total_nilai": grand_total_nilai
        }
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {"success": False, "message": str(e)}

@router.get("/detail-kain")
def get_detail_kain(db: Session = Depends(get_db)):
    """Detail sisa kain produksi, dikelompokkan per jenis kain"""
    try:
        kain_all = db.query(models.Barang).filter(
            (models.Barang.kategori.ilike("%Bahan Baku%") | models.Barang.kategori.ilike("%Kain%")),
            models.Barang.is_active == 1
        ).order_by(models.Barang.nama_barang).all()

        grouped = {}
        for b in kain_all:
            # Grouping by the first word of nama_barang (e.g. TC, CVC, Katun)
            if b.nama_barang:
                jenis = b.nama_barang.split(" ")[0].upper()
            else:
                jenis = "LAINNYA"

            if jenis not in grouped:
                grouped[jenis] = {"jenis": jenis, "items": [], "total_stok_kg": 0, "total_nilai": 0}
            
            stok = b.stok_saat_ini or 0
            nilai = stok * (b.harga_modal or 0)
            grouped[jenis]["items"].append({
                "id": b.id,
                "kode_sku": b.kode_sku,
                "nama_barang": b.nama_barang,
                "stok_kg": stok,
                "harga_modal": b.harga_modal or 0,
                "nilai_persediaan": nilai
            })
            grouped[jenis]["total_stok_kg"] += stok
            grouped[jenis]["total_nilai"] += nilai

        result = sorted(grouped.values(), key=lambda x: x["total_stok_kg"], reverse=True)
        grand_total_kg = sum(g["total_stok_kg"] for g in result)
        grand_total_nilai = sum(g["total_nilai"] for g in result)

        return {
            "success": True,
            "data": result,
            "grand_total_kg": grand_total_kg,
            "grand_total_nilai": grand_total_nilai
        }
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {"success": False, "message": str(e)}

@router.post("/reconcile")
def reconcile_data(db: Session = Depends(get_db)):
    """Fitur Darurat untuk memperbaiki konsistensi data jurnal"""
    try:
        # 1. Sinkronkan Nama Akun Jurnal dengan COA
        all_accounts = db.query(models.AkunBukuBesar).all()
        sync_count = 0
        for acc in all_accounts:
            res = db.query(models.JurnalUmum).filter(
                models.JurnalUmum.kode_akun == acc.kode_akun,
                models.JurnalUmum.nama_akun != acc.nama_akun
            ).update({models.JurnalUmum.nama_akun: acc.nama_akun}, synchronize_session=False)
            sync_count += res
            
        # 2. Rekonsiliasi Saldo Piutang & Utang Mitra dari Jurnal Umum
        from sqlalchemy import or_
        mitras = db.query(models.Mitra).all()
        mitra_updated = 0
        for m in mitras:
            nama_mitra = m.nama_mitra
            if m.kategori == "Customer / Klien" or "customer" in m.kategori.lower():
                # Hitung Piutang (Debit - Kredit untuk akun 11210)
                filters = [models.JurnalUmum.keterangan.contains(nama_mitra)]
                inv_list = db.query(models.HeaderPenjualan.no_invoice).filter(models.HeaderPenjualan.nama_customer == nama_mitra).all()
                for inv in inv_list:
                    filters.append(models.JurnalUmum.keterangan.contains(inv.no_invoice))
                
                saldo_jurnal = db.query(func.sum(models.JurnalUmum.debit - models.JurnalUmum.kredit)).filter(
                    models.JurnalUmum.kode_akun == "11210",
                    or_(*filters)
                ).scalar() or 0.0
                
                new_val = max(0.0, float(saldo_jurnal))
                if abs((m.saldo_piutang or 0.0) - new_val) > 0.01:
                    m.saldo_piutang = new_val
                    mitra_updated += 1
            else:
                # Hitung Utang (Kredit - Debit untuk akun 21110)
                filters = [models.JurnalUmum.keterangan.contains(nama_mitra)]
                po_list = db.query(models.HeaderPembelian.no_po).filter(models.HeaderPembelian.nama_supplier == nama_mitra).all()
                for po in po_list:
                    filters.append(models.JurnalUmum.keterangan.contains(po.no_po))
                
                saldo_jurnal = db.query(func.sum(models.JurnalUmum.kredit - models.JurnalUmum.debit)).filter(
                    models.JurnalUmum.kode_akun == "21110",
                    or_(*filters)
                ).scalar() or 0.0
                
                new_val = max(0.0, float(saldo_jurnal))
                if abs((m.saldo_utang or 0.0) - new_val) > 0.01:
                    m.saldo_utang = new_val
                    mitra_updated += 1

        # 3. Rekonsiliasi Saldo Kasbon Karyawan dari Jurnal Umum (11220)
        karyawans = db.query(models.Karyawan).all()
        kary_updated = 0
        for k in karyawans:
            nama_karyawan = k.nama_karyawan
            filters = [models.JurnalUmum.keterangan.contains(nama_karyawan)]
            
            saldo_jurnal = db.query(func.sum(models.JurnalUmum.debit - models.JurnalUmum.kredit)).filter(
                models.JurnalUmum.kode_akun == "11220",
                or_(*filters)
            ).scalar() or 0.0
            
            new_val = max(0.0, float(saldo_jurnal))
            if abs((k.saldo_kasbon or 0.0) - new_val) > 0.01:
                k.saldo_kasbon = new_val
                kary_updated += 1
        
        db.commit()
        return {
            "success": True, 
            "message": f"Rekonsiliasi selesai. {sync_count} nama akun diseragamkan. {mitra_updated} saldo mitra & {kary_updated} kasbon disinkronkan ke buku besar."
        }
    except Exception as e:
        db.rollback()
        return {"success": False, "message": str(e)}

