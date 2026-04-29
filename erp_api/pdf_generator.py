from fpdf import FPDF
import datetime

class PDF(FPDF):
    def __init__(self, judul_laporan, periode="", orientation='P', config=None):
        # Membuka opsi kertas Portrait ('P') atau Landscape ('L')
        super().__init__(orientation=orientation, unit='mm', format='A4')
        self.judul_laporan = judul_laporan
        self.periode = periode
        self.config = config
        self.headers_data = None # Memori untuk menyimpan Print Titles (Header Tabel)

    def header(self):
        # Background Header Color (Premium Emerald)
        self.set_fill_color(6, 78, 59) # Emerald 900
        self.rect(0, 0, self.w, 40, 'F')
        
        # Logo placeholder or Text
        self.set_xy(10, 10)
        self.set_font('Arial', 'B', 20)
        self.set_text_color(255, 255, 255)
        self.cell(0, 10, self.config.nama_perusahaan if self.config else 'PABRIK RAZIQ GARMENT', 0, 1, 'L')
        
        self.set_font('Arial', '', 9)
        self.set_text_color(200, 255, 220)
        self.cell(0, 5, self.config.alamat if self.config else 'Bandung - Jawa Barat', 0, 1, 'L')
        
        # Report Title on Right
        self.set_xy(self.w - 100, 10)
        self.set_font('Arial', 'B', 14)
        self.set_text_color(255, 255, 255)
        self.cell(90, 10, self.judul_laporan.upper(), 0, 1, 'R')
        
        self.set_xy(self.w - 100, 18)
        self.set_font('Arial', 'I', 10)
        self.cell(90, 6, f'Periode: {self.periode}', 0, 1, 'R')
        
        self.set_y(45)
        self.set_text_color(0, 0, 0)

    def footer(self):
        # Nomor Halaman di bawah
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f'Halaman {self.page_no()} | Dicetak pada: {datetime.datetime.now().strftime("%d-%m-%Y %H:%M")}', 0, 0, 'C')

    def check_page_break(self, height):
        # Deteksi batas bawah (Kertas P tingginya 297mm, Kertas L tingginya 210mm)
        page_height = 297 if self.cur_orientation == 'P' else 210
        if self.get_y() + height > page_height - 25: # Sisa margin bawah 25mm
            self.add_page() # Otomatis mencetak ulang header()

    def add_ttd(self, config=None):
        self.check_page_break(55)
        self.ln(10)
        
        y_pos = self.get_y()
        # Position TTD on the right side for reports
        x_pos = self.w - 75
        
        self.set_font('Arial', '', 10)
        self.set_xy(x_pos, y_pos)
        self.cell(60, 5, 'Mengetahui,', 0, 1, 'C')
        
        y_img = self.get_y()
        
        # JIKA ADA URL TTD, TAMPILKAN GAMBARNYA
        if config and config.ttd_url:
            try:
                import os
                base_dir = os.path.dirname(os.path.abspath(__file__))
                local_path = os.path.join(base_dir, config.ttd_url.lstrip('/'))
                if os.path.exists(local_path):
                    self.image(local_path, x=x_pos + 15, y=y_img, w=30)
                    self.ln(20)
                else:
                    _draw_qr_to_pdf(self, config, x_pos + 18)
            except:
                self.ln(20)
        else:
            _draw_qr_to_pdf(self, config, x_pos + 18)

        self.set_y(y_img + 25)
        self.set_x(x_pos)
        self.set_font('Arial', 'BU', 10)
        nama_pimpinan = config.nama_pemilik if config else "Yana Taryana"
        jabatan = config.jabatan_pemilik if config else "Direktur Operasional"
        self.cell(60, 5, f'{jabatan} / {nama_pimpinan}', 0, 1, 'C')

def format_rp_pdf(angka):
    if angka is None: return ""
    if angka < 0: return f"(Rp {abs(angka):,.0f})".replace(',', '.')
    return f"Rp {angka:,.0f}".replace(',', '.')

