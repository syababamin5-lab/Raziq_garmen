from fpdf import FPDF
import datetime

class PDF(FPDF):
    def __init__(self, judul_laporan, periode="", orientation='P', config=None, use_default_header=True):
        # Membuka opsi kertas Portrait ('P') atau Landscape ('L')
        super().__init__(orientation=orientation, unit='mm', format='A4')
        self.judul_laporan = judul_laporan
        self.periode = periode
        self.config = config
        self.use_default_header = use_default_header
        self.headers_data = None # Memori untuk menyimpan Print Titles (Header Tabel)

    def header(self):
        if not self.use_default_header:
            return
            
        # Background Header Color (Premium Emerald)
        self.set_fill_color(6, 78, 59) # Emerald 900
        self.rect(0, 0, self.w, 40, 'F')
        
        # Logo placeholder or Text
        self.set_xy(10, 10)
        self.set_font('Arial', 'B', 20)
        self.set_text_color(255, 255, 255)
        self.cell(0, 10, self.config.nama_perusahaan if self.config else 'RAZIQ GARMENT', 0, 1, 'L')
        
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

        # === BARU: PENGULANGAN HEADER TABEL OTOMATIS ===
        if self.headers_data:
            self.set_font('Arial', 'B', 9)
            self.set_fill_color(6, 78, 59)
            self.set_text_color(255, 255, 255)
            for width, col_name, align in self.headers_data:
                self.cell(width, 10, col_name, 1, 0, 'C', 1)
            self.ln()
            self.set_text_color(0, 0, 0)
            self.set_font('Arial', '', 9)

    def footer(self):
        # Posisi 15 mm dari bawah
        self.set_y(-15)
        self.set_font('Arial', 'I', 7)
        self.set_text_color(160, 160, 160)
        
        # Garis tipis pembatas footer
        self.set_draw_color(220, 220, 220)
        self.line(10, self.get_y(), self.w - 10, self.get_y())
        
        # Developed by (Kiri)
        self.set_x(10)
        self.cell(0, 8, 'Developed by ANSA ENTERPRISE', 0, 0, 'L')
        
        # Halaman (Tengah)
        self.set_x(0)
        self.cell(self.w, 8, f'Halaman {self.page_no()}', 0, 0, 'C')
        
        # Waktu Cetak (Kanan)
        wib = datetime.timezone(datetime.timedelta(hours=7))
        self.set_x(self.w - 100)
        self.cell(90, 8, f'Dicetak: {datetime.datetime.now(wib).strftime("%d/%m/%Y %H:%M")}', 0, 0, 'R')

    def check_page_break(self, height):
        # Deteksi batas bawah (Kertas P tingginya 297mm, Kertas L tingginya 210mm)
        page_height = 297 if self.cur_orientation == 'P' else 210
        if self.get_y() + height > page_height - 25: # Sisa margin bawah 25mm
            self.add_page() # Otomatis mencetak ulang header()

    def add_ttd(self, config=None, nama=None, jabatan=None, nama_admin=None, jabatan_admin=None):
        self.check_page_break(55)
        self.ln(10)
        
        y_pos = self.get_y()
        
        # LOGIKA NAMA & JABATAN
        n_p = nama or (config.ttd_laporan_nama if config and config.ttd_laporan_nama else (config.nama_pemilik if config else "Yana Taryana"))
        j_p = jabatan or (config.ttd_laporan_jabatan if config and config.ttd_laporan_jabatan else (config.jabatan_pemilik if config else "Direktur Operasional"))
        
        n_a = nama_admin or (config.ttd_admin_nama if config and config.ttd_admin_nama else "Admin Keuangan")
        j_a = jabatan_admin or (config.ttd_admin_jabatan if config and config.ttd_admin_jabatan else "Administrasi")

        # 1. KOLOM KIRI: DIBUAT OLEH (ADMIN)
        self.set_xy(15, y_pos)
        self.set_font('Arial', '', 10)
        self.cell(60, 5, 'Dibuat Oleh,', 0, 1, 'C')
        y_img_a = self.get_y()
        _draw_qr_to_pdf(self, config, 33, n_a)
        
        self.set_xy(15, y_img_a + 25)
        self.set_font('Arial', 'BU', 10)
        self.cell(60, 5, f'{n_a}', 0, 1, 'C')
        self.set_font('Arial', '', 9)
        self.set_x(15)
        self.cell(60, 5, f'{j_a}', 0, 1, 'C')

        # 2. KOLOM KANAN: MENGETAHUI (PIMPINAN)
        x_pos_p = self.w - 75
        self.set_xy(x_pos_p, y_pos)
        self.set_font('Arial', '', 10)
        self.cell(60, 5, 'Mengetahui,', 0, 1, 'C')
        y_img_p = self.get_y()
        
        # JIKA ADA URL TTD, TAMPILKAN GAMBARNYA (Hanya untuk Pimpinan)
        if config and config.ttd_url:
            try:
                import os
                base_dir = os.path.dirname(os.path.abspath(__file__))
                local_path = os.path.join(base_dir, config.ttd_url.lstrip('/'))
                if os.path.exists(local_path):
                    self.image(local_path, x=x_pos_p + 15, y=y_img_p, w=30)
                    self.ln(20)
                else:
                    _draw_qr_to_pdf(self, config, x_pos_p + 18, n_p)
            except:
                _draw_qr_to_pdf(self, config, x_pos_p + 18, n_p)
        else:
            _draw_qr_to_pdf(self, config, x_pos_p + 18, n_p)

        self.set_xy(x_pos_p, y_img_p + 25)
        self.set_font('Arial', 'BU', 10)
        self.cell(60, 5, f'{n_p}', 0, 1, 'C')
        self.set_font('Arial', '', 9)
        self.set_x(x_pos_p)
        self.cell(60, 5, f'{j_p}', 0, 1, 'C')

