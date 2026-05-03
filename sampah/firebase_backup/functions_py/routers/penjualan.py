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
        # Use simple date format to append random number to match existing if you want, but streamlit used: f"INV-{waktu_jual.strftime('%y%m%d%H%M')}"
        inv_no = f"INV-{waktu_jual.strftime('%y%m%d%H%M')}"
        
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

        # Simpan Header Invoice
        db.add(models.HeaderPenjualan(
            no_invoice=inv_no, 
            tanggal=waktu_jual, 
            nama_customer=cust.nama_mitra, 
            metode_bayar=payload.metode, 
            total_tagihan=total_tagihan, 
            diskon=payload.diskon or 0.0
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
                db.add(models.JurnalUmum(tanggal=waktu_jual, kode_akun="11110", nama_akun="Kas Tunai", keterangan=f"DP Invoice {inv_no} - {cust.nama_mitra}", debit=payload.dp, kredit=0))

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
        terbilang_str = terbilang(header.total_tagihan)
        
        pdf_bytes = export_invoice_pdf(header, items_inv, terbilang_str)

        res = io.BytesIO(pdf_bytes)
        return StreamingResponse(res, media_type="application/pdf", headers={"Content-Disposition": f"inline; filename={no_inv}.pdf"})
    except Exception as e:
        return {"error": str(e)}

@router.get("/history", response_model=schemas.APIResponse)
def get_penjualan_history(db: Session = Depends(get_db)):
    try:
        invoices = db.query(models.HeaderPenjualan).order_by(models.HeaderPenjualan.id.desc()).all()
        return schemas.APIResponse(success=True, message="Success", data={"list": [
            {
                "no_invoice": i.no_invoice,
                "nama_customer": i.nama_customer,
                "total_tagihan": i.total_tagihan,
                "metode_bayar": i.metode_bayar,
                "tanggal": i.tanggal.isoformat() if hasattr(i.tanggal, 'isoformat') else str(i.tanggal)
            } for i in invoices
        ]})
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