# ====================================================================
# 1. ENGINE LAPORAN 2 KOLOM (PORTRAIT) - UNTUK HPP & LABA RUGI
# ====================================================================
def export_laporan_2kolom_pdf(judul, periode, data_list, label_total, val_total, config=None):
    pdf = PDF(judul, periode, orientation='P', config=config)
    pdf.add_page()
    
    for ket, nominal, is_header in data_list:
        pdf.check_page_break(10)
        if is_header:
            pdf.ln(2)
            pdf.set_font('Arial', 'B', 10)
            pdf.set_fill_color(240, 250, 245) # Light Emerald
            pdf.set_text_color(6, 78, 59) # Emerald 900
            pdf.cell(130, 8, f"  {ket}", 1, 0, 'L', 1)
            pdf.cell(60, 8, format_rp_pdf(nominal) if nominal is not None else '', 1, 1, 'R', 1)
        else:
            pdf.set_font('Arial', '', 10)
            pdf.set_text_color(50, 50, 50)
            pdf.cell(130, 7, f"       {ket}", 'LR', 0, 'L')
            pdf.cell(60, 7, format_rp_pdf(nominal), 'LR', 1, 'R')

    # Total Line
    pdf.set_fill_color(6, 78, 59)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font('Arial', 'B', 11)
    pdf.cell(130, 12, f"  {label_total}", 1, 0, 'L', 1)
    pdf.cell(60, 12, format_rp_pdf(val_total), 1, 1, 'R', 1)

    pdf.add_ttd(config)
    return pdf.output(dest='S').encode('latin-1')

# ====================================================================
# 2. ENGINE NERACA SKONTRO (LANDSCAPE) - DOUBLE COLUMN
# ====================================================================
def export_neraca_skontro_pdf(judul, periode, left_data, right_data, total_left, total_right, config=None):
    pdf = PDF(judul, periode, orientation='L', config=config)
    pdf.add_page()
    
    w_col = 90
    w_val = 45
    
    # Column Headers
    pdf.set_fill_color(230, 240, 235)
    pdf.set_font('Arial', 'B', 10)
    pdf.set_text_color(6, 78, 59)
    
    pdf.cell(w_col + w_val, 10, ' AKTIVA / ASET', 1, 0, 'C', 1)
    pdf.cell(10, 10, '', 0, 0) # Middle Gap
    pdf.cell(w_col + w_val, 10, ' PASIVA / KEWAJIBAN & EKUITAS', 1, 1, 'C', 1)
    
    max_len = max(len(left_data), len(right_data))
    pdf.set_text_color(0, 0, 0)
    
    for i in range(max_len):
        pdf.check_page_break(8)
        # LEFT COLUMN (Assets)
        if i < len(left_data):
            ket, val, is_h = left_data[i]
            pdf.set_font('Arial', 'B' if is_h else '', 9)
            pdf.cell(w_col, 7, f"  {ket}", 'LR', 0, 'L')
            pdf.cell(w_val, 7, format_rp_pdf(val) if val is not None else '', 'LR', 0, 'R')
        else:
            pdf.cell(w_col, 7, '', 'LR', 0)
            pdf.cell(w_val, 7, '', 'LR', 0)
            
        pdf.cell(10, 7, '', 0, 0) # Gap
        
        # RIGHT COLUMN (Liabilities & Equity)
        if i < len(right_data):
            ket, val, is_h = right_data[i]
            pdf.set_font('Arial', 'B' if is_h else '', 9)
            pdf.cell(w_col, 7, f"  {ket}", 'LR', 0, 'L')
            pdf.cell(w_val, 7, format_rp_pdf(val) if val is not None else '', 'LR', 1, 'R')
        else:
            pdf.cell(w_col, 7, '', 'LR', 0)
            pdf.cell(w_val, 7, '', 'LR', 1)

    # Summary Line (Balanced)
    pdf.set_fill_color(6, 78, 59)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font('Arial', 'B', 10)
    
    pdf.cell(w_col, 10, ' TOTAL AKTIVA', 1, 0, 'L', 1)
    pdf.cell(w_val, 10, format_rp_pdf(total_left), 1, 0, 'R', 1)
    pdf.cell(10, 10, '', 0, 0)
    pdf.cell(w_col, 10, ' TOTAL PASIVA', 1, 0, 'L', 1)
    pdf.cell(w_val, 10, format_rp_pdf(total_right), 1, 1, 'R', 1)

    pdf.add_ttd(config)
    return pdf.output(dest='S').encode('latin-1')

