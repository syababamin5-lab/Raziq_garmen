import datetime
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models import get_db
from utils import merge_date_time
import models
from schemas import (
    APIResponse, ProduksiOptionsResponse, SelectOption, 
    CuttingRequest, JahitRequest,
    RekapCuttingResponse, RekapCuttingItem,
    WipResponse, WipItem,
    SaldoAwalWipRequest, SaldoAwalWipItem, SaldoAwalWipListResponse
)
from utils import format_rp

router = APIRouter(prefix="/api/produksi", tags=["Produksi"])

@router.get("/options", response_model=APIResponse)
def get_produksi_options(db: Session = Depends(get_db)):
    try:
        karyawans = db.query(models.Karyawan).all()
        barangs = db.query(models.Barang).all()

        k_list = [SelectOption(id=k.id, label=k.nama_karyawan) for k in karyawans]
        
        kn_list = []
        b_list = []
        for b in barangs:
            if b.kategori == "Bahan Baku (Kain)":
                kn_list.append(SelectOption(id=b.id, label=f"{b.nama_barang} (Stok: {b.stok_saat_ini:g} Kg)", stok_saat_ini=b.stok_saat_ini, harga_modal=b.harga_modal))
            elif b.kategori == "Barang Jadi (Baju)":
                b_list.append(SelectOption(id=b.id, label=f"{b.kode_sku} - {b.nama_barang}", kode_sku=b.kode_sku, harga_modal=b.harga_modal))

        return APIResponse(
            success=True,
            message="Options fetched from Local DB",
            data=ProduksiOptionsResponse(kain_list=kn_list, baju_list=b_list, karyawan_list=k_list).dict()
        )
    except Exception as e:
        return APIResponse(success=False, message=str(e))

@router.post("/cutting", response_model=APIResponse)
def submit_cutting(payload: CuttingRequest, db: Session = Depends(get_db)):
    try:
        waktu_transaksi = merge_date_time(payload.tgl_cutting)
        kain = db.query(models.Barang).filter(models.Barang.id == payload.kain_id).first()
        produk = db.query(models.Barang).filter(models.Barang.id == payload.produk_id).first()
        karyawan = db.query(models.Karyawan).filter(models.Karyawan.id == payload.tukang_potong_id).first()

        if not kain or not produk or not karyawan:
            return APIResponse(success=False, message="Data referensi tidak ditemukan.")

        if payload.kg_pakai > (kain.stok_saat_ini):
            return APIResponse(success=False, message=f"Stok kain tidak cukup! Sisa: {kain.stok_saat_ini:g} Kg")

        # Update Stok Kain
        kain.stok_saat_ini -= payload.kg_pakai
        
        nilai_kain_terpakai = payload.kg_pakai * (kain.harga_modal or 0)
        total_upah = payload.hasil_pcs * payload.ongkos_per_pcs
        ket_jurnal = f"Cutting {payload.hasil_pcs} pcs dari {payload.kg_pakai}kg {kain.nama_barang} [SKU:{produk.kode_sku}] [Potong: {karyawan.nama_karyawan} | Upah: {total_upah}]"

        # Jurnal Pemakaian Bahan Baku
        db.add(models.JurnalUmum(
            tanggal=waktu_transaksi, 
            kode_akun="51110", nama_akun="Pemakaian Bahan Baku", 
            keterangan=ket_jurnal, debit=nilai_kain_terpakai, kredit=0
        ))
        db.add(models.JurnalUmum(
            tanggal=waktu_transaksi, 
            kode_akun="12110", nama_akun="Persediaan Bahan Baku (Kain)", 
            keterangan=f"Pemakaian Kain {kain.nama_barang}", debit=0, kredit=nilai_kain_terpakai
        ))

        # Jurnal Pengakuan Utang Upah (BTKL) - IFRS Compliance
        if total_upah > 0:
            db.add(models.JurnalUmum(
                tanggal=waktu_transaksi,
                kode_akun="51210", nama_akun="BTKL - Upah Cutting",
                keterangan=f"Upah Potong {payload.hasil_pcs} pcs - {karyawan.nama_karyawan}",
                debit=total_upah, kredit=0
            ))
            db.add(models.JurnalUmum(
                tanggal=waktu_transaksi,
                kode_akun="21210", nama_akun="Utang Gaji & Upah",
                keterangan=f"Hutang Upah Potong - {karyawan.nama_karyawan}",
                debit=0, kredit=total_upah
            ))

        # Log Produksi untuk Dashboard (Cutting)
        db.add(models.ProductionLog(
            tanggal=waktu_transaksi,
            divisi="Cutting",
            kode_sku=produk.kode_sku,
            nama_barang=produk.nama_barang,
            qty_hasil=payload.hasil_pcs,
            karyawan_id=payload.tukang_potong_id
        ))

        db.commit()
        return APIResponse(success=True, message=f"Berhasil! Stok {kain.nama_barang} berkurang.")
    except Exception as e:
        db.rollback()
        return APIResponse(success=False, message=str(e))

