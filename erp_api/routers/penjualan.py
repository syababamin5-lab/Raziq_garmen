import datetime
import random
import string
import io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from models import get_db
from utils import merge_date_time
import models
import schemas
from utils import format_rp, terbilang
from pdf_generator import PDF, format_rp_pdf, export_invoice_pdf

router = APIRouter(prefix="/api/penjualan", tags=["Penjualan & Retur"])

@router.post("/invoice", response_model=schemas.APIResponse)
def submit_invoice(payload: schemas.SaleRequest, db: Session = Depends(get_db)):
    try:
        waktu_jual = merge_date_time(payload.tgl_jual)
        
        # Generate nomor invoice yang SELALU UNIK: INV-YYMMDD-XXXX (XXXX = nomor urut hari ini)
        prefix_hari_ini = f"INV-{waktu_jual.strftime('%y%m%d')}"
        jumlah_hari_ini = db.query(models.HeaderPenjualan).filter(
            models.HeaderPenjualan.no_invoice.like(f"{prefix_hari_ini}%")
        ).count()
        inv_no = f"{prefix_hari_ini}-{jumlah_hari_ini + 1:04d}"
        
        # Pastikan unik (fallback jika ada race condition)
        while db.query(models.HeaderPenjualan).filter(models.HeaderPenjualan.no_invoice == inv_no).first():
            jumlah_hari_ini += 1
            inv_no = f"{prefix_hari_ini}-{jumlah_hari_ini + 1:04d}"
        
        cust = db.query(models.Mitra).filter(models.Mitra.id == payload.customer_id).first()
        if not cust:
            raise Exception("Customer tidak ditemukan.")

        total_sebelum_diskon = 0.0
        total_pcs_invoice = 0
        total_tagihan = 0.0

        # Create details and calculate total
        for item in payload.items:
            # Note: payload.items has qty (in lusin) and harga (per lusin)
            subtotal = float(item.qty) * float(item.harga)
            total_sebelum_diskon += subtotal
            
            db.add(models.DetailPenjualan(
                no_invoice=inv_no,
                kode_sku=item.sku,
                nama_barang=item.nama,
                qty_lusin=item.qty,
                harga_per_lusin=item.harga,
                subtotal=subtotal
            ))
            
            target = db.query(models.Barang).filter(models.Barang.id == item.id).first()
            if target:
                qty_pcs = int(float(item.qty) * 12)
                total_pcs_invoice += qty_pcs
                target.stok_saat_ini -= qty_pcs
                
                nilai_hpp = float(qty_pcs) * (target.harga_modal or 0.0)
                
                # Jurnal HPP dan Persediaan per item (WAJIB sertakan inv_no agar bisa dibersihkan saat VOID)
                db.add(models.JurnalUmum(tanggal=waktu_jual, kode_akun="51120", nama_akun="Harga Pokok Penjualan", keterangan=f"HPP {qty_pcs} pcs {target.kode_sku} - {inv_no}", debit=nilai_hpp, kredit=0))
                db.add(models.JurnalUmum(tanggal=waktu_jual, kode_akun="12150", nama_akun="Persediaan Barang Jadi", keterangan=f"Keluar {qty_pcs} pcs {target.kode_sku} (Jual) - {inv_no}", debit=0, kredit=nilai_hpp))

        total_tagihan = total_sebelum_diskon - (payload.diskon or 0.0)
        sisa_utang = total_tagihan - (payload.dp or 0.0)
        
        if sisa_utang < 0 and payload.metode == "Piutang (Tempo)":
            raise Exception("DP tidak boleh lebih besar dari Total Tagihan!")

        status_invoice = "Lunas"
        if payload.metode == "Piutang (Tempo)" and sisa_utang > 0:
            status_invoice = "Tempo"

        # Simpan Header Invoice (simpan uang_muka agar PDF bisa tampilkan DP)
        # sisa_tagihan: jumlah yang belum dibayar, digunakan untuk FIFO matching
        sisa_tagihan_awal = sisa_utang if payload.metode == "Piutang (Tempo)" and sisa_utang > 0 else 0.0
        db.add(models.HeaderPenjualan(
            no_invoice=inv_no, 
            tanggal=waktu_jual, 
            nama_customer=cust.nama_mitra, 
            metode_bayar=payload.metode, 
            total_tagihan=total_tagihan, 
            diskon=payload.diskon or 0.0,
            uang_muka=payload.dp or 0.0,
            status=status_invoice,
            sisa_tagihan=sisa_tagihan_awal
        ))

        # Jurnal Pendapatan Penjualan (Mencatat Nilai BRUTO agar laporan akurat)
        db.add(models.JurnalUmum(tanggal=waktu_jual, kode_akun="41110", nama_akun="Pendapatan Penjualan", keterangan=f"Penjualan {inv_no} ({total_pcs_invoice} pcs) - Bruto", debit=0, kredit=total_sebelum_diskon))
        
        # Jurnal Potongan Penjualan / Diskon (Mencatat kerugian dari diskon)
        if (payload.diskon or 0.0) > 0:
            db.add(models.JurnalUmum(tanggal=waktu_jual, kode_akun="41130", nama_akun="Potongan Penjualan (Diskon)", keterangan=f"Diskon Nota {inv_no}", debit=payload.diskon, kredit=0))
        
        if payload.metode in ["Tunai", "Transfer"]:
            akun_debit = "11110" if payload.metode == "Tunai" else "11120"
            nama_debit = "Kas Tunai" if payload.metode == "Tunai" else "Bank BCA"
            db.add(models.JurnalUmum(tanggal=waktu_jual, kode_akun=akun_debit, nama_akun=nama_debit, keterangan=f"Pelunasan {inv_no}", debit=total_tagihan, kredit=0))
        
        elif payload.metode == "Piutang (Tempo)":
            cust.saldo_piutang += sisa_utang
            db.add(models.JurnalUmum(tanggal=waktu_jual, kode_akun="11210", nama_akun="Piutang Usaha", keterangan=f"Tagihan {inv_no} - {cust.nama_mitra}", debit=sisa_utang, kredit=0))
            if (payload.dp or 0.0) > 0:
                akun_dp = "11110" if payload.dp_sumber == "Kas Tunai" else "11120"
                nama_dp = "Kas Tunai" if payload.dp_sumber == "Kas Tunai" else "Bank BCA"
                db.add(models.JurnalUmum(tanggal=waktu_jual, kode_akun=akun_dp, nama_akun=nama_dp, keterangan=f"DP Invoice {inv_no} - {cust.nama_mitra}", debit=payload.dp, kredit=0))

        db.commit()
        return schemas.APIResponse(success=True, message=f"Invoice {inv_no} berhasil diterbitkan!", data={"no_invoice": inv_no})
    except Exception as e:
        db.rollback()
        return schemas.APIResponse(success=False, message=str(e))