def format_rp_pdf(angka):
    if angka is None: return ""
    if angka < 0: return f"({abs(angka):,.0f})".replace(',', '.')
    return f"{angka:,.0f}".replace(',', '.')

def cell_accounting(pdf, w, h, angka, border=1, ln=0, fill=0):
    """Mencetak cell dengan format Accounting (Rp di kiri, angka di kanan)"""
    x = pdf.get_x()
    y = pdf.get_y()
    
    # 1. Cetak Border & Background dulu
    pdf.cell(w, h, "", border, 0, 'L', fill)
    
    # 2. Cetak "Rp" di kiri
    pdf.set_xy(x + 1, y)
    pdf.cell(w - 2, h, "Rp", 0, 0, 'L')
    
    # 3. Cetak Angka di kanan
    pdf.set_xy(x + 1, y)
    text = format_rp_pdf(angka)
    pdf.cell(w - 2, h, text, 0, 0, 'R')
    
    # 4. Kembalikan posisi X ke ujung cell
    pdf.set_xy(x + w, y)
    if ln > 0:
        pdf.ln(h)

# ====================================================================
# 1. ENGINE LAPORAN 2 KOLOM (PORTRAIT) - UNTUK HPP & LABA RUGI
# ====================================================================
def export_laporan_2kolom_pdf(judul, periode, data_list, label_total, val_total, config=None, nama_ttd=None, jabatan_ttd=None, nama_admin=None, jabatan_admin=None):
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

    pdf.set_text_color(0, 0, 0) # Reset ke hitam
    pdf.add_ttd(config, nama=nama_ttd, jabatan=jabatan_ttd, nama_admin=nama_admin, jabatan_admin=jabatan_admin)
    return pdf.output(dest='S').encode('latin-1')

# ====================================================================
# 2. ENGINE NERACA SKONTRO (LANDSCAPE) - DOUBLE COLUMN
# ====================================================================
def export_neraca_skontro_pdf(judul, periode, left_data, right_data, total_left, total_right, config=None, nama_ttd=None, jabatan_ttd=None, nama_admin=None, jabatan_admin=None):
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

    pdf.set_text_color(0, 0, 0)
    pdf.add_ttd(config, nama=nama_ttd, jabatan=jabatan_ttd, nama_admin=nama_admin, jabatan_admin=jabatan_admin)
    return pdf.output(dest='S').encode('latin-1')

# ====================================================================
# 3. ENGINE TABEL PANJANG (LANDSCAPE) - UNTUK DAFTAR BARANG/STOK
# ====================================================================
def export_dataframe_pdf(judul, periode, df, col_widths, config=None, nama_ttd=None, jabatan_ttd=None, nama_admin=None, jabatan_admin=None):
    # Gunakan Orientasi Portrait jika kolom sedikit, Landscape jika banyak
    orient = 'P' if len(df.columns) <= 5 else 'L'
    pdf = PDF(judul, periode, orientation=orient, config=config)
    
    total_w = sum(col_widths)
    usable_width = 190 if orient == 'P' else 277 
    actual_widths = [(w / total_w) * usable_width for w in col_widths]
    cols = df.columns.tolist()
    
    pdf.headers_data = []
    for i, col in enumerate(cols):
        pdf.headers_data.append((actual_widths[i], col, 'C'))
    
    pdf.add_page()
    pdf.set_font('Arial', '', 9)
    
    for _, row in df.iterrows():
        # Cek apakah baris ini adalah baris TOTAL (biasanya ditandai di kolom kedua)
        is_total_row = "TOTAL" in str(row.iloc[1]).upper()
        
        if is_total_row:
            pdf.set_font('Arial', 'B', 10)
            pdf.set_fill_color(240, 240, 240)
        else:
            pdf.set_font('Arial', '', 9)

        for i, col in enumerate(cols):
            val = row[col]
            text = str(val)
            
            # Auto-align: Kanan untuk angka/Rupiah, Kiri untuk teks
            align = 'L'
            if any(x in text for x in ['Rp', 'Pcs', 'LS']) or isinstance(val, (int, float)):
                align = 'R'
            
            fill = 1 if is_total_row else 0
            pdf.cell(actual_widths[i], 8, text, 1, 0, align, fill)
        pdf.ln()

    pdf.set_font('Arial', '', 9)
    pdf.set_text_color(0, 0, 0)
    pdf.add_ttd(config, nama=nama_ttd, jabatan=jabatan_ttd, nama_admin=nama_admin, jabatan_admin=jabatan_admin)
    return pdf.output(dest='S').encode('latin-1')

