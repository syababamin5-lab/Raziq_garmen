import datetime
import base64
import io
import os
from fpdf import FPDF

class PDF(FPDF):
    def __init__(self, judul_laporan, periode="", orientation='P'):
        # Membuka opsi kertas Portrait ('P') atau Landscape ('L')
        super().__init__(orientation=orientation, unit='mm', format='A4')
        self.judul_laporan = judul_laporan
        self.periode = periode
        self.headers_data = None # Memori untuk menyimpan Print Titles (Header Tabel)
        self.logo_base64 = None # Data logo Base64

    def header(self):
        # 1. Logo Perusahaan (Jika ada)
        if hasattr(self, 'logo_base64') and self.logo_base64:
            try:
                # Bersihkan header data:image/png;base64,
                if "," in self.logo_base64:
                    header, encoded = self.logo_base64.split(",", 1)
                else:
                    encoded = self.logo_base64
                
                img_data = base64.b64decode(encoded)
                img_file = io.BytesIO(img_data)
                # Tampilkan logo di kiri atas
                self.image(img_file, 10, 8, 25) # x=10, y=8, w=25
                self.set_x(40) # Geser teks ke kanan logo
            except Exception as e:
                print(f"Error printing logo: {e}")
                self.set_x(10)
        else:
            self.set_x(10)

        # 2. Nama Perusahaan
        self.set_font('Arial', 'B', 15)
        self.cell(0, 8, 'ANSA - ERP (RAZIQ GARMENT)', 0, 1, 'L')
        
        # Judul Laporan & Periode
        self.set_font('Arial', 'B', 12)
        self.cell(0, 6, self.judul_laporan, 0, 1, 'C')
        if self.periode:
            self.set_font('Arial', 'I', 10)
            self.cell(0, 6, f'Periode: {self.periode}', 0, 1, 'C')
            
        # Tanggal Cetak
        tgl_cetak = datetime.datetime.now().strftime("%d-%m-%Y %H:%M")
        self.set_font('Arial', '', 9)
        self.cell(0, 6, f'Dicetak pada: {tgl_cetak}', 0, 1, 'R')
        
        # Garis Pembatas (Lebarnya dinamis menyesuaikan P/L)
        self.line(10, self.get_y(), self.w - 10, self.get_y())
        self.ln(5)

        # === FITUR PRINT TITLES BERULANG DI SETIAP HALAMAN ===
        if self.headers_data:
            self.set_fill_color(200, 220, 255)
            self.set_font('Arial', 'B', 10)
            for width, col_name, align in self.headers_data:
                self.cell(width, 8, col_name, 1, 0, align, 1)
            self.ln()

    def footer(self):
        # Nomor Halaman di bawah
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Halaman {self.page_no()}', 0, 0, 'C')

    def check_page_break(self, height):
        # Deteksi batas bawah (Kertas P tingginya 297mm, Kertas L tingginya 210mm)
        page_height = 297 if self.cur_orientation == 'P' else 210
        if self.get_y() + height > page_height - 20: # Sisa margin bawah 20mm
            self.add_page() # Otomatis mencetak ulang header() dan Print Titles!

    def add_ttd(self, nama="Yana Taryana", jabatan="Direktur Operasional"):
        self.check_page_break(40)
        self.ln(10)
        self.set_font('Arial', '', 10)
        self.cell(self.w / 2 - 10, 5, '', 0, 0)
        self.cell(60, 5, 'Mengetahui,', 0, 1, 'C')
        self.ln(20)
        self.cell(self.w / 2 - 10, 5, '', 0, 0)
        self.set_font('Arial', 'BU', 10)
        self.cell(60, 5, f'{nama}', 0, 1, 'C')
        self.set_font('Arial', '', 9)
        self.cell(self.w / 2 - 10, 5, '', 0, 0)
        self.cell(60, 5, f'{jabatan}', 0, 1, 'C')

    def add_dual_signature(self, nama_admin="Admin Keuangan", jabatan_admin="Administrasi", nama_pimpinan="Yana Taryana", jabatan_pimpinan="Owner", ttd_base64=None):
        """Menambahkan dua tanda tangan (Admin & Pimpinan) secara berdampingan"""
        self.check_page_break(50)
        self.ln(10)
        y_ttd = self.get_y()
        
        # Kolom 1: Pembuat Laporan (Admin)
        self.set_font('Arial', '', 10)
        self.set_x(10)
        self.cell(60, 5, 'Dibuat Oleh,', 0, 1, 'C')
        self.ln(20)
        self.set_font('Arial', 'BU', 10)
        self.cell(60, 5, nama_admin, 0, 1, 'C')
        self.set_font('Arial', '', 9)
        self.cell(60, 5, jabatan_admin, 0, 1, 'C')
        
        # Kolom 2: Mengetahui (Pimpinan)
        self.set_y(y_ttd)
        self.set_x(self.w - 70)
        self.set_font('Arial', '', 10)
        self.cell(60, 5, 'Mengetahui,', 0, 1, 'C')
        
        # Jika ada gambar TTD Base64 Pimpinan
        if ttd_base64:
            try:
                if "," in ttd_base64:
                    header, encoded = ttd_base64.split(",", 1)
                else:
                    encoded = ttd_base64
                img_data = base64.b64decode(encoded)
                img_file = io.BytesIO(img_data)
                self.image(img_file, self.w - 60, y_ttd + 5, 40)
                self.ln(20)
            except:
                self.ln(20)
        else:
            self.ln(20)
            
        self.set_x(self.w - 70)
        self.set_font('Arial', 'BU', 10)
        self.cell(60, 5, nama_pimpinan, 0, 1, 'C')
        self.set_font('Arial', '', 9)
        self.cell(60, 5, jabatan_pimpinan, 0, 1, 'C')

