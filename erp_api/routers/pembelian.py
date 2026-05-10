from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import get_db
from utils import merge_date_time
import models
import schemas
import datetime
import io
from fastapi.responses import StreamingResponse
from utils import terbilang
from pdf_generator import export_purchase_pdf

router = APIRouter(prefix="/api/pembelian", tags=["Pembelian & Biaya"])

@router.post("/bahan", response_model=schemas.APIResponse)
async def submit_pembelian_bahan(payload: schemas.PembelianBahanRequest, db: Session = Depends(get_db)):
    if not payload.items: return schemas.APIResponse(success=False, message="Keranjang kosong!")
    try:
        # Parse Tanggal
        tgl_transaksi = merge_date_time(payload.tgl_po)
        no_po = f"PO-{tgl_transaksi.strftime('%y%m%d%H%M')}"

        total_bruto = sum(i.qty * i.harga for i in payload.items)
        total_netto = total_bruto - (payload.diskon or 0)
        
        supp = db.query(models.Mitra).filter(models.Mitra.id == payload.supplier_id).first()
        if not supp: return schemas.APIResponse(success=False, message="Supplier tidak ditemukan")

        # 1. Simpan Header PO
        header = models.HeaderPembelian(
            no_po=no_po,
            tanggal=tgl_transaksi,
            nama_supplier=supp.nama_mitra,
            metode_bayar=payload.metode_pembayaran,
            total_tagihan=total_netto,
            diskon=payload.diskon,
            uang_muka=payload.dp,
            status="Tempo" if payload.metode_pembayaran == "Utang Dagang" else "Lunas"
        )
        db.add(header)

        total_baku = 0
        total_jadi = 0
        total_penolong = 0

        for i in payload.items:
            # 2. Simpan Detail PO
            detail = models.DetailPembelian(
                no_po=no_po,
                kode_sku=i.sku,
                nama_barang=i.nama,
                qty_kg=i.qty,
                harga_per_kg=i.harga,
                subtotal=i.qty * i.harga
            )
            db.add(detail)

            # 3. Update Inventory
            inv = db.query(models.Barang).filter(models.Barang.kode_sku == i.sku).first()
            if inv:
                inv.stok_saat_ini += i.qty
                inv.harga_modal = i.harga
            else:
                new_inv = models.Barang(
                    model_code="MASTER",
                    nama_barang=i.nama,
                    kode_sku=i.sku,
                    kategori=i.kat,
                    satuan="Pcs" if "Jadi" in i.kat else "Kg",
                    stok_saat_ini=i.qty,
                    harga_modal=i.harga
                )
                db.add(new_inv)
            
            if i.kat == "BAHAN_BAKU" or i.kat == "Bahan Baku (Kain)" or i.kat == models.KategoriBarang.BAHAN_BAKU.value: 
                total_baku += (i.qty * i.harga)
            elif i.kat == "Barang Jadi (Baju)" or i.kat == "BARANG_JADI" or i.kat == models.KategoriBarang.BARANG_JADI.value:
                total_jadi += (i.qty * i.harga)
            else: 
                total_penolong += (i.qty * i.harga)

        # 4. Jurnal Accounting
        # Debit: Persediaan (Nilai Bruto)
        if total_baku > 0:
            db.add(models.JurnalUmum(tanggal=tgl_transaksi, kode_akun="12110", nama_akun="Persediaan Bahan Baku (Kain)", keterangan=f"Beli {no_po} - {supp.nama_mitra}", debit=total_baku, kredit=0))
        if total_jadi > 0:
            db.add(models.JurnalUmum(tanggal=tgl_transaksi, kode_akun="12150", nama_akun="Persediaan Barang Jadi", keterangan=f"Beli Jadi {no_po} - {supp.nama_mitra}", debit=total_jadi, kredit=0))
        if total_penolong > 0:
            db.add(models.JurnalUmum(tanggal=tgl_transaksi, kode_akun="51320", nama_akun="BOP - Pemakaian Bahan Penolong & Packing", keterangan=f"Beli Penolong {no_po} - {supp.nama_mitra}", debit=total_penolong, kredit=0))

        # Kredit: Diskon (jika ada)
        if payload.diskon > 0:
            db.add(models.JurnalUmum(tanggal=tgl_transaksi, kode_akun="62190", nama_akun="Beban Lain-lain", keterangan=f"Diskon Beli {no_po}", debit=0, kredit=payload.diskon))

        # Kredit: Pembayaran
        if payload.metode_pembayaran == "Utang Dagang":
            # Ada DP?
            if payload.dp > 0:
                akun_dp = "11110" if payload.dp_sumber == "Kas Tunai" else "11120"
                nama_dp = payload.dp_sumber
                db.add(models.JurnalUmum(tanggal=tgl_transaksi, kode_akun=akun_dp, nama_akun=nama_dp, keterangan=f"DP Beli {no_po} - {supp.nama_mitra}", debit=0, kredit=payload.dp))
            
            # Sisa Utang
            sisa_utang = total_netto - (payload.dp or 0)
            if sisa_utang > 0:
                db.add(models.JurnalUmum(tanggal=tgl_transaksi, kode_akun="21110", nama_akun="Utang Usaha", keterangan=f"Utang PO {no_po} - {supp.nama_mitra}", debit=0, kredit=sisa_utang))
                supp.saldo_utang = (supp.saldo_utang or 0) + sisa_utang
        else:
            # Cash / Transfer (Lunas)
            akun_kredit = "11110" if payload.metode_pembayaran == "Kas Tunai" else "11120"
            nama_kredit = "Kas Tunai" if akun_kredit == "11110" else "Kas di Bank"
            db.add(models.JurnalUmum(tanggal=tgl_transaksi, kode_akun=akun_kredit, nama_akun=nama_kredit, keterangan=f"Beli {no_po} (Lunas) - {supp.nama_mitra}", debit=0, kredit=total_netto))

        db.commit()
        return schemas.APIResponse(success=True, message=f"PO {no_po} tersimpan di Database.")
    except Exception as e:
        db.rollback()
        return schemas.APIResponse(success=False, message=str(e))