@router.get("/print/{no_inv}")
def print_invoice(no_inv: str, db: Session = Depends(get_db)):
    try:
        header = db.query(models.HeaderPenjualan).filter(models.HeaderPenjualan.no_invoice == no_inv).first()
        if not header: return {"error": "Invoice tidak ditemukan"}

        items_inv = db.query(models.DetailPenjualan).filter(models.DetailPenjualan.no_invoice == no_inv).all()
        
        # Ambil Profil Perusahaan & Profil Customer
        config = db.query(models.CompanyConfig).first()
        customer = db.query(models.Mitra).filter(models.Mitra.nama_mitra == header.nama_customer).first()
        
        # Terbilang: tampilkan nilai tagihan yang harus dibayar customer
        uang_muka = getattr(header, 'uang_muka', 0.0) or 0.0
        nilai_terbilang = header.total_tagihan - uang_muka if header.metode_bayar == "Piutang (Tempo)" else header.total_tagihan
        terbilang_str = terbilang(nilai_terbilang)
        
        # Logic Penanda Tangan No-Code: Mengambil dari Setting Profil Perusahaan
        nama_ttd = config.ttd_invoice_nama if (config and config.ttd_invoice_nama) else (config.nama_pemilik if config else "Yana Taryana")
        jabatan_ttd = config.ttd_invoice_jabatan if (config and config.ttd_invoice_jabatan) else (config.jabatan_pemilik if config else "Owner")

        pdf_bytes = export_invoice_pdf(header, items_inv, terbilang_str, config, customer, nama_ttd, jabatan_ttd)

        res = io.BytesIO(pdf_bytes)
        return StreamingResponse(res, media_type="application/pdf", headers={"Content-Disposition": f"inline; filename={no_inv}.pdf"})
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {"error": str(e)}