def format_rp_pdf(angka):
    if angka < 0: return f"(Rp {abs(angka):,.0f})".replace(',', '.')
    return f"Rp {angka:,.0f}".replace(',', '.')

# ====================================================================
# 1. ENGINE LAPORAN 2 KOLOM (Tetap Portrait)
# ====================================================================
def export_laporan_2kolom_pdf(judul, periode, data_list, label_total, val_total, config=None, nama_ttd="Yana Taryana", jabatan_ttd="Direktur Operasional", nama_admin="Admin Keuangan", jabatan_admin="Administrasi"):
    pdf = PDF(judul, periode, orientation='P')
    if config:
        pdf.logo_base64 = config.logo_base64
    
    # Daftarkan Print Title
    pdf.headers_data = [
        (130, 'Keterangan', 'C'),
        (60, 'Nominal', 'C')
    ]
    
    pdf.add_page() # Cetak halaman pertama
    
    for ket, nominal, is_header in data_list:
        pdf.check_page_break(8)
        if is_header:
            pdf.set_font('Arial', 'B', 10)
            pdf.set_fill_color(240, 240, 240)
            pdf.cell(130, 7, ket, 1, 0, 'L', 1)
            pdf.cell(60, 7, format_rp_pdf(nominal) if nominal is not None else '', 1, 1, 'R', 1)
        else:
            pdf.set_font('Arial', '', 10)
            pdf.cell(130, 7, f"   {ket}", 1, 0, 'L')
            pdf.cell(60, 7, format_rp_pdf(nominal), 1, 1, 'R')

    pdf.ln(2)
    pdf.set_fill_color(200, 255, 200)
    pdf.set_font('Arial', 'B', 11)
    pdf.cell(130, 10, label_total, 1, 0, 'R', 1)
    pdf.cell(60, 10, format_rp_pdf(val_total), 1, 1, 'R', 1)

    # Gunakan Dual Signature (Admin & Pimpinan)
    pdf.add_dual_signature(
        nama_admin=nama_admin, 
        jabatan_admin=jabatan_admin, 
        nama_pimpinan=nama_ttd, 
        jabatan_pimpinan=jabatan_ttd,
        ttd_base64=config.ttd_base64 if config else None
    )
    return pdf.output(dest='S').encode('latin-1')