@router.get("/list", response_model=schemas.APIResponse)
def get_pembelian_list(db: Session = Depends(get_db)):
    try:
        data = db.query(models.HeaderPembelian).order_by(models.HeaderPembelian.id.desc()).limit(50).all()
        result = []
        for h in data:
            tgl_str = str(h.tanggal)
            if hasattr(h.tanggal, 'isoformat'):
                tgl_str = h.tanggal.isoformat()
            
            result.append({
                "no_po": str(h.no_po),
                "tanggal": tgl_str,
                "nama_supplier": str(h.nama_supplier),
                "metode_bayar": str(h.metode_bayar),
                "total_tagihan": float(h.total_tagihan or 0),
                "diskon": float(h.diskon or 0),
                "uang_muka": float(h.uang_muka or 0),
                "status": str(h.status)
            })
        return schemas.APIResponse(success=True, message="Success", data={"list": result})
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return schemas.APIResponse(success=False, message=str(e))

@router.get("/details/{no_po}", response_model=schemas.APIResponse)
def get_pembelian_details(no_po: str, db: Session = Depends(get_db)):
    try:
        data = db.query(models.DetailPembelian).filter(models.DetailPembelian.no_po == no_po).all()
        result = []
        for d in data:
            result.append({
                "kode_sku": d.kode_sku,
                "nama_barang": d.nama_barang,
                "qty": d.qty_kg,
                "harga_per_kg": d.harga_per_kg,
                "subtotal": d.subtotal
            })
        return schemas.APIResponse(success=True, message="Success", data={"details": result})
    except Exception as e:
        return schemas.APIResponse(success=False, message=str(e))