@router.get("/history", response_model=schemas.APIResponse)
def get_penjualan_history(db: Session = Depends(get_db)):
    try:
        invoices = db.query(models.HeaderPenjualan).order_by(models.HeaderPenjualan.id.desc()).limit(50).all()
        result = []
        for i in invoices:
            # Dapatkan saldo piutang global customer (untuk informasi saja, tidak untuk merubah status invoice)
            cust = db.query(models.Mitra).filter(models.Mitra.nama_mitra == i.nama_customer).first()
            sisa_piutang_global = cust.saldo_piutang if cust else 0
            
            result.append({
                "no_invoice": i.no_invoice,
                "nama_customer": i.nama_customer,
                "total_bruto": i.total_tagihan + (i.diskon or 0.0), # Hitung Bruto untuk UI
                "total_tagihan": i.total_tagihan, # Ini adalah Netto
                "diskon": i.diskon or 0.0,
                "metode_bayar": i.metode_bayar,
                "uang_muka": i.uang_muka or 0.0,
                "status": i.status,
                "sisa_tagihan": i.sisa_tagihan or 0.0,  # Sisa per invoice (FIFO)
                "sisa_piutang_customer": sisa_piutang_global,
                "tanggal": i.tanggal.isoformat() if hasattr(i.tanggal, 'isoformat') else str(i.tanggal)
            })
            
        return schemas.APIResponse(success=True, message="Success", data={"list": result})
    except Exception as e:
        return schemas.APIResponse(success=False, message=str(e))

@router.get("/details/{no_inv}", response_model=schemas.APIResponse)
def get_invoice_details(no_inv: str, db: Session = Depends(get_db)):
    try:
        details = db.query(models.DetailPenjualan).filter(models.DetailPenjualan.no_invoice == no_inv).all()
        return schemas.APIResponse(success=True, message="Success", data={"details": [
            {
                "kode_sku": d.kode_sku,
                "nama_barang": d.nama_barang,
                "qty": d.qty_lusin,
                "qty_retur": d.qty_retur or 0.0,
                "harga_per_lusin": d.harga_per_lusin,
                "subtotal": d.subtotal
            } for d in details
        ]})
    except Exception as e:
        return schemas.APIResponse(success=False, message=str(e))