def export_stok_inventory_pdf(judul, periode, df, col_widths, config=None, nama_ttd=None, jabatan_ttd=None, nama_admin=None, jabatan_admin=None):
    # Inventaris stok selalu Landscape agar lega
    pdf = PDF(judul, periode, orientation='L', config=config)
    
    total_w = sum(col_widths)
    usable_width = 277 
    actual_widths = [(w / total_w) * usable_width for w in col_widths]
    cols = df.columns.tolist()
    
    pdf.headers_data = []
    for i, col in enumerate(cols):
        pdf.headers_data.append((actual_widths[i], col, 'C'))
    
    pdf.add_page()
    pdf.set_font('Arial', '', 9)
    
    cumulative_total = 0
    page_total = 0
    
    # Cari indeks kolom "Total Nilai" (biasanya kolom ke-7 atau terakhir)
    # Kita asumsikan kolom yang berisi numerik murni adalah target total
    nilai_col_idx = -1
    for i, col in enumerate(cols):
        if col == "Total Nilai":
            nilai_col_idx = i
            break
            
    for idx, row in df.iterrows():
        # Cek Ganti Halaman
        # Kita butuh ruang lega untuk: 2 Baris Total (16mm) agar tidak terpisah
        if pdf.get_y() > 165: 
            # Cetak Footer Halaman (Subtotal)
            pdf.set_font('Arial', 'B', 9) # Diselaraskan ke 9pt
            pdf.set_fill_color(245, 245, 245)
            
            # Label Halaman (Semua kolom kecuali kolom terakhir)
            label_w = sum(actual_widths[:-1])
            pdf.cell(label_w, 8, f" TOTAL NILAI HALAMAN {pdf.page_no()}", 1, 0, 'R', 1)
            cell_accounting(pdf, actual_widths[-1], 8, page_total, border=1, ln=1, fill=1)
                
            # Cetak Akumulasi
            pdf.cell(label_w, 8, f" TOTAL AKUMULASI (S.D HALAMAN {pdf.page_no()})", 1, 0, 'R', 1)
            cell_accounting(pdf, actual_widths[-1], 8, cumulative_total, border=1, ln=1, fill=1)
                
            page_total = 0 # Reset page total
            pdf.add_page()
            pdf.set_font('Arial', '', 9)

        # Cetak Baris Data
        for i, col in enumerate(cols):
            val = row[col]
            
            # Jika ini kolom Total Nilai (kolom terakhir), format jadi Rupiah Accounting
            if i == len(cols) - 1:
                num_val = float(val) if val else 0
                page_total += num_val
                cumulative_total += num_val
                cell_accounting(pdf, actual_widths[i], 7, num_val)
            elif "Harga Modal" in col or "Harga Jual" in col:
                # Coba ekstrak angka dari string "Rp 123.000/Pcs"
                try:
                    import re
                    clean_str = str(val).replace('.', '').replace(',', '')
                    num_match = re.search(r'(\d+)', clean_str)
                    if num_match:
                        num_val = float(num_match.group(1))
                        cell_accounting(pdf, actual_widths[i], 7, num_val)
                    else:
                        pdf.cell(actual_widths[i], 7, str(val), 1, 0, 'L')
                except:
                    pdf.cell(actual_widths[i], 7, str(val), 1, 0, 'L')
            else:
                text = str(val)
                align = 'L'
                if any(x in text for x in ['Pcs', 'LS']) or isinstance(val, (int, float)):
                    align = 'R'
                pdf.cell(actual_widths[i], 7, text, 1, 0, align)
        pdf.ln()

    # Cetak Footer untuk Halaman Terakhir (jika belum tercetak di dalam loop)
    if page_total > 0:
        pdf.set_font('Arial', 'B', 9) # Diselaraskan ke 9pt
        pdf.set_fill_color(245, 245, 245)
        label_w = sum(actual_widths[:-1])
        pdf.cell(label_w, 8, f" TOTAL NILAI HALAMAN {pdf.page_no()}", 1, 0, 'R', 1)
        cell_accounting(pdf, actual_widths[-1], 8, page_total, border=1, ln=1, fill=1)
        pdf.cell(label_w, 8, f" TOTAL AKUMULASI (S.D HALAMAN {pdf.page_no()})", 1, 0, 'R', 1)
        cell_accounting(pdf, actual_widths[-1], 8, cumulative_total, border=1, ln=1, fill=1)

    # Final Summary (Grand Total)
    pdf.ln(2)
    pdf.set_font('Arial', 'B', 10)
    pdf.set_fill_color(6, 78, 59)
    pdf.set_text_color(255, 255, 255)
    
    label_w = sum(actual_widths[:-1])
    pdf.cell(label_w, 12, " GRAND TOTAL NILAI PERSEDIAAN GUDANG", 1, 0, 'R', 1)
    cell_accounting(pdf, actual_widths[-1], 12, cumulative_total, border=1, ln=1, fill=1)

    pdf.set_text_color(0, 0, 0)
    pdf.add_ttd(config, nama=nama_ttd, jabatan=jabatan_ttd, nama_admin=nama_admin, jabatan_admin=jabatan_admin)
    return pdf.output(dest='S').encode('latin-1')

