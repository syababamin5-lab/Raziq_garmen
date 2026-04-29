from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import get_db
import models
import schemas
import datetime
from sqlalchemy import func

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=schemas.DashboardResponse)
def get_dashboard_summary(db: Session = Depends(get_db)):
    try:
        now = datetime.datetime.now()
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
                if j.kode_akun == "11110": tunai += (d - k)
                elif j.kode_akun == "11120": bank += (d - k)
                if j.tanggal and j.tanggal >= first_day:
                    if str(j.kode_akun).startswith("4"): masuk_ini += (k - d)
                    elif str(j.kode_akun).startswith(("5", "6")): keluar_ini += (d - k)
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
            
            kain = db.query(models.Barang).filter(
                models.Barang.kategori.ilike("%Bahan Baku%") | 
                models.Barang.kategori.ilike("%Kain%")
            ).all()
            total_kain_kg = sum(k.stok_saat_ini or 0 for k in kain)
            detail_kain = [{"nama": k.nama_barang, "kg": k.stok_saat_ini or 0} for k in kain[:5]]

            # 3b. TARGET & AKTUAL CUTTING (Mingguan)
            config = db.query(models.CompanyConfig).first()
            target_pcs = config.target_cutting_mingguan if config else 1000
            
            # Hitung Aktual dari ProductionLog
            actual_cutting = db.query(func.sum(models.ProductionLog.qty_hasil))\
                .filter(models.ProductionLog.divisi == "Cutting", models.ProductionLog.tanggal >= start_of_week)\
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
        top_piutang = [schemas.MitraDebtItem(nama_mitra=m.nama_mitra, nominal=m.saldo_piutang, kategori="PIUTANG KLIEN") for m in piutang_list]
        
        # Hutang Supplier
        utang_list = db.query(models.Mitra).filter(models.Mitra.saldo_utang > 0).order_by(models.Mitra.saldo_utang.desc()).limit(5).all()
        top_utang = [schemas.MitraDebtItem(nama_mitra=m.nama_mitra, nominal=m.saldo_utang, kategori="HUTANG SUPPLIER") for m in utang_list]

        # Kasbon Karyawan
        kasbon_list = db.query(models.Karyawan).filter(models.Karyawan.saldo_kasbon > 0).order_by(models.Karyawan.saldo_kasbon.desc()).limit(5).all()
        top_kasbon = [schemas.MitraDebtItem(nama_mitra=k.nama_karyawan, nominal=k.saldo_kasbon, kategori="KASBON") for k in kasbon_list]

        # 5. SALES ANALYTICS (NEW)
        try:
            # Time Ranges
            last_month_first = (first_day - datetime.timedelta(days=1)).replace(day=1)
            last_month_last = first_day - datetime.timedelta(seconds=1)
            
            last_week_start = start_of_week - datetime.timedelta(days=7)
            last_week_end = start_of_week - datetime.timedelta(seconds=1)
            
            # Helper for Sales Nominal (Account 41110)
            def get_sales_nominal(start, end):
                return db.query(func.sum(models.JurnalUmum.kredit - models.JurnalUmum.debit))\
                    .filter(models.JurnalUmum.kode_akun == "41110", models.JurnalUmum.tanggal >= start, models.JurnalUmum.tanggal <= end).scalar() or 0
            
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
                return db.query(func.sum(models.ProductionLog.qty_hasil))\
                    .filter(models.ProductionLog.divisi == "Jahit", models.ProductionLog.tanggal >= start, models.ProductionLog.tanggal <= end).scalar() or 0
                    
            prod_pcs_month = get_total_produksi_jahit(first_day, now)
            prod_pcs_week = get_total_produksi_jahit(start_of_week, now)
            
            prod_detail_raw = db.query(
                models.ProductionLog.nama_barang, 
                func.sum(models.ProductionLog.qty_hasil).label("total_pcs")
            ).filter(
                models.ProductionLog.divisi == "Jahit", 
                models.ProductionLog.tanggal >= first_day, 
                models.ProductionLog.tanggal <= now
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
        # Return empty data instead of failing
        return schemas.DashboardResponse(
            keuangan=schemas.DashboardKeuangan(sisa_saldo_tunai=0, sisa_saldo_bank=0, total_uang_masuk_bulan_ini=0, total_uang_keluar_bulan_ini=0, perubahan_kas_pct=0, perubahan_keluar_pct=0),
            penjualan_terkini=[],
            gudang=schemas.GudangStatus(cutting_minggu_ini_pcs=0, cutting_target_pcs=0, cutting_pct=0, persediaan_baju_jadi_lusin=0, persediaan_baju_jadi_nilai=0, sisa_kain_kg=0, detail_kain=[]),
            top_piutang=[],
            top_utang=[],
            top_kasbon=[],
            tanggal_refresh=datetime.datetime.now().isoformat()
        )

@router.get("/stats", response_model=schemas.DashboardStats)
def get_stats(db: Session = Depends(get_db)):
    # Biarkan endpoint ini ada untuk compatibility, tapi gunakan SQLite
    now = datetime.datetime.now()
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