# ====================================================================
# 3. ENGINE TABEL PANJANG (LANDSCAPE) - UNTUK DAFTAR BARANG/STOK
# ====================================================================
def export_dataframe_pdf(judul, periode, df, col_widths, config=None):
    pdf = PDF(judul, periode, orientation='L', config=config)
    
    total_w = sum(col_widths)
    usable_width = 277 
    actual_widths = [(w / total_w) * usable_width for w in col_widths]
    cols = df.columns.tolist()
    
    # Custom Print Title
    pdf.headers_data = []
    for i, col in enumerate(cols):
        pdf.headers_data.append((actual_widths[i], col, 'C'))
    
    pdf.add_page()
    
    # Table Header manually for first page
    pdf.set_fill_color(6, 78, 59)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font('Arial', 'B', 9)
    for i, col in enumerate(cols):
        pdf.cell(actual_widths[i], 10, col, 1, 0, 'C', 1)
    pdf.ln()
    
    pdf.set_font('Arial', '', 9)
    pdf.set_text_color(0, 0, 0)
    for _, row in df.iterrows():
        pdf.check_page_break(7)
        for i, col in enumerate(cols):
            text = str(row[col])
            align = 'R' if any(x in text for x in ['Rp', 'Pcs', 'LS']) or any(x in col for x in ['Debit', 'Kredit', 'Saldo', 'Harga']) else 'L'
            if len(text) > 85: text = text[:82] + "..."
            pdf.cell(actual_widths[i], 7, text, 1, 0, align)
        pdf.ln()

    pdf.add_ttd(config)
    return pdf.output(dest='S').encode('latin-1')