@router.post("/opex", response_model=schemas.APIResponse)
def submit_opex(payload: schemas.OpexRequest, db: Session = Depends(get_db)):
    try:
        waktu_opex = merge_date_time(payload.tgl_opex)
        
        kode_akun_debit = payload.kode_akun_opex
        nama_akun_debit = payload.nama_akun_opex
        
        kode_akun_kredit = "11110" if payload.sumber_dana == "Kas Tunai" else "11120"
        nama_akun_kredit = "Kas Tunai" if payload.sumber_dana == "Kas Tunai" else "Bank BCA"
        
        db.add(models.JurnalUmum(tanggal=waktu_opex, kode_akun=kode_akun_debit, nama_akun=nama_akun_debit, keterangan=payload.keterangan, debit=payload.nominal, kredit=0))
        db.add(models.JurnalUmum(tanggal=waktu_opex, kode_akun=kode_akun_kredit, nama_akun=nama_akun_kredit, keterangan=payload.keterangan, debit=0, kredit=payload.nominal))
        
        db.commit()
        return schemas.APIResponse(success=True, message=f"Berhasil! Rp {payload.nominal:,.0f} dicatat sebagai beban {nama_akun_debit}.")
    except Exception as e:
        db.rollback()
        return schemas.APIResponse(success=False, message=str(e))

@router.post("/aset", response_model=schemas.APIResponse)
def submit_aset(payload: schemas.AsetRequest, db: Session = Depends(get_db)):
    try:
        waktu_aset = merge_date_time(payload.tgl_aset)
        
        if payload.sumber_dana == "Modal Awal (Khusus Aset Lama)":
            kode_kredit, nama_kredit = "31110", "Modal Disetor"
        else:
            kode_kredit = "11110" if payload.sumber_dana == "Kas Tunai" else "11120"
            nama_kredit = "Kas Tunai" if payload.sumber_dana == "Kas Tunai" else "BCA"
            
        db.add(models.JurnalUmum(
            tanggal=waktu_aset, 
            kode_akun=payload.kode_akun_aset, 
            nama_akun=payload.nama_akun_aset, 
            keterangan=f"{payload.nama_barang} [PERIOD:{payload.masa_bulan or 12}]", 
            debit=payload.nominal, 
            kredit=0
        ))
        db.add(models.JurnalUmum(tanggal=waktu_aset, kode_akun=kode_kredit, nama_akun=nama_kredit, keterangan=f"Aset: {payload.nama_barang}", debit=0, kredit=payload.nominal))
        
        db.commit()
        return schemas.APIResponse(success=True, message=f"Berhasil! {payload.nama_barang} senilai Rp {payload.nominal:,.0f} telah ditambahkan ke Aset Pabrik.")
    except Exception as e:
        db.rollback()
        return schemas.APIResponse(success=False, message=str(e))

@router.get("/aset-summary", response_model=schemas.APIResponse)
def get_aset_summary(db: Session = Depends(get_db)):
    try:
        jurnals = db.query(models.JurnalUmum).filter(
            models.JurnalUmum.kode_akun.in_(["13110", "13210", "13310", "13410", "11410"]),
            models.JurnalUmum.debit > 0
        ).all()
        
        tot_bangunan = sum(j.debit for j in jurnals if j.kode_akun == "13110")
        tot_mesin = sum(j.debit for j in jurnals if j.kode_akun == "13210")
        tot_kendaraan = sum(j.debit for j in jurnals if j.kode_akun == "13310")
        tot_inventaris = sum(j.debit for j in jurnals if j.kode_akun == "13410")
        
        # Smart Amortisasi Sewa (Berdasarkan masing-masing entri)
        susut_sewa_total = 0
        tot_sewa = 0
        for j in jurnals:
            if j.kode_akun == "11410":
                tot_sewa += j.debit
                # Cari tag [PERIOD:X] di keterangan
                period = 12
                if "[PERIOD:" in j.keterangan:
                    try:
                        period = int(j.keterangan.split("[PERIOD:")[1].split("]")[0])
                    except: pass
                susut_sewa_total += (j.debit / period)

        susut_bangunan = (tot_bangunan - 0) / 240 if tot_bangunan > 0 else 0
        susut_mesin = (tot_mesin - (tot_mesin * 0.10)) / 48 if tot_mesin > 0 else 0
        susut_kendaraan = (tot_kendaraan - (tot_kendaraan * 0.20)) / 96 if tot_kendaraan > 0 else 0
        susut_inventaris = (tot_inventaris - 0) / 48 if tot_inventaris > 0 else 0

        data = [
            {"kategori": "Tanah & Bangunan", "total": tot_bangunan, "umur": "20 Thn", "sisa": "0%", "susut_bulan": susut_bangunan},
            {"kategori": "Mesin Produksi", "total": tot_mesin, "umur": "4 Thn", "sisa": "10%", "susut_bulan": susut_mesin},
            {"kategori": "Kendaraan", "total": tot_kendaraan, "umur": "8 Thn", "sisa": "20%", "susut_bulan": susut_kendaraan},
            {"kategori": "Inventaris / IT", "total": tot_inventaris, "umur": "4 Thn", "sisa": "0%", "susut_bulan": susut_inventaris},
            {"kategori": "Sewa DBM (Smart Amort)", "total": tot_sewa, "umur": "Varian", "sisa": "0%", "susut_bulan": susut_sewa_total}
        ]
        bulan_ini = datetime.date.today().strftime("%b %Y")
        cek_susut = db.query(models.JurnalUmum).filter(models.JurnalUmum.keterangan == f"Susut Otomatis {bulan_ini}").all()
        
        status_susut = {
            "sudah_susut": len(cek_susut) > 0,
            "jumlah_susut": len(cek_susut),
            "bulan": bulan_ini
        }

        return schemas.APIResponse(success=True, message="Success", data={"summary": data, "status_susut": status_susut})
    except Exception as e:
        return schemas.APIResponse(success=False, message=str(e))