# ====================================================================
# 4. ENGINE INVOICE PROFESIONAL (PORTRAIT)
# ====================================================================
def export_invoice_pdf(header_inv, detail_items, terbilang_teks, config, customer, nama_ttd=None, jabatan_ttd=None):
    pdf = PDF("INVOICE", "", 'P', config, use_default_header=False)
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
        pdf.cell(w_label, 12, 'SISA PIUTANG :  ', 0, 0, 'R')
        pdf.cell(w_val, 12, format_rp_pdf(header_inv.total_tagihan - uang_muka), 0, 1, 'R')
    else:
        pdf.ln(2)
        pdf.set_x(x_start)
        pdf.set_font('Arial', 'B', 20)
        pdf.set_text_color(6, 78, 59)
        pdf.cell(w_label, 12, 'TOTAL BAYAR :  ', 0, 0, 'R')
        pdf.cell(w_val, 12, format_rp_pdf(header_inv.total_tagihan), 0, 1, 'R')
    
    # Tanda Tangan (Cek sisa halaman agar tidak terpotong)
    pdf.check_page_break(50)
    pdf.ln(5)
    y_sig = pdf.get_y()
    
    # Gunakan logic dinamis untuk nama dan jabatan
    n_p = nama_ttd or (config.nama_pemilik if config else 'Yana Taryana')
    j_p = jabatan_ttd or (config.jabatan_pemilik if config else 'Direktur Operasional')
    
    _draw_qr_to_pdf(pdf, config, 20, n_p)
    pdf.set_xy(15, y_sig + 22)
    pdf.set_font('Arial', 'B', 10)
    pdf.set_text_color(180, 0, 0) # Merah sesuai screenshot
    pdf.cell(100, 6, n_p.upper(), 0, 1, 'L')
    pdf.set_font('Arial', '', 9)
    pdf.set_text_color(50, 50, 50)
    pdf.cell(100, 5, j_p, 0, 1, 'L')
    
    return pdf.output(dest='S').encode('latin-1')

# ====================================================================
# 5. ENGINE PURCHASE ORDER (PO) PROFESIONAL
# ====================================================================
def export_purchase_pdf(header_po, detail_items, terbilang_teks, config=None, nama_ttd=None, jabatan_ttd=None):
    pdf = PDF("PURCHASE ORDER", "", 'P', config, use_default_header=False)
    pdf.add_page()
    
    pdf.set_font('Arial', 'B', 20)
    pdf.set_text_color(6, 78, 59)
    pdf.cell(0, 10, config.nama_perusahaan if config else 'PRAZIQ GARMENT', 0, 1, 'L')
    
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
    
    n_p = nama_ttd or (config.nama_pemilik if config else 'Yana Taryana')
    j_p = jabatan_ttd or (config.jabatan_pemilik if config else 'Direktur Operasional')
    
    _draw_qr_to_pdf(pdf, config, 145, n_p)
    pdf.set_xy(120, y_sig + 22)
    pdf.set_font('Arial', 'B', 10)
    pdf.cell(70, 5, n_p.upper(), 0, 1, 'C')
    pdf.set_font('Arial', '', 9)
    pdf.cell(70, 5, j_p, 0, 1, 'C')
    
    return pdf.output(dest='S').encode('latin-1')

# ====================================================================
# 6. ENGINE KARTU HUTANG / PIUTANG (MITRA)
# ====================================================================
def export_kartu_mitra_pdf(judul, periode, nama_mitra, data_mutasi, running_saldo_akhir, config=None, nama_ttd=None, jabatan_ttd=None):
    pdf = PDF(judul, periode, orientation='P', config=config)
    pdf.add_page()
    
    # Header Info Mitra
    pdf.set_font('Arial', 'B', 11)
    pdf.set_text_color(6, 78, 59)
    pdf.cell(40, 7, 'Nama Mitra:', 0, 0)
    pdf.set_font('Arial', '', 11)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(100, 7, str(nama_mitra).upper(), 0, 1)
    
    pdf.ln(5)
    
    # Table Header
    pdf.set_fill_color(6, 78, 59)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font('Arial', 'B', 10)
    
    # [Tanggal, Keterangan, Debit, Kredit, Saldo]
    w_cols = [25, 75, 30, 30, 30]
    headers = ['Tanggal', 'Keterangan / No Ref', 'Debit', 'Kredit', 'Saldo']
    
    for i, h in enumerate(headers):
        pdf.cell(w_cols[i], 10, h, 1, 0, 'C', 1)
    pdf.ln()
    
    pdf.set_text_color(0, 0, 0)
    pdf.set_font('Arial', '', 9)
    
    for row in data_mutasi:
        pdf.check_page_break(8)
        
        tgl = row.get('tanggal', '')
        ket = row.get('keterangan', '')
        debit = row.get('debit', 0)
        kredit = row.get('kredit', 0)
        saldo = row.get('saldo', 0)
        
        pdf.cell(w_cols[0], 7, str(tgl)[:10], 1, 0, 'C')
        
        # Truncate ket if too long
        display_ket = str(ket)
        if len(display_ket) > 40: display_ket = display_ket[:37] + "..."
        pdf.cell(w_cols[1], 7, f" {display_ket}", 1, 0, 'L')
        
        pdf.cell(w_cols[2], 7, format_rp_pdf(debit) if debit else '-', 1, 0, 'R')
        pdf.cell(w_cols[3], 7, format_rp_pdf(kredit) if kredit else '-', 1, 0, 'R')
        
        pdf.set_font('Arial', 'B', 9)
        pdf.cell(w_cols[4], 7, format_rp_pdf(saldo), 1, 1, 'R')
        pdf.set_font('Arial', '', 9)

    # Summary Line
    pdf.ln(2)
    pdf.set_font('Arial', 'B', 10)
    pdf.set_fill_color(240, 240, 240)
    pdf.cell(sum(w_cols[:4]), 10, ' SALDO AKHIR SAAT INI', 1, 0, 'R', 1)
    
    # Warna Saldo (Merah jika positif untuk hutang/piutang tertentu)
    pdf.set_text_color(180, 0, 0) if running_saldo_akhir != 0 else pdf.set_text_color(0, 0, 0)
    pdf.cell(w_cols[4], 10, format_rp_pdf(running_saldo_akhir), 1, 1, 'R', 1)
    
    pdf.set_text_color(0, 0, 0)
    pdf.add_ttd(config, nama=nama_ttd, jabatan=jabatan_ttd)
    return pdf.output(dest='S').encode('latin-1')