# ====================================================================
# 4. ENGINE INVOICE PROFESIONAL (PORTRAIT)
# ====================================================================
def export_invoice_pdf(header_inv, detail_items, terbilang_teks, config, customer):
    pdf = FPDF('P', 'mm', 'A4')
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    
    # Header Section
    pdf.set_fill_color(6, 78, 59) # Emerald Dark
    pdf.rect(0, 0, 210, 60, 'F')
    
    pdf.set_xy(15, 10)
    pdf.set_font('Arial', 'B', 28)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(100, 12, config.nama_perusahaan if config else 'RAZIQ GARMENT', 0, 0, 'L')
    
    pdf.set_xy(130, 8)
    pdf.set_font('Arial', 'B', 48)
    pdf.cell(65, 22, 'INVOICE', 0, 1, 'R')
    
    pdf.set_xy(130, 30)
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(65, 6, f'NO: {header_inv.no_invoice}', 0, 1, 'R')
    
    # Detail Perusahaan (Contact Info)
    pdf.set_font('Arial', '', 9)
    pdf.set_text_color(200, 255, 220)
    pdf.set_xy(15, 25)
    pdf.cell(0, 5, config.alamat if config else 'Bandung - Jawa Barat', 0, 1, 'L')
    pdf.cell(0, 5, f"Telp: {config.no_telp if config else '-'}", 0, 1, 'L')
    pdf.cell(0, 5, f"Email: {config.email if config else '-'}", 0, 1, 'L')
    pdf.cell(0, 5, f"Web: {config.website if config else '-'}", 0, 1, 'L')
    
    # Date on Right
    pdf.set_xy(140, 42)
    pdf.set_font('Arial', 'B', 10)
    pdf.set_text_color(255, 255, 255)
    tgl_str = header_inv.tanggal.strftime('%d/%m/%Y') if hasattr(header_inv.tanggal, 'strftime') else str(header_inv.tanggal)
    pdf.cell(55, 5, f'TANGGAL: {tgl_str}', 0, 1, 'R')
    
    # Customer Info
    pdf.set_xy(15, 68)
    pdf.set_text_color(100, 100, 100)
    pdf.set_font('Arial', 'B', 11)
    pdf.cell(100, 6, 'DITAGIHKAN KEPADA:', 0, 1)
    
    pdf.set_font('Arial', 'B', 16)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(100, 10, str(header_inv.nama_customer).upper(), 0, 1)
    
    # Detail Client (Mitra)
    if customer:
        pdf.set_font('Arial', '', 10)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(100, 5, f"Alamat: {customer.alamat if customer.alamat else '-'}", 0, 1)
        pdf.cell(100, 5, f"No. HP: {customer.no_hp if customer.no_hp else '-'}", 0, 1)
    
    # Table Header
    pdf.ln(8)
    pdf.set_fill_color(6, 78, 59)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font('Arial', 'B', 11)
    pdf.cell(105, 12, '   KETERANGAN PRODUK', 0, 0, 'L', 1)
    pdf.cell(30, 12, 'HARGA UNIT', 0, 0, 'C', 1)
    pdf.cell(25, 12, 'QTY', 0, 0, 'C', 1)
    pdf.cell(30, 12, 'TOTAL   ', 0, 1, 'R', 1)
    
    pdf.set_text_color(30, 30, 30)
    pdf.set_font('Arial', '', 10)
    for item in detail_items:
        pdf.cell(105, 10, f"   {item.nama_barang}", 'B', 0, 'L')
        pdf.cell(30, 10, format_rp_pdf(item.harga_per_lusin), 'B', 0, 'C')
        pdf.cell(25, 10, f"{item.qty_lusin:g} Lsn", 'B', 0, 'C')
        pdf.cell(30, 10, format_rp_pdf(item.subtotal) + "   ", 'B', 1, 'R')
    
    # ─── Bagian Bawah: Informasi Bank & Ringkasan Pembayaran ──────────
    pdf.ln(8)
    y_after_table = pdf.get_y()
    
    # 1. SISI KIRI: Detail Bank & Terbilang
    pdf.set_font('Arial', 'B', 9)
    pdf.set_text_color(6, 78, 59)
    pdf.cell(100, 5, 'PEMBAYARAN VIA TRANSFER:', 0, 1)
    
    pdf.set_font('Arial', '', 9)
    pdf.set_text_color(50, 50, 50)
    pdf.cell(100, 5, f"Bank: {config.nama_bank if config else 'BCA'}", 0, 1)
    pdf.cell(100, 5, f"No Rekening: {config.no_rekening if config else '-'}", 0, 1)
    pdf.cell(100, 5, f"Atas Nama: {config.atas_nama_bank if config else '-'}", 0, 1)

    pdf.ln(2)
    pdf.set_font('Arial', 'I', 8)
    pdf.set_text_color(100, 100, 100)
    pdf.multi_cell(90, 4, f'Terbilang: # {terbilang_teks} Rupiah #', 0, 'L')

    # 2. SISI KANAN: Ringkasan Transaksi (Gunakan set_xy agar sejajar)
    # Gunakan lebar kolom yang sangat besar untuk mencegah tabrakan
    w_label = 145
    w_val = 45
    x_start = 10
    
    pdf.set_xy(x_start, y_after_table)
    pdf.set_font('Arial', '', 9)
    pdf.set_text_color(100, 100, 100)
    
    subtotal_items = sum(item.subtotal for item in detail_items)
    
    pdf.cell(w_label, 6, 'Subtotal Produk:', 0, 0, 'R')
    pdf.cell(w_val, 6, format_rp_pdf(subtotal_items), 0, 1, 'R')
    
    diskon = getattr(header_inv, 'diskon', 0.0) or 0.0
    if diskon > 0:
        pdf.set_x(x_start)
        pdf.cell(w_label, 6, 'Diskon:', 0, 0, 'R')
        pdf.cell(w_val, 6, f"- {format_rp_pdf(diskon)}", 0, 1, 'R')
        
    pdf.set_x(x_start)
    pdf.set_font('Arial', 'B', 10)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(w_label, 7, 'Total Tagihan:', 0, 0, 'R')
    pdf.cell(w_val, 7, format_rp_pdf(header_inv.total_tagihan), 0, 1, 'R')
    
    uang_muka = getattr(header_inv, 'uang_muka', 0.0) or 0.0
    if uang_muka > 0:
        pdf.set_x(x_start)
        pdf.set_font('Arial', '', 9)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(w_label, 6, 'Uang Muka (DP):', 0, 0, 'R')
        pdf.cell(w_val, 6, f"- {format_rp_pdf(uang_muka)}", 0, 1, 'R')
        
        pdf.ln(2)
        pdf.set_x(x_start) 
        pdf.set_font('Arial', 'B', 20) 
        pdf.set_text_color(180, 0, 0)
        pdf.cell(w_label, 12, 'SISA PIUTANG:', 0, 0, 'R')
        pdf.cell(w_val, 12, format_rp_pdf(header_inv.total_tagihan - uang_muka), 0, 1, 'R')
    else:
        pdf.ln(2)
        pdf.set_x(x_start)
        pdf.set_font('Arial', 'B', 20)
        pdf.set_text_color(6, 78, 59)
        pdf.cell(w_label, 12, 'TOTAL BAYAR:', 0, 0, 'R')
        pdf.cell(w_val, 12, format_rp_pdf(header_inv.total_tagihan), 0, 1, 'R')
    
    # Tanda Tangan
    pdf.ln(10)
    y_sig = pdf.get_y()
    _draw_qr_to_pdf(pdf, config, 20)
    pdf.set_xy(15, y_sig + 22)
    pdf.set_font('Arial', 'B', 10)
    pdf.set_text_color(180, 0, 0) # Merah sesuai screenshot
    pdf.cell(100, 6, (config.nama_pemilik if config else 'Yana Taryana').upper(), 0, 1, 'L')
    
    return pdf.output(dest='S').encode('latin-1')