@router.post("/retur", response_model=schemas.APIResponse)
def submit_retur(payload: schemas.SaleReturRequest, db: Session = Depends(get_db)):
    try:
        waktu_retur = merge_date_time(payload.tgl_retur)
        pilih_inv = db.query(models.HeaderPenjualan).filter(models.HeaderPenjualan.no_invoice == payload.no_invoice).first()
        barang_retur = db.query(models.DetailPenjualan).filter(models.DetailPenjualan.no_invoice == payload.no_invoice, models.DetailPenjualan.kode_sku == payload.kode_sku).first()
        
        if not pilih_inv or not barang_retur:
            raise Exception("Invoice atau barang tidak ditemukan")

        # Track qty_retur
        current_retur = getattr(barang_retur, 'qty_retur', 0.0) or 0.0
        if payload.qty_retur > (barang_retur.qty_lusin - current_retur):
            raise Exception(f"Gagal! Jumlah retur ({payload.qty_retur}) melebihi sisa barang yang bisa diretur ({barang_retur.qty_lusin - current_retur}).")

        qty_retur_pcs = int(payload.qty_retur * 12)
        target_b = db.query(models.Barang).filter(models.Barang.kode_sku == payload.kode_sku).first()
        target_b.stok_saat_ini += qty_retur_pcs
        
        nilai_retur = payload.qty_retur * barang_retur.harga_per_lusin
        nilai_hpp_retur = float(qty_retur_pcs) * (target_b.harga_modal or 0.0)
        
        # Jurnal Retur Penjualan (D)
        db.add(models.JurnalUmum(tanggal=waktu_retur, kode_akun="41120", nama_akun="Retur Penjualan", keterangan=f"Retur {pilih_inv.no_invoice} - {qty_retur_pcs} pcs", debit=nilai_retur, kredit=0))
        
        # Logika Pengembalian Dana/Piutang
        if pilih_inv.metode_bayar == "Piutang (Tempo)":
            cust_db = db.query(models.Mitra).filter(models.Mitra.nama_mitra == pilih_inv.nama_customer).first()
            if cust_db:
                # Sisa tagihan saat ini (sebelum retur ini)
                # Kita asumsikan piutang customer mencakup invoice ini.
                # Jika piutang < nilai retur, sisa refund diambil dari Bank/Kas (mengembalikan DP)
                if cust_db.saldo_piutang >= nilai_retur:
                    cust_db.saldo_piutang -= nilai_retur
                    db.add(models.JurnalUmum(tanggal=waktu_retur, kode_akun="11210", nama_akun="Piutang Usaha", keterangan=f"Retur {pilih_inv.no_invoice}", debit=0, kredit=nilai_retur))
                else:
                    piutang_sebelum = cust_db.saldo_piutang
                    sisa_refund = nilai_retur - piutang_sebelum
                    
                    cust_db.saldo_piutang = 0
                    if piutang_sebelum > 0:
                        db.add(models.JurnalUmum(tanggal=waktu_retur, kode_akun="11210", nama_akun="Piutang Usaha", keterangan=f"Retur {pilih_inv.no_invoice} (Piutang Lunas)", debit=0, kredit=piutang_sebelum))
                    
                    # Sisa refund dikreditkan ke Bank/Kas (Uang Keluar mengembalikan DP)
                    akun_refund = "11120" if "Bank" in (payload.sumber_refund or "") else "11110"
                    nama_refund = "BCA" if akun_refund == "11120" else "Kas Tunai"
                    
                    db.add(models.JurnalUmum(tanggal=waktu_retur, kode_akun=akun_refund, nama_akun=nama_refund, keterangan=f"Refund DP Retur {pilih_inv.no_invoice}", debit=0, kredit=sisa_refund))
        else:
            # Tunai atau Transfer
            akun_kredit = "11120" if pilih_inv.metode_bayar == "Transfer" else "11110"
            nama_kredit = "BCA" if akun_kredit == "11120" else "Kas Tunai"
            db.add(models.JurnalUmum(tanggal=waktu_retur, kode_akun=akun_kredit, nama_akun=nama_kredit, keterangan=f"Refund Retur {pilih_inv.no_invoice}", debit=0, kredit=nilai_retur))

        # Jurnal HPP
        db.add(models.JurnalUmum(tanggal=waktu_retur, kode_akun="12150", nama_akun="Persediaan Barang Jadi", keterangan=f"Retur Masuk {qty_retur_pcs} pcs", debit=nilai_hpp_retur, kredit=0))
        db.add(models.JurnalUmum(tanggal=waktu_retur, kode_akun="51120", nama_akun="Harga Pokok Penjualan", keterangan=f"Batal HPP {pilih_inv.no_invoice}", debit=0, kredit=nilai_hpp_retur))
        
        # Update Tracking Retur di Detail
        barang_retur.qty_retur = current_retur + payload.qty_retur
            
        # Update Status Invoice jika semuanya diretur
        all_details = db.query(models.DetailPenjualan).filter(models.DetailPenjualan.no_invoice == payload.no_invoice).all()
        is_fully_returned = True
        for d in all_details:
            if (d.qty_retur or 0.0) < d.qty_lusin:
                is_fully_returned = False
                break
        
        if is_fully_returned:
            pilih_inv.status = "RETUR TOTAL"
        
        db.commit()
        return schemas.APIResponse(success=True, message="Retur berhasil dicatat", data=None)
    except Exception as e:
        db.rollback()
        return schemas.APIResponse(success=False, message=str(e))

@router.delete("/void/{no_inv}", response_model=schemas.APIResponse)
def void_invoice(no_inv: str, db: Session = Depends(get_db)):
    try:
        pilih_histori = db.query(models.HeaderPenjualan).filter(models.HeaderPenjualan.no_invoice == no_inv).first()
        if not pilih_histori:
            raise Exception("Invoice tidak ditemukan")

        # ============================================================
        # KEAMANAN: Invoice yang sudah LUNAS tidak bisa dihapus biasa.
        # Uang sudah diterima → penghapusan hanya boleh via Super Admin.
        # ============================================================
        if pilih_histori.status == "Lunas":
            raise Exception(
                f"Invoice {no_inv} sudah berstatus LUNAS dan tidak dapat dihapus. "
                f"Uang pelunasan sudah tercatat di sistem. "
                f"Jika ada kesalahan data, hubungi Super Admin."
            )

        items_inv = db.query(models.DetailPenjualan).filter(models.DetailPenjualan.no_invoice == no_inv).all()

        # 1. Kembalikan Stok Barang ke Gudang
        for d in items_inv:
            brg = db.query(models.Barang).filter(models.Barang.kode_sku == d.kode_sku).first()
            if brg:
                brg.stok_saat_ini += int(d.qty_lusin * 12)
        
        # 2. Kurangi Saldo Piutang Customer (Jika Ngutang)
        # Gunakan sisa_tagihan (sisa yang belum terbayar), bukan nilai awal invoice.
        # Karena pembayaran via terima_piutang mungkin sudah mengurangi sisa_tagihan.
        if pilih_histori.metode_bayar == "Piutang (Tempo)":
            cust = db.query(models.Mitra).filter(models.Mitra.nama_mitra == pilih_histori.nama_customer).first()
            if cust:
                sisa_restore = pilih_histori.sisa_tagihan or 0.0
                cust.saldo_piutang -= sisa_restore

        # 3. Hapus Seluruh Jurnal Keuangan Terkait
        db.query(models.JurnalUmum).filter(models.JurnalUmum.keterangan.contains(pilih_histori.no_invoice)).delete(synchronize_session=False)
        
        # 4. Hapus Detail & Header Invoice
        db.query(models.DetailPenjualan).filter(models.DetailPenjualan.no_invoice == no_inv).delete(synchronize_session=False)
        db.query(models.HeaderPenjualan).filter(models.HeaderPenjualan.no_invoice == no_inv).delete(synchronize_session=False)
        
        db.commit()
        return schemas.APIResponse(success=True, message="Invoice Dibatalkan! Stok gudang dan keuangan telah dikembalikan seperti semula.", data=None)
    except Exception as e:
        db.rollback()
        return schemas.APIResponse(success=False, message=str(e))