def _draw_qr_to_pdf(pdf, config, x_pos, nama_p="Yana Taryana"):
    try:
        import requests, tempfile
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

def export_buku_besar_massal_pdf(data_per_akun, periode, config=None, nama_ttd=None, jabatan_ttd=None, nama_admin=None, jabatan_admin=None):
    """
    data_per_akun: List of dict { "nama_akun": str, "kode_akun": str, "rows": list }
    """
    pdf = PDF("BUKU BESAR LENGKAP", periode, orientation='P', config=config)
    pdf.set_auto_page_break(auto=True, margin=15)
    
    col_widths = [25, 75, 30, 30, 30] # Tgl, Keterangan, Debit, Kredit, Saldo
    actual_widths = [(w / sum(col_widths)) * 190 for w in col_widths]
    headers = ["Tanggal", "Keterangan", "Debit", "Kredit", "Saldo"]

    for item in data_per_akun:
        pdf.add_page()
        
        # Subheader Akun
        pdf.set_font('Arial', 'B', 12)
        pdf.set_text_color(6, 78, 59)
        pdf.cell(0, 10, f"AKUN: {item['nama_akun']} ({item['kode_akun']})", 0, 1, 'L')
        pdf.ln(2)
        
        # Header Tabel
        pdf.set_font('Arial', 'B', 9)
        pdf.set_fill_color(6, 78, 59)
        pdf.set_text_color(255, 255, 255)
        for i, h in enumerate(headers):
            pdf.cell(actual_widths[i], 8, h, 1, 0, 'C', 1)
        pdf.ln()
        
        # Rows
        pdf.set_font('Arial', '', 8)
        pdf.set_text_color(0, 0, 0)
        
        def fmt(v):
            if not v or v == 0: return "-"
            try:
                return f"{int(v):,}".replace(",", ".")
            except:
                return str(v)

        for row in item['rows']:
            # Cek ganti halaman
            if pdf.get_y() > 260:
                pdf.add_page()
                # Re-print Header
                pdf.set_font('Arial', 'B', 9)
                pdf.set_fill_color(6, 78, 59)
                pdf.set_text_color(255, 255, 255)
                for i, h in enumerate(headers):
                    pdf.cell(actual_widths[i], 8, h, 1, 0, 'C', 1)
                pdf.ln()
                pdf.set_font('Arial', '', 8)
                pdf.set_text_color(0, 0, 0)

            pdf.cell(actual_widths[0], 7, row['tanggal'][:10], 1, 0, 'C')
            pdf.cell(actual_widths[1], 7, (row['keterangan'][:45] + '..') if len(row['keterangan']) > 45 else row['keterangan'], 1, 0, 'L')
            pdf.cell(actual_widths[2], 7, fmt(row['debit']), 1, 0, 'R')
            pdf.cell(actual_widths[3], 7, fmt(row['kredit']), 1, 0, 'R')
            pdf.cell(actual_widths[4], 7, fmt(row['saldo']), 1, 1, 'R')
            
    pdf.set_text_color(0, 0, 0)
    pdf.add_ttd(config, nama=nama_ttd, jabatan=jabatan_ttd, nama_admin=nama_admin, jabatan_admin=jabatan_admin)
    return pdf.output(dest='S').encode('latin-1')

