from fpdf import FPDF
import datetime

class PDF(FPDF):
    def __init__(self, judul_laporan, periode="", orientation='P'):
        # Membuka opsi kertas Portrait ('P') atau Landscape ('L')
        super().__init__(orientation=orientation, unit='mm', format='A4')
        self.judul_laporan = judul_laporan
        self.periode = periode
        self.headers_data = None # Memori untuk menyimpan Print Titles (Header Tabel)

    def header(self):
        # Kop Perusahaan
        self.set_font('Arial', 'B', 15)
        self.cell(0, 8, 'PABRIK RAZIQ GARMENT', 0, 1, 'C')
        
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

    def add_ttd(self):
        self.check_page_break(40)
        self.ln(10)
        self.set_font('Arial', '', 10)
        self.cell(self.w / 2 - 10, 5, '', 0, 0)
        self.cell(60, 5, 'Mengetahui,', 0, 1, 'C')
        self.ln(20)
        self.cell(self.w / 2 - 10, 5, '', 0, 0)
        self.set_font('Arial', 'BU', 10)
        self.cell(60, 5, 'Direktur Operasional / Yana Taryana', 0, 1, 'C')

def format_rp_pdf(angka):
    if angka < 0: return f"(Rp {abs(angka):,.0f})".replace(',', '.')
    return f"Rp {angka:,.0f}".replace(',', '.')

# ====================================================================
# 1. ENGINE LAPORAN 2 KOLOM (Tetap Portrait)
# ====================================================================
def export_laporan_2kolom_pdf(judul, periode, data_list, label_total, val_total):
    pdf = PDF(judul, periode, orientation='P')
    
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

    pdf.add_ttd()
    return pdf.output(dest='S').encode('latin-1')

# ====================================================================
# 2. ENGINE TABEL PANJANG (Diubah ke LANDSCAPE & KOLOM MELEBAR)
# ====================================================================
def export_dataframe_pdf(judul, periode, df, col_widths):
    # Kertas dimiringkan menjadi Landscape (Lebar area bisa dipakai: 277mm)
    pdf = PDF(judul, periode, orientation='L')
    
    # Menghitung ulang rasio lebar kolom agar melar memenuhi full 277mm
    total_w = sum(col_widths)
    usable_width = 277 
    actual_widths = [(w / total_w) * usable_width for w in col_widths]
    
    cols = df.columns.tolist()
    
    # Daftarkan Print Title Dinamis sesuai nama kolom
    headers_data = []
    for i, col in enumerate(cols):
        headers_data.append((actual_widths[i], col, 'C'))
    pdf.headers_data = headers_data
    
    pdf.add_page() # Cetak halaman pertama beserta tabel header
    
    pdf.set_font('Arial', '', 9)
    for _, row in df.iterrows():
        pdf.check_page_break(7)
        for i, col in enumerate(cols):
            text = str(row[col])
            align = 'R' if any(x in text for x in ['Rp', 'Pcs', 'LS']) or any(x in col for x in ['Debit', 'Kredit', 'Saldo', 'Harga']) else 'L'
            
            # Karena kertas menyamping (lebar), pemotongan huruf kita perpanjang jadi 85 karakter
            # Sehingga keterangan panjang tidak akan terpotong lagi
            if len(text) > 85: text = text[:82] + "..."
            
            pdf.cell(actual_widths[i], 7, text, 1, 0, align)
        pdf.ln()

    pdf.add_ttd()
    return pdf.output(dest='S').encode('latin-1')