@router.post("/bayar-invoice-cepat", response_model=schemas.APIResponse)
def bayar_invoice_cepat(payload: schemas.BayarInvoiceCepatRequest, db: Session = Depends(get_db)):
    try:
        # =====================================================
        # VALIDASI BERLAPIS - ANTI PEMBAYARAN GANDA
        # =====================================================

        # LAPIS 1: CEK KEBERADAAN & STATUS INVOICE
        invoice = db.query(models.HeaderPenjualan).filter(
            models.HeaderPenjualan.no_invoice == payload.no_invoice
        ).first()
        if not invoice:
            raise Exception("Error: Invoice tidak ditemukan!")

        if invoice.status == "Lunas":
            raise Exception("🔒 Ditolak! Invoice ini sudah dilunasi sebelumnya. Pembayaran ganda tidak diizinkan!")

        # LAPIS 2: CEK KEBERADAAN CUSTOMER
        customer = db.query(models.Mitra).filter(
            models.Mitra.nama_mitra == invoice.nama_customer
        ).first()
        if not customer:
            raise Exception("Error: Data customer tidak ditemukan di database!")

        # LAPIS 3: CEK SALDO PIUTANG (dengan toleransi floating point Rp 1)
        TOLERANSI = 1.0
        if customer.saldo_piutang < (payload.nominal - TOLERANSI):
            raise Exception(
                f"🔒 Ditolak! Saldo piutang customer ({int(customer.saldo_piutang):,}) "
                f"tidak mencukupi nominal invoice ({int(payload.nominal):,}). "
                f"Kemungkinan sudah sebagian dilunasi via menu Kas Piutang. "
                f"Silakan cek menu Kas & Piutang!"
            )

        # =====================================================
        # PROSES PELUNASAN DALAM SATU BLOK TRANSAKSI ATOMIK
        # =====================================================
        waktu_bayar = merge_date_time(payload.tgl)

        # 1. Set status invoice ke Lunas + nolkan sisa_tagihan
        invoice.status = "Lunas"
        invoice.sisa_tagihan = 0.0

        # 2. Kurangi saldo piutang customer (pakai nominal aktual invoice jika ada toleransi)
        nominal_aktual = min(payload.nominal, customer.saldo_piutang)
        customer.saldo_piutang -= nominal_aktual

        # 3. Jurnal Keuangan: Kas/Bank (D) vs Piutang Usaha (K)
        akun_debit = "11110" if "Tunai" in payload.sumber_dana else "11120"
        nama_debit = "Kas Tunai" if akun_debit == "11110" else "Bank BCA"

        db.add(models.JurnalUmum(
            tanggal=waktu_bayar,
            kode_akun=akun_debit,
            nama_akun=nama_debit,
            keterangan=f"Pelunasan Invoice {invoice.no_invoice} - {customer.nama_mitra}",
            debit=nominal_aktual,
            kredit=0
        ))
        db.add(models.JurnalUmum(
            tanggal=waktu_bayar,
            kode_akun="11210",
            nama_akun="Piutang Usaha",
            keterangan=f"Pelunasan Invoice {invoice.no_invoice} - {customer.nama_mitra}",
            debit=0,
            kredit=nominal_aktual
        ))

        db.commit()
        return schemas.APIResponse(
            success=True,
            message=f"✅ Pelunasan Invoice {invoice.no_invoice} sebesar Rp {int(nominal_aktual):,} berhasil dicatat!",
            data=None
        )

    except Exception as e:
        db.rollback()
        return schemas.APIResponse(success=False, message=str(e))