def export_rekap_penjualan_bulanan_pdf(judul, periode, daily_rows, client_rows, grand_totals, config=None, nama_ttd=None, jabatan_ttd=None, nama_admin=None, jabatan_admin=None):
    """
    daily_rows: List of [Tgl, Jml Inv, Bruto, Diskon, Netto]
    client_rows: List of [Nama Client, Bruto, Diskon, Retur, Netto, Sisa Piutang]
    grand_totals: Dict { "bruto": 0, "diskon": 0, "retur": 0, "netto": 0, "piutang": 0 }
    """
    pdf = PDF(judul, periode, orientation='L', config=config)
    
    # ─── TABEL 1: RINGKASAN HARIAN ────────────────────────────────
    pdf.add_page()
    pdf.set_font('Arial', 'B', 12)
    pdf.set_text_color(6, 78, 59)
    pdf.cell(0, 10, "1. RINGKASAN PENJUALAN HARIAN", 0, 1, 'L')
    pdf.ln(2)
    
    h1 = ["TANGGAL", "JML INV", "PENJUALAN BRUTO", "POTONGAN/DISKON", "PENJUALAN NETTO"]
    w1 = [40, 30, 50, 50, 50]
    
    pdf.set_font('Arial', 'B', 9)
    pdf.set_fill_color(6, 78, 59)
    pdf.set_text_color(255, 255, 255)
    for i, h in enumerate(h1):
        pdf.cell(w1[i], 10, h, 1, 0, 'C', 1)
    pdf.ln()
    
    pdf.set_font('Arial', '', 9)
    pdf.set_text_color(0, 0, 0)
    
    # Init Totals for Table 1
    t1_inv = 0
    t1_bruto = 0
    t1_diskon = 0
    t1_netto = 0
    
    for r in daily_rows:
        pdf.check_page_break(8)
        pdf.cell(w1[0], 8, str(r[0]), 1, 0, 'C')
        pdf.cell(w1[1], 8, str(r[1]), 1, 0, 'C')
        pdf.cell(w1[2], 8, format_rp_pdf(r[2]), 1, 0, 'R')
        pdf.cell(w1[3], 8, format_rp_pdf(r[3]), 1, 0, 'R')
        pdf.set_font('Arial', 'B', 9)
        pdf.cell(w1[4], 8, format_rp_pdf(r[4]), 1, 1, 'R')
        pdf.set_font('Arial', '', 9)
        
        t1_inv += r[1]
        t1_bruto += r[2]
        t1_diskon += r[3]
        t1_netto += r[4]

    # Baris TOTAL Tabel 1
    pdf.set_fill_color(240, 250, 245)
    pdf.set_font('Arial', 'B', 9)
    pdf.cell(w1[0], 10, " TOTAL BULAN INI", 1, 0, 'L', 1)
    pdf.cell(w1[1], 10, str(t1_inv), 1, 0, 'C', 1)
    pdf.cell(w1[2], 10, format_rp_pdf(t1_bruto), 1, 0, 'R', 1)
    pdf.cell(w1[3], 10, format_rp_pdf(t1_diskon), 1, 0, 'R', 1)
    pdf.cell(w1[4], 10, format_rp_pdf(t1_netto), 1, 1, 'R', 1)
    pdf.set_text_color(0, 0, 0)

    # ─── TABEL 2: REKAPITULASI PER CLIENT ──────────────────────────
    pdf.add_page()
    pdf.set_font('Arial', 'B', 12)
    pdf.set_text_color(6, 78, 59)
    pdf.cell(0, 10, "2. REKAPITULASI PENJUALAN PER CLIENT", 0, 1, 'L')
    pdf.ln(2)
    
    h2 = ["NAMA CLIENT", "BRUTO", "DISKON", "RETUR", "NETTO", "SISA PIUTANG"]
    w2 = [80, 40, 35, 35, 40, 40]
    
    pdf.set_font('Arial', 'B', 9)
    pdf.set_fill_color(6, 78, 59)
    pdf.set_text_color(255, 255, 255)
    for i, h in enumerate(h2):
        pdf.cell(w2[i], 10, h, 1, 0, 'C', 1)
    pdf.ln()
    
    pdf.set_font('Arial', '', 9)
    pdf.set_text_color(0, 0, 0)
    for r in client_rows:
        pdf.check_page_break(8)
        # Handle long names
        name = str(r[0])
        if len(name) > 35: name = name[:32] + "..."
        
        pdf.cell(w2[0], 8, f" {name}", 1, 0, 'L')
        pdf.cell(w2[1], 8, format_rp_pdf(r[1]), 1, 0, 'R')
        pdf.cell(w2[2], 8, format_rp_pdf(r[2]), 1, 0, 'R')
        pdf.cell(w2[3], 8, format_rp_pdf(r[3]), 1, 0, 'R')
        pdf.set_font('Arial', 'B', 9)
        pdf.cell(w2[4], 8, format_rp_pdf(r[4]), 1, 0, 'R')
        pdf.set_text_color(180, 0, 0) if r[5] > 0 else pdf.set_text_color(0, 0, 0)
        pdf.cell(w2[5], 8, format_rp_pdf(r[5]), 1, 1, 'R')
        pdf.set_text_color(0, 0, 0)
        pdf.set_font('Arial', '', 9)

    # ─── GRAND TOTAL SECTION ─────────────────────────────────────
    pdf.ln(5)
    pdf.set_fill_color(240, 250, 245)
    pdf.set_font('Arial', 'B', 10)
    pdf.cell(w2[0], 12, " GRAND TOTAL KESELURUHAN", 1, 0, 'L', 1)
    pdf.cell(w2[1], 12, format_rp_pdf(grand_totals['bruto']), 1, 0, 'R', 1)
    pdf.cell(w2[2], 12, format_rp_pdf(grand_totals['diskon']), 1, 0, 'R', 1)
    pdf.cell(w2[3], 12, format_rp_pdf(grand_totals['retur']), 1, 0, 'R', 1)
    pdf.set_text_color(6, 78, 59)
    pdf.cell(w2[4], 12, format_rp_pdf(grand_totals['netto']), 1, 0, 'R', 1)
    pdf.set_text_color(180, 0, 0)
    pdf.cell(w2[5], 12, format_rp_pdf(grand_totals['piutang']), 1, 1, 'R', 1)
    
    pdf.set_text_color(0, 0, 0)
    pdf.add_ttd(config, nama=nama_ttd, jabatan=jabatan_ttd, nama_admin=nama_admin, jabatan_admin=jabatan_admin)
    return pdf.output(dest='S').encode('latin-1')

