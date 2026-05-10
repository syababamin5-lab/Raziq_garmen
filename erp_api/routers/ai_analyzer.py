import datetime
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from models import get_db
import models
import google.generativeai as genai

from pydantic import BaseModel

router = APIRouter(prefix="/api/ai", tags=["AI Assistant"])

class AskRequest(BaseModel):
    prompt: str

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

        # 3. Profit & Loss (HPP, Pendapatan, Beban) - SYNC WITH laporan.py
        # Logic: Omzet (411), HPP (5111, 512, 513, 51199, 51120), Beban (61, 62)
        pendapatan = db.query(func.sum(models.JurnalUmum.kredit - models.JurnalUmum.debit)).filter(
            models.JurnalUmum.kode_akun.startswith('411'),
            models.JurnalUmum.tanggal >= first_day
        ).scalar() or 0
        
        # HPP: Baku (5111), BTKL (512), BOP (513), Ikhtisar (51199), Terjual (51120)
        hpp = db.query(func.sum(models.JurnalUmum.debit - models.JurnalUmum.kredit)).filter(
            or_(
                models.JurnalUmum.kode_akun.startswith('5111'),
                models.JurnalUmum.kode_akun.startswith('512'),
                models.JurnalUmum.kode_akun.startswith('513'),
                models.JurnalUmum.kode_akun.startswith('51199'),
                models.JurnalUmum.kode_akun.startswith('51120')
            ),
            models.JurnalUmum.tanggal >= first_day
        ).scalar() or 0
        
        beban_ops = db.query(func.sum(models.JurnalUmum.debit - models.JurnalUmum.kredit)).filter(
            or_(
                models.JurnalUmum.kode_akun.startswith('61'),
                models.JurnalUmum.kode_akun.startswith('62')
            ),
            models.JurnalUmum.tanggal >= first_day
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
        # Mencari model yang tersedia secara dinamis agar tidak 404
        try:
            available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
            # Prioritaskan flash terbaru agar cepat dan hemat
            target_model = next((m for m in available_models if 'flash' in m), 
                               available_models[0] if available_models else 'models/gemini-1.5-flash')
            model = genai.GenerativeModel(target_model)
        except Exception as e:
            # Fallback jika list_models gagal (beberapa environment membatasi ini)
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

# ==========================================================
# AI EXECUTIVE ASSISTANT (CHAT/SEARCH) - TEXT-TO-SQL AGENT
# ==========================================================

SCHEMA_CONTEXT = """
Database ini adalah sistem ERP Garmen. Gunakan SQLite syntax. 
Berikut adalah tabel-tabel utama:

1. jurnal_umum (Akuntansi Dasar):
   - id, tanggal, kode_akun, nama_akun, keterangan, debit, kredit
   - RUMUS SALDO:
     * Pendapatan: SUM(kredit - debit) WHERE kode_akun LIKE '411%'
     * HPP: SUM(debit - kredit) WHERE kode_akun IN ('5111%', '512%', '513%', '51199%', '51120%')
     * Beban Operasional: SUM(debit - kredit) WHERE kode_akun LIKE '6%'
     * Kas/Bank: SUM(debit - kredit) WHERE kode_akun LIKE '111%'
   - PENTING: Jangan hanya SUM(debit) agar reversal/VOID terhitung benar.

2. barang (Master Barang/Stok):
   - id, model_code, nama_barang, kode_sku, kategori, satuan, stok_saat_ini, harga_jual, harga_modal
3. mitra (Customer/Supplier):
   - id, nama_mitra, kategori, no_hp, email, alamat, saldo_piutang, saldo_utang
4. karyawan (SDM):
   - id, nama_karyawan, no_hp, alamat, divisi, tipe_gaji, nominal_gaji, target_produksi_mingguan, saldo_kasbon, is_active
5. header_penjualan (Invoice Penjualan):
   - id, no_invoice, tanggal, nama_customer, metode_bayar, total_tagihan, status (Lunas/Tempo)
6. detail_penjualan (Item yang dijual):
   - id, no_invoice, kode_sku, nama_barang, qty_lusin, harga_per_lusin, subtotal
7. header_pembelian (PO Pembelian ke Supplier):
   - id, no_po, tanggal, nama_supplier, metode_bayar, total_tagihan, status
8. detail_pembelian (Item yang dibeli):
   - id, no_po, kode_sku, nama_barang, qty_kg, harga_per_kg, subtotal
9. production_logs (Catatan Produksi Harian):
   - id, tanggal, divisi (Cutting/Jahit/Finishing), kode_sku, nama_barang, qty_hasil, karyawan_id

INSTRUKSI PENTING UNTUK QUERY: 
- Selalu filter berdasarkan 'tanggal' jika ditanya 'bulan ini', 'hari ini', atau periode tertentu.
- Waktu sekarang (sebagai referensi filter): {now_placeholder}
- Jika mencari kode/ID (seperti no_invoice, kode_sku), gunakan pencocokan case-insensitive (ILIKE di Postgres, atau UPPER() di SQLite).
- Jika pertanyaan terlalu ambigu, kembalikan HANYA kata: CLARIFY
- Pastikan query aman (read-only SELECT).
"""

@router.post("/tanya")
def ai_executive_assistant(req: AskRequest, db: Session = Depends(get_db)):
    """Agent Text-to-SQL: Menerjemahkan bahasa natural ke Query Database secara dinamis"""
    if not GEMINI_API_KEY:
        return {"status": "error", "message": "API Key Gemini belum di-set!"}

    try:
        from sqlalchemy import text
        import json
        
        # 1. INITIALIZE GEMINI DYNAMICALLY
        try:
            available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
            target_model = next((m for m in available_models if 'flash' in m), 
                               available_models[0] if available_models else 'models/gemini-1.5-flash')
            model = genai.GenerativeModel(target_model)
        except Exception:
            model = genai.GenerativeModel('gemini-1.5-flash')
        now = datetime.datetime.now()
        
        # 2. DETECT DATABASE TYPE
        from models import SQLALCHEMY_DATABASE_URL
        db_type = "PostgreSQL" if SQLALCHEMY_DATABASE_URL.startswith("postgresql") else "SQLite"
        
        # 3. GENERATE SQL QUERY
        sql_prompt = (
            f"{SCHEMA_CONTEXT.replace('{now_placeholder}', now.strftime('%Y-%m-%d %H:%M:%S'))}\n\n"
            f"DIALECT: {db_type}\n"
            f"Waktu Sekarang: {now.strftime('%Y-%m-%d %H:%M:%S')}\n"
            f"Pertanyaan Bos: {req.prompt}\n\n"
            f"Query SQL {db_type} (SELECT ONLY):"
        )
        
        sql_response = model.generate_content(sql_prompt).text.strip()
        # Clean up potential markdown formatting
        sql_query = sql_response.replace('```sql', '').replace('```', '').strip()
        
        # 4. HANDLE CLARIFICATION OR INVALID SQL
        if "CLARIFY" in sql_query.upper() or len(sql_query.split()) < 3:
            return {
                "status": "success",
                "jawaban_teks": "Pertanyaan Anda kurang spesifik nih, Bos. Bisa diperjelas ingin cek apa di Soundtrax? (Contoh: 'Cek omset dari Soundtrax' atau 'Cek hutang ke Soundtrax')",
                "data_tabel": []
            }

        # SAFETY CHECK: Only allow SELECT
        forbidden = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE", "CREATE"]
        if any(f in sql_query.upper() for f in forbidden):
            return {"status": "error", "message": "Permintaan ditolak demi keamanan."}

        # 5. EXECUTE SQL (READ-ONLY)
        result_proxy = db.execute(text(sql_query))
        rows = result_proxy.fetchall()
        columns = result_proxy.keys()
        
        # Convert result to list of dicts for processing
        data_raw = []
        for row in rows:
            data_raw.append(dict(zip(columns, row)))
        
        # 4. SUMMARIZE RESULTS (NATURAL LANGUAGE)
        summary_prompt = (
            "Kamu adalah Asisten Eksekutif Pabrik Garmen yang cerdas. "
            "Bos bertanya: '" + req.prompt + "'\n"
            "Hasil data dari database (SQL Result):\n" + json.dumps(data_raw[:20], default=str) + "\n\n"
            "Tugasmu:\n"
            "1. Berikan jawaban rangkuman yang ramah dan eksekutif (max 3-4 kalimat).\n"
            "2. Gunakan angka Rp atau Qty sesuai data.\n"
            "3. Jika data kosong, katakan dengan sopan bahwa data tidak ditemukan."
        )
        
        summary_response = model.generate_content(summary_prompt).text.strip()

        # 5. FORMAT DATA TABLE FOR UI
        # Kita ambil maksimal 10-15 baris agar tidak kepenuhan di UI
        data_tabel = []
        for row in data_raw[:15]:
            formatted_row = {}
            for k, v in row.items():
                # Formatting sederhana untuk nominal uang
                # Formatting cerdas: Rp untuk uang, Angka murni untuk qty/lusin/pcs
                is_money = any(x in k.lower() for x in ['total', 'nominal', 'saldo', 'harga', 'tagihan', 'debit', 'kredit', 'nilai'])
                is_qty = any(x in k.lower() for x in ['qty', 'lusin', 'pcs', 'hasil', 'jumlah'])
                
                if isinstance(v, (int, float)) and is_money and not is_qty:
                    formatted_row[k.replace('_', ' ').title()] = f"Rp {v:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
                elif isinstance(v, (int, float)):
                    # Format angka ribuan untuk qty tanpa Rp
                    formatted_row[k.replace('_', ' ').title()] = f"{v:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
                else:
                    formatted_row[k.replace('_', ' ').title()] = str(v)
            data_tabel.append(formatted_row)

        return {
            "status": "success",
            "jawaban_teks": summary_response,
            "data_tabel": data_tabel,
            "metadata": {
                "query_generated": sql_query,
                "timestamp": now.isoformat()
            }
        }

    except Exception as e:
        err_msg = str(e)
        if "429" in err_msg:
            return {
                "status": "success", 
                "jawaban_teks": "Mohon maaf Bos, kuota harian/menit AI (Gemini Free Tier) sedang penuh. Silakan tunggu sekitar 10-20 detik dan coba lagi. 🙏",
                "data_tabel": []
            }
        return {"status": "error", "message": f"AI Assistant Error: {err_msg}"}