# ====================================================================
# 2. ENGINE TABEL PANJANG (Diubah ke LANDSCAPE & KOLOM MELEBAR)
# ====================================================================
def export_dataframe_pdf(judul, periode, df, col_widths, config=None, nama_ttd="Yana Taryana", jabatan_ttd="Direktur Operasional", nama_admin="Admin Keuangan", jabatan_admin="Administrasi"):
    # Kertas dimiringkan menjadi Landscape (Lebar area bisa dipakai: 277mm)
    pdf = PDF(judul, periode, orientation='L')
    if config:
        pdf.logo_base64 = config.logo_base64
    
    # Menghitung ulang rasio lebar kolom agar melar memenuhi full 277mm
    total_w = sum(col_widths)
    usable_width = 277 
    actual_widths = [(w / total_w) * usable_width for w in col_widths]
    
    cols = df.columns.tolist()
    
    # Daftarkan Print Title Dinamis sesuai nama kolom
    headers_data = []
    for i, col in enumerate(cols):
        # Membersihkan header dari emoji/karakter aneh
        clean_col = str(col).encode('latin-1', 'replace').decode('latin-1')
        headers_data.append((actual_widths[i], clean_col, 'C'))
    pdf.headers_data = headers_data
    
    pdf.add_page() # Cetak halaman pertama beserta tabel header
    
    pdf.set_font('Arial', '', 9)
    for _, row in df.iterrows():
        pdf.check_page_break(7)
        for i, col in enumerate(cols):
            text = str(row[col])
            
            # FITUR KEAMANAN 1: Bersihkan teks dari emoji agar FPDF tidak Crash
            text = text.encode('latin-1', 'replace').decode('latin-1')
            
            align = 'R' if any(x in text for x in ['Rp', 'Pcs', 'LS']) or any(x in col for x in ['Debit', 'Kredit', 'Saldo', 'Harga']) else 'L'
            
            # FITUR KEAMANAN 2: Pemotongan (Truncate) Teks Secara Dinamis
            # Rata-rata 1 huruf Arial ukuran 9 memakan lebar sekitar 1.8mm - 2mm
            # Kita batasi maksimal karakter berdasarkan lebar aktual sel tersebut
            max_chars = int(actual_widths[i] / 1.9)
            if len(text) > max_chars: 
                # Potong teks dan tambahkan titik tiga (...) jika terlalu panjang
                text = text[:max_chars - 3] + "..."
            
            pdf.cell(actual_widths[i], 7, text, 1, 0, align)
        pdf.ln()

    # Tambahkan Footer Tanda Tangan Ganda
    pdf.add_dual_signature(
        nama_admin=nama_admin, 
        jabatan_admin=jabatan_admin, 
        nama_pimpinan=nama_ttd, 
        jabatan_pimpinan=jabatan_ttd,
        ttd_base64=config.ttd_base64 if config else None
    )
    return pdf.output(dest='S').encode('latin-1')
