import datetime
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from models import get_db
import models
import google.generativeai as genai

router = APIRouter(prefix="/api/ai", tags=["AI Analyzer"])

# Konfigurasi AI (Pastikan API Key ada di environment)
GEMINI_API_KEY = os.environ.get("GOOGLE_API_KEY", "").strip()
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

@router.get("/financial-health")
def get_ai_financial_analysis(db: Session = Depends(get_db)):
    """Data Pipeline: Mengumpulkan seluruh data keuangan untuk dianalisis AI"""
    try:
        # 1. Agregasi Arus Kas (Bulan Ini)
        now = datetime.datetime.now()
        first_day = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        cash_in = db.query(func.sum(models.JurnalUmum.debit)).filter(
            models.JurnalUmum.kode_akun.startswith('111'), # Kas & Bank
            models.JurnalUmum.tanggal >= first_day
        ).scalar() or 0
        
        cash_out = db.query(func.sum(models.JurnalUmum.kredit)).filter(
            models.JurnalUmum.kode_akun.startswith('111'),
            models.JurnalUmum.tanggal >= first_day
        ).scalar() or 0

        # 2. Data Neraca (Aktiva vs Pasiva)
        total_aktiva = db.query(func.sum(models.JurnalUmum.debit - models.JurnalUmum.kredit)).filter(
            or_(
                models.JurnalUmum.kode_akun.startswith('1')
            )
        ).scalar() or 0
        
        total_pasiva = db.query(func.sum(models.JurnalUmum.kredit - models.JurnalUmum.debit)).filter(
            or_(
                models.JurnalUmum.kode_akun.startswith('2'),
                models.JurnalUmum.kode_akun.startswith('3')
            )
        ).scalar() or 0
        
        selisih_neraca = abs(total_aktiva - total_pasiva)
        is_balance = selisih_neraca < 1.0

        # 3. Profit & Loss (HPP, Pendapatan, Beban)
        pendapatan = db.query(func.sum(models.JurnalUmum.kredit - models.JurnalUmum.debit)).filter(
            models.JurnalUmum.kode_akun.startswith('4')
        ).scalar() or 0
        
        hpp = db.query(func.sum(models.JurnalUmum.debit - models.JurnalUmum.kredit)).filter(
            models.JurnalUmum.kode_akun.startswith('5')
        ).scalar() or 0
        
        beban_ops = db.query(func.sum(models.JurnalUmum.debit - models.JurnalUmum.kredit)).filter(
            models.JurnalUmum.kode_akun.startswith('6')
        ).scalar() or 0

        # 4. Data Persediaan & WIP
        persediaan_bahan = db.query(func.sum(models.Barang.stok_saat_ini * models.Barang.harga_modal)).filter(
            models.Barang.kategori.ilike('%Bahan%')
        ).scalar() or 0
        
        persediaan_jadi = db.query(func.sum(models.Barang.stok_saat_ini * models.Barang.harga_modal)).filter(
            models.Barang.kategori.ilike('%Jadi%')
        ).scalar() or 0
        
        # WIP (Estimasi dari log produksi yang belum selesai/terkirim)
        total_wip_cutting = db.query(func.sum(models.ProductionLog.qty_hasil)).filter(
            models.ProductionLog.divisi == 'CUTTING'
        ).scalar() or 0

        # Konstruksi Data JSON untuk AI
        financial_data = {
            "periode": now.strftime("%B %Y"),
            "arus_kas": {
                "masuk_bulan_ini": cash_in,
                "keluar_bulan_ini": cash_out,
                "net_cash_flow": cash_in - cash_out
            },
            "neraca": {
                "total_aktiva": total_aktiva,
                "total_pasiva": total_pasiva,
                "selisih": selisih_neraca,
                "status": "BALANCE" if is_balance else "TIDAK BALANCE"
            },
            "laba_rugi": {
                "pendapatan_kotor": pendapatan,
                "hpp": hpp,
                "beban_operasional": beban_ops,
                "laba_bersih_estimasi": pendapatan - hpp - beban_ops
            },
            "inventory_wip": {
                "nilai_bahan_baku": persediaan_bahan,
                "nilai_barang_jadi": persediaan_jadi,
                "total_wip_cutting_pcs": total_wip_cutting
            }
        }

        if not GEMINI_API_KEY:
            return {
                "status": "warning",
                "message": "API Key tidak ditemukan. Silakan tambahkan GOOGLE_API_KEY di environment.",
                "raw_data": financial_data
            }

        # Panggil AI (System Prompt sesuai permintaan)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        system_prompt = (
            "Kamu adalah seorang Chief Financial Officer (CFO) dan Analis Keuangan Senior di industri garmen/konveksi. "
            "Tugasmu adalah membaca, menganalisis, dan mengekstrak wawasan dari data keuangan perusahaan berikut ini. "
            "Gunakan bahasa Indonesia yang profesional namun mudah dimengerti pimpinan.\n\n"
            f"DATA KEUANGAN:\n{financial_data}\n\n"
            "Hasilkan laporan dengan struktur:\n"
            "1. Ringkasan Eksekutif (2-3 paragraf)\n"
            "2. Analisis Neraca & Kas (Verifikasi balance, evaluasi kecukupan kas)\n"
            "3. Evaluasi Persediaan (Warning jika modal mengendap di bahan baku/WIP)\n"
            "4. Deteksi Anomali (Highllight pengeluaran atau piutang)\n"
            "5. Rekomendasi Strategis (3-5 saran taktis hari ini)\n"
            "Bersikaplah objektif dan bersandar penuh pada data."
        )

        response = model.generate_content(system_prompt)
        
        return {
            "status": "success",
            "analysis": response.text,
            "data_snapshot": financial_data
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}
