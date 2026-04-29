import datetime
import random
import string
import io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from models import get_db
import models
import schemas
from utils import format_rp, terbilang
from pdf_generator import PDF, format_rp_pdf, export_invoice_pdf

router = APIRouter(prefix="/api/penjualan", tags=["Penjualan & Retur"])

@router.post("/invoice", response_model=schemas.APIResponse)
def submit_invoice(payload: schemas.SaleRequest, db: Session = Depends(get_db)):
    try:
        waktu_jual = datetime.datetime.fromisoformat(payload.tgl_jual.replace('Z', '+00:00')) if payload.tgl_jual else datetime.datetime.now()
        
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
                
                # Jurnal HPP dan Persediaan per item
                db.add(models.JurnalUmum(tanggal=waktu_jual, kode_akun="51120", nama_akun="Harga Pokok Penjualan", keterangan=f"HPP {qty_pcs} pcs {target.kode_sku}", debit=nilai_hpp, kredit=0))
                db.add(models.JurnalUmum(tanggal=waktu_jual, kode_akun="12150", nama_akun="Persediaan Barang Jadi", keterangan=f"Keluar {qty_pcs} pcs {target.kode_sku} (Jual)", debit=0, kredit=nilai_hpp))

        total_tagihan = total_sebelum_diskon - (payload.diskon or 0.0)
        sisa_utang = total_tagihan - (payload.dp or 0.0)
        
        if sisa_utang < 0 and payload.metode == "Piutang (Tempo)":
            raise Exception("DP tidak boleh lebih besar dari Total Tagihan!")

        status_invoice = "Lunas"
        if payload.metode == "Piutang (Tempo)" and sisa_utang > 0:
            status_invoice = "Tempo"

        # Simpan Header Invoice (simpan uang_muka agar PDF bisa tampilkan DP)
        db.add(models.HeaderPenjualan(
            no_invoice=inv_no, 
            tanggal=waktu_jual, 
            nama_customer=cust.nama_mitra, 
            metode_bayar=payload.metode, 
            total_tagihan=total_tagihan, 
            diskon=payload.diskon or 0.0,
            uang_muka=payload.dp or 0.0,
            status=status_invoice
        ))

        # Jurnal Pendapatan Penjualan
        db.add(models.JurnalUmum(tanggal=waktu_jual, kode_akun="41110", nama_akun="Pendapatan Penjualan", keterangan=f"Penjualan {inv_no} ({total_pcs_invoice} pcs)", debit=0, kredit=total_tagihan))
        
        if payload.metode in ["Tunai", "Transfer"]:
            akun_debit = "11110" if payload.metode == "Tunai" else "11120"
            nama_debit = "Kas Tunai" if payload.metode == "Tunai" else "Kas di Bank"
            db.add(models.JurnalUmum(tanggal=waktu_jual, kode_akun=akun_debit, nama_akun=nama_debit, keterangan=f"Pelunasan {inv_no}", debit=total_tagihan, kredit=0))
        
        elif payload.metode == "Piutang (Tempo)":
            cust.saldo_piutang += sisa_utang
            db.add(models.JurnalUmum(tanggal=waktu_jual, kode_akun="11210", nama_akun="Piutang Usaha", keterangan=f"Tagihan {inv_no} - {cust.nama_mitra}", debit=sisa_utang, kredit=0))
            if (payload.dp or 0.0) > 0:
                akun_dp = "11110" if payload.dp_sumber == "Kas Tunai" else "11120"
                nama_dp = "Kas Tunai" if payload.dp_sumber == "Kas Tunai" else "Kas di Bank"
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
        
        pdf_bytes = export_invoice_pdf(header, items_inv, terbilang_str, config, customer)

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
            # Cari saldo piutang customer saat ini
            cust = db.query(models.Mitra).filter(models.Mitra.nama_mitra == i.nama_customer).first()
            sisa_piutang = cust.saldo_piutang if cust else 0
            
            # Jika saldo piutang sudah 0 tapi status masih Tempo, auto-koreksi ke Lunas
            if i.status == "Tempo" and sisa_piutang <= 0:
                i.status = "Lunas"
                db.commit()

            result.append({
                "no_invoice": i.no_invoice,
                "nama_customer": i.nama_customer,
                "total_tagihan": i.total_tagihan,
                "metode_bayar": i.metode_bayar,
                "uang_muka": getattr(i, 'uang_muka', 0.0) or 0.0,
                "status": i.status,
                "sisa_piutang_customer": sisa_piutang,
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
                "harga_per_lusin": d.harga_per_lusin,
                "subtotal": d.subtotal
            } for d in details
        ]})
    except Exception as e:
        return schemas.APIResponse(success=False, message=str(e))