@router.post("/jahit", response_model=APIResponse)
def submit_jahit(payload: JahitRequest, db: Session = Depends(get_db)):
    try:
        waktu_transaksi = merge_date_time(payload.tgl_jahit)
        produk = db.query(models.Barang).filter(models.Barang.id == payload.produk_id).first()
        if not produk: return APIResponse(success=False, message="Produk tidak ditemukan")

        total_pcs = int(payload.qty_lusin * 12)
        produk.stok_saat_ini += total_pcs

        # Kalkulasi HPP Dinamis (Bahan + Upah) berdasarkan riwayat Cutting
        jurnals_cut = db.query(models.JurnalUmum).filter(
            models.JurnalUmum.kode_akun == "51110",
            models.JurnalUmum.keterangan.like(f"%[SKU:{produk.kode_sku}]%")
        ).all()
        
        total_kain_rp = 0.0
        total_upah_rp = 0.0
        total_pcs_potong = 0
        
        # 1. Hitung dari Jurnal Cutting Reguler
        for j in jurnals_cut:
            total_kain_rp += j.debit
            ket = str(j.keterangan)
            try:
                if "Upah: " in ket:
                    upah_str = ket.split("Upah: ")[1].split("]")[0].strip()
                    total_upah_rp += float(upah_str)
                pcs_match = re.search(r'Cutting (\d+) pcs', ket)
                if pcs_match:
                    total_pcs_potong += int(pcs_match.group(1))
            except:
                pass

        # 2. Tambahkan dari Saldo Awal WIP (jika ada)
        wip_awals = db.query(models.WipSaldoAwal).filter(models.WipSaldoAwal.kode_sku == produk.kode_sku).all()
        modal_wip_awal = 0.0
        for wa in wip_awals:
            total_kain_rp += wa.modal_bahan_baku
            total_upah_rp += wa.modal_upah_cutting + wa.modal_lain
            total_pcs_potong += wa.qty_pcs
            modal_wip_awal += wa.total_modal_terserap
                
        if total_pcs_potong > 0:
            hpp_per_pcs = (total_kain_rp + total_upah_rp) / total_pcs_potong
            produk.harga_modal = hpp_per_pcs # Update Harga Modal (HPP) ke tabel Barang!
        else:
            hpp_per_pcs = produk.harga_modal or 0.0

        nilai_masuk = total_pcs * hpp_per_pcs

        # Proporsi nilai yang diambil dari WIP Awal vs Produksi Reguler
        # Jika total_pcs_potong > 0, kita ambil proporsional dari modal_wip_awal
        nilai_dari_wip = 0.0
        if total_pcs_potong > 0:
            nilai_dari_wip = (modal_wip_awal / total_pcs_potong) * total_pcs
            # Jangan melebihi modal yang tersedia di WIP Awal
            nilai_dari_wip = min(nilai_dari_wip, modal_wip_awal)

        nilai_dari_produksi = nilai_masuk - nilai_dari_wip

        db.add(models.JurnalUmum(tanggal=waktu_transaksi, kode_akun="12150", nama_akun="Persediaan Barang Jadi", keterangan=f"Masuk {total_pcs} pcs {produk.kode_sku} (Jahit)", debit=nilai_masuk, kredit=0))
        
        if nilai_dari_produksi > 0:
            db.add(models.JurnalUmum(tanggal=waktu_transaksi, kode_akun="51199", nama_akun="Ikhtisar Produksi", keterangan=f"Masuk Gudang {produk.kode_sku} (Produksi)", debit=0, kredit=nilai_dari_produksi))
        
        if nilai_dari_wip > 0:
            db.add(models.JurnalUmum(tanggal=waktu_transaksi, kode_akun="12130", nama_akun="Persediaan Barang Dalam Proses (WIP)", keterangan=f"Masuk Gudang {produk.kode_sku} (Pelunasan WIP Awal)", debit=0, kredit=nilai_dari_wip))

        # Log Produksi untuk Dashboard (Jahit)
        db.add(models.ProductionLog(
            tanggal=waktu_transaksi,
            divisi="Jahit",
            kode_sku=produk.kode_sku,
            nama_barang=produk.nama_barang,
            qty_hasil=total_pcs
        ))

        db.commit()
        return APIResponse(success=True, message=f"Berhasil! Masuk {payload.qty_lusin} lusin ke gudang.")
    except Exception as e:
        db.rollback()
        return APIResponse(success=False, message=str(e))

