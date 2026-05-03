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
            sales = db.query(models.HeaderPenjualan).order_by(models.HeaderPenjualan.tanggal.desc()).limit(5).all()
            penjualan_terkini = []
            for s in sales:
                penjualan_terkini.append(schemas.PenjualanRecentItem(
                    no_invoice=s.no_invoice,
                    nama_produk=s.nama_customer,
                    total_tagihan=s.total_tagihan or 0,
                    status="SELESAI",
                    tanggal=s.tanggal.strftime("%Y-%m-%d") if s.tanggal else "-"
                ))
        except Exception as e:
            print(f"DEBUG Dashboard Penjualan Error: {e}")
            penjualan_terkini = []

        # 3. GUDANG
        try:
            barang_jadi = db.query(models.Barang).filter(models.Barang.kategori.in_(["BARANG_JADI", "Barang Jadi (Baju)"])).all()
            total_baju_pcs = sum(b.stok_saat_ini or 0 for b in barang_jadi)
            total_baju_nilai = sum((b.stok_saat_ini or 0) * (b.harga_modal or 0) for b in barang_jadi)
            
            kain = db.query(models.Barang).filter(models.Barang.kategori.in_(["BAHAN_BAKU", "Bahan Baku (Kain)"])).all()
            total_kain_kg = sum(k.stok_saat_ini or 0 for k in kain)
            detail_kain = [{"nama": k.nama_barang, "kg": k.stok_saat_ini or 0} for k in kain[:5]]
        except Exception as e:
            print(f"DEBUG Dashboard Gudang Error: {e}")
            total_baju_pcs, total_baju_nilai, total_kain_kg, detail_kain = 0, 0, 0, []

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

        return schemas.DashboardResponse(
            keuangan=schemas.DashboardKeuangan(sisa_saldo_tunai=tunai, sisa_saldo_bank=bank, total_uang_masuk_bulan_ini=masuk_ini, total_uang_keluar_bulan_ini=keluar_ini, perubahan_kas_pct=0, perubahan_keluar_pct=0),
            penjualan_terkini=penjualan_terkini,
            gudang=schemas.GudangStatus(
                cutting_minggu_ini_pcs=0, cutting_target_pcs=1000, cutting_pct=0,
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