@router.get("/aset-list", response_model=schemas.APIResponse)
def get_aset_list(db: Session = Depends(get_db)):
    try:
        # Ambil jurnal debit aset
        jurnals = db.query(models.JurnalUmum).filter(
            models.JurnalUmum.kode_akun.in_(["13110", "13210", "13310", "13410", "11410"]),
            models.JurnalUmum.debit > 0
        ).order_by(models.JurnalUmum.tanggal.desc()).all()
        
        j_list = []
        for j in jurnals:
            # Cari jurnal kredit pendampingnya (di detik yang sama) untuk tau sumber dana
            pendamping = db.query(models.JurnalUmum).filter(
                models.JurnalUmum.tanggal == j.tanggal,
                models.JurnalUmum.kredit > 0
            ).first()
            
            sumber = "Lainnya"
            if pendamping:
                if pendamping.kode_akun == "31110":
                    sumber = "Legacy (Modal Awal)"
                elif pendamping.kode_akun == "11110":
                    sumber = "Kas Tunai"
                elif pendamping.kode_akun == "11120":
                    sumber = "Bank"

            # Bersihkan Nama Barang dari tag PERIOD
            nama_tampil = j.keterangan
            if "[PERIOD:" in nama_tampil:
                nama_tampil = nama_tampil.split(" [PERIOD:")[0]

            j_list.append({
                "id": j.id,
                "tanggal": j.tanggal.strftime("%d/%m/%Y") if j.tanggal else None,
                "kode_akun": j.kode_akun,
                "nama_akun": j.nama_akun,
                "nama_barang": nama_tampil,
                "nominal": j.debit,
                "sumber": sumber
            })
            
        return schemas.APIResponse(success=True, message="Success", data={"list": j_list})
    except Exception as e:
        return schemas.APIResponse(success=False, message=str(e))