def export_rekap_pembelian_bulanan_pdf(judul, periode, daily_rows, supplier_rows, grand_totals, config=None, nama_ttd=None, jabatan_ttd=None, nama_admin=None, jabatan_admin=None):
    """
    daily_rows: List of [Tgl, Jml PO, Bruto, Diskon, Netto]
    supplier_rows: List of [Nama Supplier, Bruto, Diskon, Netto, Sisa Hutang]
    grand_totals: Dict { "bruto": 0, "diskon": 0, "netto": 0, "hutang": 0 }
    """
    pdf = PDF(judul, periode, orientation='L', config=config)
    
    # ─── TABEL 1: RINGKASAN PEMBELIAN HARIAN ──────────────────────
    pdf.add_page()
    pdf.set_font('Arial', 'B', 12)
    pdf.set_text_color(6, 78, 59)
    pdf.cell(0, 10, "1. RINGKASAN PEMBELIAN HARIAN", 0, 1, 'L')
    pdf.ln(2)
    
    h1 = ["TANGGAL", "JML PO", "PEMBELIAN BRUTO", "POTONGAN/DISKON", "PEMBELIAN NETTO"]
    w1 = [40, 30, 50, 50, 50]
    
    pdf.set_font('Arial', 'B', 9)
    pdf.set_fill_color(6, 78, 59)
    pdf.set_text_color(255, 255, 255)
    for i, h in enumerate(h1):
        pdf.cell(w1[i], 10, h, 1, 0, 'C', 1)
    pdf.ln()
    
    pdf.set_font('Arial', '', 9)
    pdf.set_text_color(0, 0, 0)
    t1_po = 0; t1_bruto = 0; t1_diskon = 0; t1_netto = 0
    
    for r in daily_rows:
        pdf.check_page_break(8)
        pdf.cell(w1[0], 8, str(r[0]), 1, 0, 'C')
        pdf.cell(w1[1], 8, str(r[1]), 1, 0, 'C')
        pdf.cell(w1[2], 8, format_rp_pdf(r[2]), 1, 0, 'R')
        pdf.cell(w1[3], 8, format_rp_pdf(r[3]), 1, 0, 'R')
        pdf.set_font('Arial', 'B', 9)
        pdf.cell(w1[4], 8, format_rp_pdf(r[4]), 1, 1, 'R')
        pdf.set_font('Arial', '', 9)
        t1_po += r[1]; t1_bruto += r[2]; t1_diskon += r[3]; t1_netto += r[4]

    # Total Row Table 1
    pdf.set_fill_color(240, 250, 245); pdf.set_font('Arial', 'B', 9)
    pdf.cell(w1[0], 10, " TOTAL PEMBELIAN", 1, 0, 'L', 1)
    pdf.cell(w1[1], 10, str(t1_po), 1, 0, 'C', 1)
    pdf.cell(w1[2], 10, format_rp_pdf(t1_bruto), 1, 0, 'R', 1)
    pdf.cell(w1[3], 10, format_rp_pdf(t1_diskon), 1, 0, 'R', 1)
    pdf.cell(w1[4], 10, format_rp_pdf(t1_netto), 1, 1, 'R', 1)

    # ─── TABEL 2: REKAPITULASI PER SUPPLIER ───────────────────────
    pdf.add_page()
    pdf.set_font('Arial', 'B', 12)
    pdf.set_text_color(6, 78, 59)
    pdf.cell(0, 10, "2. REKAPITULASI PEMBELIAN PER SUPPLIER", 0, 1, 'L')
    pdf.ln(2)
    
    h2 = ["NAMA SUPPLIER", "BRUTO", "DISKON", "NETTO", "SISA HUTANG"]
    w2 = [90, 45, 45, 45, 45]
    
    pdf.set_font('Arial', 'B', 9)
    pdf.set_fill_color(6, 78, 59)
    pdf.set_text_color(255, 255, 255)
    for i, h in enumerate(h2):
        pdf.cell(w2[i], 10, h, 1, 0, 'C', 1)
    pdf.ln()
    
    pdf.set_font('Arial', '', 9)
    pdf.set_text_color(0, 0, 0)
    for r in supplier_rows:
        pdf.check_page_break(8)
        name = str(r[0]); name = (name[:35] + "...") if len(name) > 35 else name
        pdf.cell(w2[0], 8, f" {name}", 1, 0, 'L')
        pdf.cell(w2[1], 8, format_rp_pdf(r[1]), 1, 0, 'R')
        pdf.cell(w2[2], 8, format_rp_pdf(r[2]), 1, 0, 'R')
        pdf.set_font('Arial', 'B', 9)
        pdf.cell(w2[3], 8, format_rp_pdf(r[3]), 1, 0, 'R')
        pdf.set_text_color(180, 0, 0) if r[4] > 0 else pdf.set_text_color(0, 0, 0)
        pdf.cell(w2[4], 8, format_rp_pdf(r[4]), 1, 1, 'R')
        pdf.set_text_color(0, 0, 0); pdf.set_font('Arial', '', 9)

    # GRAND TOTAL
    pdf.ln(5); pdf.set_fill_color(240, 250, 245); pdf.set_font('Arial', 'B', 10)
    pdf.cell(w2[0], 12, " GRAND TOTAL PEMBELIAN", 1, 0, 'L', 1)
    pdf.cell(w2[1], 12, format_rp_pdf(grand_totals['bruto']), 1, 0, 'R', 1)
    pdf.cell(w2[2], 12, format_rp_pdf(grand_totals['diskon']), 1, 0, 'R', 1)
    pdf.set_text_color(6, 78, 59)
    pdf.cell(w2[3], 12, format_rp_pdf(grand_totals['netto']), 1, 0, 'R', 1)
    pdf.set_text_color(180, 0, 0)
    pdf.cell(w2[4], 12, format_rp_pdf(grand_totals['hutang']), 1, 1, 'R', 1)
    
    pdf.set_text_color(0, 0, 0)
    pdf.add_ttd(config, nama=nama_ttd, jabatan=jabatan_ttd, nama_admin=nama_admin, jabatan_admin=jabatan_admin)
    return pdf.output(dest='S').encode('latin-1')