@router.get("/rekap-cutting", response_model=APIResponse)
def get_rekap_cutting(db: Session = Depends(get_db)):
    try:
        # Filter ledger untuk cutting
        jurnals = db.query(models.JurnalUmum).filter(models.JurnalUmum.kode_akun == "51110").order_by(models.JurnalUmum.tanggal.desc()).limit(100).all()
        
        data_rekap = []
        group_map = {}

        for j in jurnals:
            ket = str(j.keterangan)
            if "[Potong:" in ket:
                try:
                    info_potong = ket.split("[Potong: ")[1].split("]")[0] 
                    nama = info_potong.split(" | ")[0].strip()
                    upah = float(info_potong.split("Upah: ")[1].strip())
                    pcs_match = re.search(r'Cutting (\d+) pcs', ket)
                    pcs = int(pcs_match.group(1)) if pcs_match else 0
                    
                    data_rekap.append(RekapCuttingItem(waktu=j.tanggal.strftime("%Y-%m-%d %H:%M"), tukang_potong=nama, hasil_potong=f"{pcs} Pcs", tagihan_upah=upah))
                    group_map[nama] = group_map.get(nama, 0) + upah
                except: pass

        group_karyawan = [{"tukang_potong": k, "total_upah": v, "total_upah_rp": format_rp(v)} for k, v in group_map.items()]
        return APIResponse(success=True, message="Rekap fetched from Local DB", data=RekapCuttingResponse(rincian_harian=data_rekap, group_karyawan=group_karyawan).dict())
    except Exception as e:
        return APIResponse(success=False, message=str(e))

@router.get("/wip", response_model=APIResponse)
def get_wip(db: Session = Depends(get_db)):
    try:
        jurnals_cut = db.query(models.JurnalUmum).filter(models.JurnalUmum.kode_akun == "51110").all()
        jurnals_jahit = db.query(models.JurnalUmum).filter(models.JurnalUmum.kode_akun == "12150").all()
        wip_awal = db.query(models.WipSaldoAwal).all()
        barangs = db.query(models.Barang).filter(models.Barang.kategori == "Barang Jadi (Baju)").all()
        
        barang_d = {b.kode_sku: b.nama_barang for b in barangs}
        
        cut_map = {}
        # 1. Tambahkan Saldo Awal WIP ke peta pemotongan
        for wa in wip_awal:
            sku = wa.kode_sku
            cut_map[sku] = cut_map.get(sku, 0) + wa.qty_pcs
        
        # 2. Tambahkan hasil cutting reguler dari jurnal
        for j in jurnals_cut:
            ket = str(j.keterangan)
            if "Cutting" in ket:
                pm = re.search(r'Cutting (\d+) pcs', ket)
                sm = re.search(r'\[SKU:([^\]]+)\]', ket)
                if pm:
                    sku = sm.group(1).strip() if sm else "—"
                    cut_map[sku] = cut_map.get(sku, 0) + int(pm.group(1))

        jht_map = {}
        for j in jurnals_jahit:
            ket = str(j.keterangan)
            if "Jahit" in ket:
                m = re.search(r'Masuk (\d+) pcs (.*?) \(Jahit\)', ket)
                if m:
                    sku = m.group(2).strip()
                    jht_map[sku] = jht_map.get(sku, 0) + int(m.group(1))

        all_skus = set(cut_map.keys()).union(set(jht_map.keys()))
        wip_list = []
        tot_p = tot_j = tot_s = 0
        for sku in all_skus:
            p, j = cut_map.get(sku, 0), jht_map.get(sku, 0)
            s = p - j
            tot_p += p; tot_j += j; tot_s += s
            wip_list.append(WipItem(kode_sku=sku, nama_barang=barang_d.get(sku, "Tidak Diketahui"), total_potong=p, total_jahit=j, sisa_wip=s))

        wip_list.sort(key=lambda x: x.sisa_wip, reverse=True)
        return APIResponse(success=True, message="WIP fetched from Local DB", data=WipResponse(data=wip_list, total_potong=tot_p, total_jahit=tot_j, sisa_wip=tot_s).dict())
    except Exception as e:
        return APIResponse(success=False, message=str(e))