@router.post("/penyusutan", response_model=schemas.APIResponse)
def submit_penyusutan(db: Session = Depends(get_db)):
    try:
        bulan_ini = datetime.date.today().strftime("%b %Y")
        waktu_susut = datetime.datetime.now()
        
        cek_susut = db.query(models.JurnalUmum).filter(models.JurnalUmum.keterangan == f"Susut Otomatis {bulan_ini}").first()
        if cek_susut:
            return schemas.APIResponse(success=False, message=f"DITOLAK! Beban penyusutan untuk bulan {bulan_ini} SUDAH TERCATAT.")
            
        jurnals = db.query(models.JurnalUmum).filter(
            models.JurnalUmum.kode_akun.in_(["13110", "13210", "13310", "13410", "11410"]),
            models.JurnalUmum.debit > 0
        ).all()
        
        tot_bangunan = sum(j.debit for j in jurnals if j.kode_akun == "13110")
        tot_mesin = sum(j.debit for j in jurnals if j.kode_akun == "13210")
        tot_kendaraan = sum(j.debit for j in jurnals if j.kode_akun == "13310")
        tot_inventaris = sum(j.debit for j in jurnals if j.kode_akun == "13410")
        
        susut_bangunan = (tot_bangunan - 0) / 240 if tot_bangunan > 0 else 0
        susut_mesin = (tot_mesin - (tot_mesin * 0.10)) / 48 if tot_mesin > 0 else 0
        susut_kendaraan = (tot_kendaraan - (tot_kendaraan * 0.20)) / 96 if tot_kendaraan > 0 else 0
        susut_inventaris = (tot_inventaris - 0) / 48 if tot_inventaris > 0 else 0
        
        # Hitung Smart Amortisasi Sewa
        susut_sewa_total = 0
        for j in jurnals:
            if j.kode_akun == "11410":
                period = 12
                if "[PERIOD:" in j.keterangan:
                    try:
                        period = int(j.keterangan.split("[PERIOD:")[1].split("]")[0])
                    except: pass
                susut_sewa_total += (j.debit / period)
        
        if susut_bangunan > 0:
            db.add(models.JurnalUmum(tanggal=waktu_susut, kode_akun="51350", nama_akun="BOP - Penyusutan Gedung Produksi", keterangan=f"Susut Otomatis {bulan_ini}", debit=susut_bangunan, kredit=0))
            db.add(models.JurnalUmum(tanggal=waktu_susut, kode_akun="13120", nama_akun="Akumulasi Penyusutan Bangunan", keterangan=f"Susut Otomatis {bulan_ini}", debit=0, kredit=susut_bangunan))
    
        if susut_mesin > 0:
            db.add(models.JurnalUmum(tanggal=waktu_susut, kode_akun="51350", nama_akun="BOP - Penyusutan Mesin Produksi", keterangan=f"Susut Otomatis {bulan_ini}", debit=susut_mesin, kredit=0))
            db.add(models.JurnalUmum(tanggal=waktu_susut, kode_akun="13220", nama_akun="Akumulasi Penyusutan Mesin", keterangan=f"Susut Otomatis {bulan_ini}", debit=0, kredit=susut_mesin))
        
        if susut_kendaraan > 0:
            db.add(models.JurnalUmum(tanggal=waktu_susut, kode_akun="62170", nama_akun="Beban Penyusutan Aset Tetap", keterangan=f"Susut Otomatis {bulan_ini}", debit=susut_kendaraan, kredit=0))
            db.add(models.JurnalUmum(tanggal=waktu_susut, kode_akun="13320", nama_akun="Akumulasi Penyusutan Kendaraan", keterangan=f"Susut Otomatis {bulan_ini}", debit=0, kredit=susut_kendaraan))
        
        if susut_inventaris > 0:
            db.add(models.JurnalUmum(tanggal=waktu_susut, kode_akun="62170", nama_akun="Beban Penyusutan Aset Tetap", keterangan=f"Susut Otomatis {bulan_ini}", debit=susut_inventaris, kredit=0))
            db.add(models.JurnalUmum(tanggal=waktu_susut, kode_akun="13420", nama_akun="Akumulasi Penyusutan Furniture", keterangan=f"Susut Otomatis {bulan_ini}", debit=0, kredit=susut_inventaris))

        if susut_sewa_total > 0:
            db.add(models.JurnalUmum(tanggal=waktu_susut, kode_akun="62160", nama_akun="Beban Sewa, Pajak & Retribusi", keterangan=f"Susut Otomatis {bulan_ini}", debit=susut_sewa_total, kredit=0))
            db.add(models.JurnalUmum(tanggal=waktu_susut, kode_akun="11410", nama_akun="Sewa Dibayar di Muka", keterangan=f"Susut Otomatis {bulan_ini}", debit=0, kredit=susut_sewa_total))
    
        db.commit()
        return schemas.APIResponse(success=True, message="Sukses! Laporan Neraca & Laba Rugi sudah diperbarui otomatis.")
    except Exception as e:
        db.rollback()
        return schemas.APIResponse(success=False, message=str(e))