@router.post("/retur", response_model=schemas.APIResponse)
def submit_retur(payload: schemas.SaleReturRequest, db: Session = Depends(get_db)):
    try:
        waktu_retur = datetime.datetime.fromisoformat(payload.tgl_retur.replace('Z', '+00:00')) if payload.tgl_retur else datetime.datetime.now()
        pilih_inv = db.query(models.HeaderPenjualan).filter(models.HeaderPenjualan.no_invoice == payload.no_invoice).first()
        barang_retur = db.query(models.DetailPenjualan).filter(models.DetailPenjualan.no_invoice == payload.no_invoice, models.DetailPenjualan.kode_sku == payload.kode_sku).first()
        
        if not pilih_inv or not barang_retur:
            raise Exception("Invoice atau barang tidak ditemukan")

        qty_retur_pcs = int(payload.qty_retur * 12)
        target_b = db.query(models.Barang).filter(models.Barang.kode_sku == payload.kode_sku).first()
        target_b.stok_saat_ini += qty_retur_pcs
        
        nilai_retur = payload.qty_retur * barang_retur.harga_per_lusin
        nilai_hpp_retur = float(qty_retur_pcs) * (target_b.harga_modal or 0.0)
        
        db.add(models.JurnalUmum(tanggal=waktu_retur, kode_akun="41120", nama_akun="Retur Penjualan", keterangan=f"Retur {pilih_inv.no_invoice} - {qty_retur_pcs} pcs", debit=nilai_retur, kredit=0))
        
        if pilih_inv.metode_bayar == "Piutang (Tempo)":
            akun_kredit = "11210"
            nama_kredit = "Piutang Usaha"
            cust_db = db.query(models.Mitra).filter(models.Mitra.nama_mitra == pilih_inv.nama_customer).first()
            if cust_db: cust_db.saldo_piutang -= nilai_retur
        elif pilih_inv.metode_bayar == "Transfer":
            akun_kredit = "11120"
            nama_kredit = "Kas di Bank"
        else:
            akun_kredit = "11110"
            nama_kredit = "Kas Tunai"
            
        db.add(models.JurnalUmum(tanggal=waktu_retur, kode_akun=akun_kredit, nama_akun=nama_kredit, keterangan=f"Retur {pilih_inv.no_invoice}", debit=0, kredit=nilai_retur))
        db.add(models.JurnalUmum(tanggal=waktu_retur, kode_akun="12150", nama_akun="Persediaan Barang Jadi", keterangan=f"Retur Masuk {qty_retur_pcs} pcs", debit=nilai_hpp_retur, kredit=0))
        db.add(models.JurnalUmum(tanggal=waktu_retur, kode_akun="51120", nama_akun="Harga Pokok Penjualan", keterangan=f"Batal HPP {pilih_inv.no_invoice}", debit=0, kredit=nilai_hpp_retur))
        
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

        items_inv = db.query(models.DetailPenjualan).filter(models.DetailPenjualan.no_invoice == no_inv).all()

        # 1. Kembalikan Stok Barang ke Gudang
        for d in items_inv:
            brg = db.query(models.Barang).filter(models.Barang.kode_sku == d.kode_sku).first()
            if brg:
                brg.stok_saat_ini += int(d.qty_lusin * 12)
        
        # 2. Kurangi Saldo Piutang Customer (Jika Ngutang)
        if pilih_histori.metode_bayar == "Piutang (Tempo)":
            j_piutang = db.query(models.JurnalUmum).filter(models.JurnalUmum.keterangan.contains(pilih_histori.no_invoice), models.JurnalUmum.kode_akun == "11210").first()
            if j_piutang:
                cust = db.query(models.Mitra).filter(models.Mitra.nama_mitra == pilih_histori.nama_customer).first()
                if cust:
                    cust.saldo_piutang -= j_piutang.debit

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
        waktu_bayar = datetime.datetime.now()

        # 1. Set status invoice ke Lunas (GEMBOK UTAMA - cegah race condition)
        invoice.status = "Lunas"

        # 2. Kurangi saldo piutang customer (pakai nominal aktual invoice jika ada toleransi)
        nominal_aktual = min(payload.nominal, customer.saldo_piutang)
        customer.saldo_piutang -= nominal_aktual

        # 3. Jurnal Keuangan: Kas/Bank (D) vs Piutang Usaha (K)
        akun_debit = "11110" if "Tunai" in payload.sumber_dana else "11120"
        nama_debit = "Kas Tunai" if akun_debit == "11110" else "Kas di Bank"

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