# ==========================================================================
# SALDO AWAL WIP (Setup Cut-off / Transisi Sistem)
# ==========================================================================
@router.post("/saldo-awal-wip", response_model=APIResponse)
def submit_saldo_awal_wip(payload: SaldoAwalWipRequest, db: Session = Depends(get_db)):
    """
    Mencatat Saldo Awal Persediaan Barang Dalam Proses (WIP) untuk keperluan
    setup / cut-off saat sistem pertama kali digunakan.

    ATURAN AKUNTANSI MUTLAK yang dijaga di sini:
    ✅ DEBIT  : 12130 - Persediaan Barang Dalam Proses (WIP)
    ✅ KREDIT : 31120 - Ekuitas - Saldo Awal Setup
    ❌ DILARANG menyentuh: stok bahan baku, kas tunai, bank, utang dagang.
    """
    try:
        produk = db.query(models.Barang).filter(models.Barang.id == payload.produk_id).first()
        if not produk:
            return APIResponse(success=False, message="Produk tidak ditemukan.")
        if produk.kategori not in ["Barang Jadi (Baju)", "BARANG_JADI"]:
            return APIResponse(success=False, message="Produk harus berjenis 'Barang Jadi (Baju)'.")
        if payload.qty_pcs <= 0:
            return APIResponse(success=False, message="Jumlah pcs harus lebih dari 0.")

        total_modal = (
            (payload.modal_bahan_baku or 0.0) +
            (payload.modal_upah_cutting or 0.0) +
            (payload.modal_lain or 0.0)
        )
        if total_modal <= 0:
            return APIResponse(success=False, message="Total modal mengendap harus lebih dari 0. Masukkan nominal biaya yang sudah terserap.")

        # Parse tanggal cutoff
        waktu_cutoff = merge_date_time(payload.tanggal_cutoff)

        keterangan_jurnal = (
            f"[SETUP WIP AWAL] {payload.qty_pcs} pcs {produk.nama_barang} "
            f"(SKU:{produk.kode_sku}) | Tahap: {payload.tahap_saat_ini} | "
            f"Bahan: {payload.modal_bahan_baku:,.0f} | Upah: {payload.modal_upah_cutting:,.0f} | "
            f"Lain: {payload.modal_lain:,.0f}"
        )

        # ── JURNAL SETUP (TIDAK menyentuh kas/stok/utang) ─────────────────
        # Debit : Persediaan WIP
        db.add(models.JurnalUmum(
            tanggal=waktu_cutoff,
            kode_akun="12130",
            nama_akun="Persediaan Barang Dalam Proses (WIP)",
            keterangan=keterangan_jurnal,
            debit=total_modal,
            kredit=0.0
        ))
        # Kredit: Ekuitas Saldo Awal Setup
        db.add(models.JurnalUmum(
            tanggal=waktu_cutoff,
            kode_akun="31120",
            nama_akun="Ekuitas - Saldo Awal Setup",
            keterangan=keterangan_jurnal,
            debit=0.0,
            kredit=total_modal
        ))
        # ──────────────────────────────────────────────────────────────────

        # Simpan catatan di tabel khusus wip_saldo_awal untuk audit trail
        wip_entry = models.WipSaldoAwal(
            tanggal_cutoff=waktu_cutoff,
            kode_sku=produk.kode_sku,
            nama_barang=produk.nama_barang,
            qty_pcs=payload.qty_pcs,
            tahap_saat_ini=payload.tahap_saat_ini,
            modal_bahan_baku=payload.modal_bahan_baku or 0.0,
            modal_upah_cutting=payload.modal_upah_cutting or 0.0,
            modal_lain=payload.modal_lain or 0.0,
            total_modal_terserap=total_modal,
            keterangan=payload.keterangan or "",
            dibuat_oleh=payload.dibuat_oleh or "admin"
        )
        db.add(wip_entry)
        db.commit()

        hpp_per_pcs = total_modal / payload.qty_pcs
        return APIResponse(
            success=True,
            message=(
                f"✅ Saldo Awal WIP berhasil dicatat! "
                f"{payload.qty_pcs} pcs {produk.nama_barang} senilai Rp {total_modal:,.0f} "
                f"(HPP awal: Rp {hpp_per_pcs:,.0f}/pcs). "
                f"Stok kain & Kas/Bank TIDAK terpengaruh."
            )
        )
    except Exception as e:
        db.rollback()
        return APIResponse(success=False, message=str(e))