# ====================================================================
# 5. ENGINE PURCHASE ORDER (PO) PROFESIONAL
# ====================================================================
def export_purchase_pdf(header_po, detail_items, terbilang_teks, config=None):
    pdf = FPDF('P', 'mm', 'A4')
    pdf.add_page()
    
    pdf.set_font('Arial', 'B', 20)
    pdf.set_text_color(6, 78, 59)
    pdf.cell(0, 10, config.nama_perusahaan if config else 'PABRIK RAZIQ GARMENT', 0, 1, 'L')
    
    pdf.set_font('Arial', '', 10)
    pdf.set_text_color(50, 50, 50)
    pdf.cell(0, 5, config.alamat if config else 'Bandung - Jawa Barat', 0, 1, 'L')
    pdf.line(10, 35, 200, 35)
    
    pdf.ln(10)
    pdf.set_font('Arial', 'B', 16)
    pdf.cell(0, 10, 'PURCHASE ORDER', 0, 1, 'C')
    pdf.set_font('Arial', '', 10)
    pdf.cell(0, 5, f'No PO: {header_po.no_po}', 0, 1, 'C')
    
    # Table Header
    pdf.ln(10)
    pdf.set_fill_color(6, 78, 59)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font('Arial', 'B', 10)
    pdf.cell(10, 10, 'No', 1, 0, 'C', 1)
    pdf.cell(85, 10, 'Nama Barang', 1, 0, 'C', 1)
    pdf.cell(25, 10, 'Qty', 1, 0, 'C', 1)
    pdf.cell(35, 10, 'Harga', 1, 0, 'C', 1)
    pdf.cell(35, 10, 'Total', 1, 1, 'C', 1)
    
    pdf.set_text_color(0, 0, 0)
    pdf.set_font('Arial', '', 10)
    for i, row in enumerate(detail_items):
        qty = getattr(row, 'qty_kg', 0) or getattr(row, 'qty_pcs', 0)
        pdf.cell(10, 8, str(i+1), 1, 0, 'C')
        pdf.cell(85, 8, f" {row.nama_barang}", 1, 0, 'L')
        pdf.cell(25, 8, f"{qty:g}", 1, 0, 'C')
        pdf.cell(35, 8, format_rp_pdf(getattr(row, 'harga_per_kg', 0) or getattr(row, 'harga_modal', 0)), 1, 0, 'R')
        pdf.cell(35, 8, format_rp_pdf(row.subtotal), 1, 1, 'R')
    
    pdf.ln(10)
    y_sig = pdf.get_y()
    _draw_qr_to_pdf(pdf, config, 145)
    pdf.set_xy(120, y_sig + 22)
    pdf.cell(70, 5, config.nama_pemilik if config else 'Yana Taryana', 0, 1, 'C')
    
    return pdf.output(dest='S').encode('latin-1')

def _draw_qr_to_pdf(pdf, config, x_pos):
    try:
        import requests, tempfile
        nama_p = config.nama_pemilik if config else "Yana Taryana"
        qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=VALIDATED_BY_{nama_p.replace(' ', '_')}"
        res = requests.get(qr_url, timeout=5)
        if res.status_code == 200:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tf:
                tf.write(res.content)
                temp_name = tf.name
            pdf.image(temp_name, x=x_pos, y=pdf.get_y(), w=22)
            pdf.ln(22)
        else: pdf.ln(22)
    except: pdf.ln(22)