# ====================================================================
# 3. ENGINE INVOICE PROFESIONAL (MIRIP REFERENSI MINEARTH)
# ====================================================================
def export_invoice_pdf(header_inv, detail_items, terbilang_teks, config=None, nama_ttd="Yana Taryana", jabatan_ttd="Direktur Operasional", nama_admin="Admin Keuangan", jabatan_admin="Administrasi"):
    pdf = PDF("INVOICE PENJUALAN", orientation='P')
    if config:
        pdf.logo_base64 = config.logo_base64
    pdf.add_page()
    
    # Header Invoice (Logo & Nama) sudah dihandle oleh class PDF
    
    pdf.set_font('Arial', '', 10)
    pdf.set_text_color(50, 50, 50)
    pdf.cell(0, 5, 'Pusat Produksi Konveksi & Garment Berkualitas', 0, 1, 'L')
    pdf.cell(0, 5, 'Bandung - Jawa Barat', 0, 1, 'L')
    pdf.cell(0, 5, 'No. Tlp : 0812-1491-4641 - Kode Pos 40237', 0, 1, 'L')
    pdf.set_line_width(0.2)
    pdf.line(10, 40, 200, 40) # Garis Pembatas
    pdf.set_line_width(0.8)
    pdf.line(10, 41, 200, 41) # Garis Pembatas
    
    pdf.ln(5)
    pdf.set_line_width(0.2)    
    # JUDUL INVOICE
    pdf.set_font('Arial', 'BU', 16)
    pdf.set_text_color(41, 128, 185)
    pdf.cell(0, 10, 'INVOICE', 0, 1, 'C')
    pdf.set_font('Arial', '', 10)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 5, f'No: {header_inv.no_invoice}', 0, 1, 'C')
    
    pdf.ln(5)
    
    # KOTAK INFO CUSTOMER & TANGGAL
    # Posisi Kiri (Customer)
    pdf.set_font('Arial', '', 10)
    pdf.cell(25, 6, 'Tagihan Ke:', 0, 0)
    pdf.set_font('Arial', 'B', 10)
    pdf.cell(85, 6, str(header_inv.nama_customer).upper(), 0, 0)
    
    # Posisi Kanan (Tanggal)
    pdf.set_font('Arial', '', 10)
    pdf.cell(30, 6, 'Tanggal Invoice', 0, 0)
    pdf.cell(5, 6, ':', 0, 0)
    tgl_str = header_inv.tanggal.strftime('%d %b %Y') if hasattr(header_inv.tanggal, 'strftime') else str(header_inv.tanggal)
    pdf.cell(40, 6, tgl_str, 0, 1)
    
    pdf.cell(110, 6, '', 0, 0) # Spacer
    pdf.cell(30, 6, 'Metode Bayar', 0, 0)
    pdf.cell(5, 6, ':', 0, 0)
    pdf.cell(40, 6, header_inv.metode_bayar, 0, 1)
    
    pdf.ln(5)
    
    # HEADER TABEL
    pdf.set_fill_color(41, 128, 185) # Header Biru
    pdf.set_text_color(255, 255, 255)
    pdf.set_font('Arial', 'B', 10)
    pdf.cell(10, 8, 'No', 1, 0, 'C', 1)
    pdf.cell(85, 8, 'Nama Barang / Model', 1, 0, 'C', 1)
    pdf.cell(25, 8, 'Qty (Lusin)', 1, 0, 'C', 1)
    pdf.cell(35, 8, 'Harga Satuan', 1, 0, 'C', 1)
    pdf.cell(35, 8, 'Subtotal', 1, 1, 'C', 1)
    
    # ISI TABEL
    pdf.set_text_color(0, 0, 0)
    pdf.set_font('Arial', '', 10)
    
    for i, row in enumerate(detail_items):
        nama = str(row.nama_barang).encode('latin-1', 'replace').decode('latin-1')
        if len(nama) > 40: nama = nama[:37] + "..."
        
        pdf.cell(10, 8, str(i+1), 1, 0, 'C')
        pdf.cell(85, 8, f" {nama}", 1, 0, 'L')
        pdf.cell(25, 8, f"{row.qty_lusin:g}", 1, 0, 'C')
        pdf.cell(35, 8, format_rp_pdf(row.harga_per_lusin), 1, 0, 'R')
        pdf.cell(35, 8, format_rp_pdf(row.subtotal), 1, 1, 'R')
    
    # TOTALAN
    pdf.set_font('Arial', 'B', 10)
    total_sebelum = sum(r.subtotal for r in detail_items)
    uang_muka = getattr(header_inv, 'uang_muka', 0.0) or 0.0
    sisa_piutang = header_inv.total_tagihan - uang_muka
    is_tempo = header_inv.metode_bayar == "Piutang (Tempo)"

    pdf.cell(120, 8, '', 0, 0) # Kosong di kiri
    pdf.cell(35, 8, 'Subtotal', 1, 0, 'R')
    pdf.cell(35, 8, format_rp_pdf(total_sebelum), 1, 1, 'R')

    if header_inv.diskon > 0:
        pdf.cell(120, 8, '', 0, 0)
        pdf.cell(35, 8, 'Diskon', 1, 0, 'R')
        pdf.cell(35, 8, f"- {format_rp_pdf(header_inv.diskon)}", 1, 1, 'R')

    # Baris Total Tagihan (setelah diskon, sebelum DP)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(120, 8, '', 0, 0)
    pdf.cell(35, 8, 'Total Tagihan', 1, 0, 'R')
    pdf.cell(35, 8, format_rp_pdf(header_inv.total_tagihan), 1, 1, 'R')

    # Baris Uang Muka / DP (jika ada)
    if uang_muka > 0:
        pdf.set_text_color(80, 80, 80)
        pdf.cell(120, 8, '', 0, 0)
        pdf.cell(35, 8, 'Uang Muka (DP)', 1, 0, 'R')
        pdf.cell(35, 8, f"- {format_rp_pdf(uang_muka)}", 1, 1, 'R')

    # Baris utama berwarna: Sisa Piutang (Tempo) / Total Tagihan (Tunai)
    pdf.set_fill_color(41, 128, 185)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(120, 8, '', 0, 0)
    if is_tempo and uang_muka > 0:
        pdf.cell(35, 8, 'SISA PIUTANG', 1, 0, 'R', 1)
        pdf.cell(35, 8, format_rp_pdf(sisa_piutang), 1, 1, 'R', 1)
    elif is_tempo:
        pdf.cell(35, 8, 'TOTAL PIUTANG', 1, 0, 'R', 1)
        pdf.cell(35, 8, format_rp_pdf(header_inv.total_tagihan), 1, 1, 'R', 1)
    else:
        pdf.cell(35, 8, 'TOTAL TAGIHAN', 1, 0, 'R', 1)
        pdf.cell(35, 8, format_rp_pdf(header_inv.total_tagihan), 1, 1, 'R', 1)

    pdf.ln(5)

    # KOTAK TERBILANG
    pdf.set_text_color(0, 0, 0)
    pdf.set_font('Arial', 'I', 10)
    pdf.set_fill_color(240, 240, 240)
    pdf.multi_cell(120, 8, f"Terbilang: \n{terbilang_teks} Rupiah", 1, 'C', 1)

    pdf.ln(5)

    # KOTAK INFO BAWAH KIRI & TTD KANAN
    y_before = pdf.get_y()
    pdf.set_text_color(0, 0, 0)

    if is_tempo:
        # Info jatuh tempo untuk Piutang/Tempo
        import datetime as _dt
        tgl_inv = header_inv.tanggal if hasattr(header_inv.tanggal, 'strftime') else _dt.datetime.now()
        tgl_jatuh_tempo = tgl_inv + _dt.timedelta(days=30)
        pdf.set_font('Arial', 'B', 9)
        pdf.set_text_color(180, 0, 0)
        pdf.cell(80, 5, 'Informasi Pembayaran (Piutang/Tempo):', 'LTR', 1, 'L')
        pdf.set_font('Arial', '', 9)
        pdf.set_text_color(200, 50, 50)
        pdf.cell(80, 5, f"Jatuh Tempo: {tgl_jatuh_tempo.strftime('%d %b %Y')}", 'LR', 1, 'L')
        pdf.cell(80, 5, 'Mohon lakukan pelunasan tepat waktu.', 'LBR', 1, 'L')
    else:
        # Info rekening untuk Tunai/Transfer
        pdf.set_font('Arial', 'B', 9)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(80, 5, 'Pembayaran ditujukan kepada:', 'LTR', 1, 'L')
        pdf.set_font('Arial', '', 9)
        pdf.cell(80, 5, 'Nama Bank : BCA', 'LR', 1, 'L')
        pdf.cell(80, 5, 'Atas Nama : Raziq Garment / Yana', 'LR', 1, 'L')
        pdf.cell(80, 5, 'No Rekening: 123-456-7890', 'LBR', 1, 'L')

    # TTD Kanan
    pdf.set_y(y_before)
    pdf.set_x(120)
    pdf.set_text_color(0, 0, 0)
    pdf.set_font('Arial', '', 10)
    pdf.cell(70, 5, 'Hormat Kami,', 0, 1, 'C')
    pdf.ln(15)
    pdf.set_x(120)
    pdf.set_font('Arial', 'BU', 10)
    pdf.cell(70, 5, f'{nama_ttd}', 0, 1, 'C')
    pdf.set_x(120)
    pdf.set_font('Arial', '', 9)
    pdf.cell(70, 5, f'{jabatan_ttd}', 0, 1, 'C')

    return pdf.output(dest='S').encode('latin-1')