@router.get("/saldo-awal-wip", response_model=APIResponse)
def get_saldo_awal_wip(db: Session = Depends(get_db)):
    """Mengambil daftar seluruh entri Saldo Awal WIP yang sudah diinput."""
    try:
        entries = db.query(models.WipSaldoAwal).order_by(models.WipSaldoAwal.tanggal_cutoff.desc()).all()
        result = []
        total_qty = 0
        total_nilai = 0.0

        for e in entries:
            hpp = (e.total_modal_terserap / e.qty_pcs) if e.qty_pcs > 0 else 0.0
            result.append(SaldoAwalWipItem(
                id=e.id,
                tanggal_cutoff=e.tanggal_cutoff.strftime("%Y-%m-%d") if e.tanggal_cutoff else "",
                tanggal_input=e.tanggal_input.strftime("%Y-%m-%d %H:%M") if e.tanggal_input else "",
                kode_sku=e.kode_sku,
                nama_barang=e.nama_barang,
                qty_pcs=e.qty_pcs,
                tahap_saat_ini=e.tahap_saat_ini,
                modal_bahan_baku=e.modal_bahan_baku or 0.0,
                modal_upah_cutting=e.modal_upah_cutting or 0.0,
                modal_lain=e.modal_lain or 0.0,
                total_modal_terserap=e.total_modal_terserap or 0.0,
                hpp_per_pcs=hpp,
                keterangan=e.keterangan or "",
                dibuat_oleh=e.dibuat_oleh or ""
            ))
            total_qty += e.qty_pcs
            total_nilai += (e.total_modal_terserap or 0.0)

        return APIResponse(
            success=True,
            message=f"{len(result)} entri WIP awal ditemukan.",
            data=SaldoAwalWipListResponse(
                data=result,
                total_qty_pcs=total_qty,
                total_nilai_wip=total_nilai
            ).dict()
        )
    except Exception as e:
        return APIResponse(success=False, message=str(e))


@router.delete("/saldo-awal-wip/{entry_id}", response_model=APIResponse)
def delete_saldo_awal_wip(entry_id: int, db: Session = Depends(get_db)):
    """Menghapus entri Saldo Awal WIP beserta jurnal yang menyertainya."""
    try:
        entry = db.query(models.WipSaldoAwal).filter(models.WipSaldoAwal.id == entry_id).first()
        if not entry:
            return APIResponse(success=False, message="Entri tidak ditemukan.")

        # Hapus jurnal terkait berdasarkan keterangan unik
        keterangan_target = f"[SETUP WIP AWAL] {entry.qty_pcs} pcs {entry.nama_barang}"
        db.query(models.JurnalUmum).filter(
            models.JurnalUmum.keterangan.like(f"%{keterangan_target}%")
        ).delete(synchronize_session=False)

        db.delete(entry)
        db.commit()
        return APIResponse(success=True, message=f"Entri WIP awal '{entry.nama_barang}' berhasil dihapus beserta jurnalnya.")
    except Exception as e:
        db.rollback()
        return APIResponse(success=False, message=str(e))