def export_rekap_produksi_bulanan_pdf(judul, periode, daily_rows, sku_rows, grand_totals, config=None, nama_ttd=None, jabatan_ttd=None, nama_admin=None, jabatan_admin=None):
    """
    daily_rows: List of [Tgl, Total Cutting (pcs), Total Jahit (pcs)]
    sku_rows: List of [SKU, Nama Barang, Total Cutting, Total Jahit]
    grand_totals: Dict { "cutting": 0, "jahit": 0 }
    """
    pdf = PDF(judul, periode, orientation='P', config=config)
    
    # ─── TABEL 1: RINGKASAN PRODUKSI HARIAN ───────────────────────
    pdf.add_page()
    pdf.set_font('Arial', 'B', 12)
    pdf.set_text_color(6, 78, 59)
    pdf.cell(0, 10, "1. RINGKASAN OUTPUT PRODUKSI HARIAN", 0, 1, 'L')
    pdf.ln(2)
    
    h1 = ["TANGGAL", "OUTPUT CUTTING (PCS)", "OUTPUT JAHIT (PCS)"]
    w1 = [60, 65, 65]
    
    pdf.set_font('Arial', 'B', 10)
    pdf.set_fill_color(6, 78, 59)
    pdf.set_text_color(255, 255, 255)
    for i, h in enumerate(h1):
        pdf.cell(w1[i], 10, h, 1, 0, 'C', 1)
    pdf.ln()
    
    pdf.set_font('Arial', '', 10)
    pdf.set_text_color(0, 0, 0)
    for r in daily_rows:
        pdf.check_page_break(8)
        pdf.cell(w1[0], 8, str(r[0]), 1, 0, 'C')
        pdf.cell(w1[1], 8, f"{int(r[1]):,} Pcs".replace(',', '.'), 1, 0, 'C')
        pdf.cell(w1[2], 8, f"{int(r[2]):,} Pcs".replace(',', '.'), 1, 1, 'C')

    # Total Row Table 1
    pdf.set_fill_color(240, 250, 245); pdf.set_font('Arial', 'B', 10)
    pdf.cell(w1[0], 10, " TOTAL PRODUKSI", 1, 0, 'L', 1)
    pdf.cell(w1[1], 10, f"{int(grand_totals['cutting']):,} Pcs".replace(',', '.'), 1, 0, 'C', 1)
    pdf.cell(w1[2], 10, f"{int(grand_totals['jahit']):,} Pcs".replace(',', '.'), 1, 1, 'C', 1)

    # ─── TABEL 2: REKAPITULASI PER MODEL / SKU ────────────────────
    pdf.add_page()
    pdf.set_font('Arial', 'B', 12)
    pdf.set_text_color(6, 78, 59)
    pdf.cell(0, 10, "2. REKAPITULASI PRODUKSI PER MODEL (SKU)", 0, 1, 'L')
    pdf.ln(2)
    
    h2 = ["KODE SKU", "NAMA BARANG", "CUTTING (PCS)", "JAHIT (PCS)"]
    w2 = [40, 90, 30, 30]
    
    pdf.set_font('Arial', 'B', 9)
    pdf.set_fill_color(6, 78, 59)
    pdf.set_text_color(255, 255, 255)
    for i, h in enumerate(h2):
        pdf.cell(w2[i], 10, h, 1, 0, 'C', 1)
    pdf.ln()
    
    pdf.set_font('Arial', '', 9)
    pdf.set_text_color(0, 0, 0)
    for r in sku_rows:
        pdf.check_page_break(8)
        pdf.cell(w2[0], 8, f" {r[0]}", 1, 0, 'L')
        name = str(r[1]); name = (name[:38] + "...") if len(name) > 38 else name
        pdf.cell(w2[1], 8, f" {name}", 1, 0, 'L')
        pdf.cell(w2[2], 8, f"{int(r[2]):,} Pcs".replace(',', '.'), 1, 0, 'C')
        pdf.cell(w2[3], 8, f"{int(r[3]):,} Pcs".replace(',', '.'), 1, 1, 'C')

    pdf.add_ttd(config, nama=nama_ttd, jabatan=jabatan_ttd, nama_admin=nama_admin, jabatan_admin=jabatan_admin)
    return pdf.output(dest='S').encode('latin-1')