@router.post("/bayar-po-cepat", response_model=schemas.APIResponse)
def bayar_po_cepat(payload: schemas.BayarPOCepatRequest, db: Session = Depends(get_db)):
    try:
        po = db.query(models.HeaderPembelian).filter(models.HeaderPembelian.no_po == payload.no_po).first()
        if not po: raise Exception("PO tidak ditemukan")
        if po.status == "Lunas": raise Exception("PO ini sudah lunas!")

        supp = db.query(models.Mitra).filter(models.Mitra.nama_mitra == po.nama_supplier).first()
        if not supp: raise Exception("Data supplier tidak ditemukan")

        waktu_bayar = merge_date_time(payload.tgl)
        po.status = "Lunas"
        
        # Kurangi saldo utang ke supplier
        nominal_aktual = min(payload.nominal, (supp.saldo_utang or 0))
        supp.saldo_utang = (supp.saldo_utang or 0) - nominal_aktual

        # Jurnal: Utang Usaha (D) vs Kas/Bank (K)
        akun_kredit = "11110" if "Tunai" in payload.sumber_dana else "11120"
        nama_kredit = "Kas Tunai" if akun_kredit == "11110" else "Bank BCA"

        db.add(models.JurnalUmum(tanggal=waktu_bayar, kode_akun="21110", nama_akun="Utang Usaha", keterangan=f"Pelunasan PO {po.no_po} - {supp.nama_mitra}", debit=nominal_aktual, kredit=0))
        db.add(models.JurnalUmum(tanggal=waktu_bayar, kode_akun=akun_kredit, nama_akun=nama_kredit, keterangan=f"Pelunasan PO {po.no_po} - {supp.nama_mitra}", debit=0, kredit=nominal_aktual))

        db.commit()
        return schemas.APIResponse(success=True, message=f"Pelunasan PO {po.no_po} berhasil dicatat.")
    except Exception as e:
        db.rollback()
        return schemas.APIResponse(success=False, message=str(e))

@router.post("/retur", response_model=schemas.APIResponse)
def submit_retur_pembelian(payload: schemas.ReturPembelianRequest, db: Session = Depends(get_db)):
    try:
        waktu_retur = merge_date_time(payload.tgl_retur)
        po = db.query(models.HeaderPembelian).filter(models.HeaderPembelian.no_po == payload.no_po).first()
        detail = db.query(models.DetailPembelian).filter(models.DetailPembelian.no_po == payload.no_po, models.DetailPembelian.kode_sku == payload.kode_sku).first()
        
        if not po or not detail: raise Exception("Nota PO atau barang tidak ditemukan")

        # 1. Kurangi stok barang
        inv = db.query(models.Barang).filter(models.Barang.kode_sku == payload.kode_sku).first()
        if inv: inv.stok_saat_ini -= payload.qty_retur

        # 2. Hitung nilai retur
        nilai_retur = payload.qty_retur * detail.harga_per_kg
        
        # 3. Jurnal: Utang (D) / Kas (D) vs Persediaan (K)
        if po.metode_bayar == "Utang Dagang":
            supp = db.query(models.Mitra).filter(models.Mitra.nama_mitra == po.nama_supplier).first()
            if supp: supp.saldo_utang -= nilai_retur
            db.add(models.JurnalUmum(tanggal=waktu_retur, kode_akun="21110", nama_akun="Utang Usaha", keterangan=f"Retur Beli {po.no_po}", debit=nilai_retur, kredit=0))
        else:
            akun_debit = "11110" if po.metode_bayar == "Kas Tunai" else "11120"
            nama_debit = "Kas Tunai" if akun_debit == "11110" else "Bank BCA"
            db.add(models.JurnalUmum(tanggal=waktu_retur, kode_akun=akun_debit, nama_akun=nama_debit, keterangan=f"Retur Beli {po.no_po} (Refund)", debit=nilai_retur, kredit=0))

        # Persediaan / Beban Keluar
        akun_persediaan = "12110" if "Kain" in detail.nama_barang or "Baku" in detail.nama_barang else "12120"
        nama_persediaan = "Persediaan Bahan Baku (Kain)" if akun_persediaan == "12110" else "Persediaan Bahan Penolong"
        db.add(models.JurnalUmum(tanggal=waktu_retur, kode_akun=akun_persediaan, nama_akun=nama_persediaan, keterangan=f"Retur Beli {po.no_po}", debit=0, kredit=nilai_retur))

        db.commit()
        return schemas.APIResponse(success=True, message="Retur Pembelian berhasil dicatat.")
    except Exception as e:
        db.rollback()
        return schemas.APIResponse(success=False, message=str(e))

@router.delete("/void/{no_po}", response_model=schemas.APIResponse)
def void_pembelian(no_po: str, db: Session = Depends(get_db)):
    try:
        po = db.query(models.HeaderPembelian).filter(models.HeaderPembelian.no_po == no_po).first()
        if not po: raise Exception("PO tidak ditemukan")

        if po.status == "Lunas":
            raise Exception(f"DITOLAK! PO {no_po} sudah berstatus LUNAS dan tidak dapat dihapus langsung. Hubungi Super Admin jika ada kesalahan data.")

        items = db.query(models.DetailPembelian).filter(models.DetailPembelian.no_po == no_po).all()

        # 1. Kurangi Stok
        for item in items:
            inv = db.query(models.Barang).filter(models.Barang.kode_sku == item.kode_sku).first()
            if inv: inv.stok_saat_ini -= item.qty_kg

        # 2. Kurangi Utang (jika Utang Dagang)
        if po.metode_bayar == "Utang Dagang":
            supp = db.query(models.Mitra).filter(models.Mitra.nama_mitra == po.nama_supplier).first()
            if supp: supp.saldo_utang -= po.total_tagihan

        # 3. Hapus Jurnal
        db.query(models.JurnalUmum).filter(models.JurnalUmum.keterangan.contains(no_po)).delete(synchronize_session=False)

        # 4. Hapus Detail & Header
        db.query(models.DetailPembelian).filter(models.DetailPembelian.no_po == no_po).delete(synchronize_session=False)
        db.query(models.HeaderPembelian).filter(models.HeaderPembelian.no_po == no_po).delete(synchronize_session=False)

        db.commit()
        return schemas.APIResponse(success=True, message=f"PO {no_po} telah dibatalkan (Void). Stok dan keuangan dikembalikan.")
    except Exception as e:
        db.rollback()
        return schemas.APIResponse(success=False, message=str(e))

@router.get("/print/{no_po}")
def print_po(no_po: str, db: Session = Depends(get_db)):
    try:
        header = db.query(models.HeaderPembelian).filter(models.HeaderPembelian.no_po == no_po).first()
        if not header: return {"error": "Nota PO tidak ditemukan"}

        items = db.query(models.DetailPembelian).filter(models.DetailPembelian.no_po == no_po).all()
        
        # Terbilang: sisa yang harus dibayar
        uang_muka = getattr(header, 'uang_muka', 0.0) or 0.0
        nilai_terbilang = header.total_tagihan - uang_muka if header.status == "Tempo" else header.total_tagihan
        terbilang_str = terbilang(nilai_terbilang)
        
        # Ambil Profil
        config = db.query(models.CompanyConfig).first()
        
        # Signer config
        n_ttd = config.ttd_po_nama if (config and config.ttd_po_nama) else (config.nama_pemilik if config else "Yana Taryana")
        j_ttd = config.ttd_po_jabatan if (config and config.ttd_po_jabatan) else (config.jabatan_pemilik if config else "General Manager")
        
        pdf_bytes = export_purchase_pdf(header, items, terbilang_str, config, n_ttd, j_ttd)

        res = io.BytesIO(pdf_bytes)
        return StreamingResponse(res, media_type="application/pdf", headers={"Content-Disposition": f"inline; filename={no_po}.pdf"})
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {"error": str(e)}
