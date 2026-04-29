def format_rp(angka):
    if angka is None:
        angka = 0
    # Mengubah angka menjadi format Rp. 270.000,-
    return f"Rp. {int(angka):,},-".replace(',', '.')
from models import AkunBukuBesar

def get_opsi_akun(db, kategori_filter):
    """Mengambil akun dari database dan mengubahnya jadi format dictionary untuk dropdown UI"""
    akun_db = db.query(AkunBukuBesar).filter(AkunBukuBesar.kategori == kategori_filter).all()
    
    # Format output: {"51210 - BTKL - Upah Cutting": "51210"}
    daftar_akun = {}
    for akun in akun_db:
        label = f"{akun.kode_akun} - {akun.nama_akun}"
        daftar_akun[label] = akun.kode_akun
        
    return daftar_akun

def terbilang(angka):
    def proses(n):
        huruf = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"]
        if n < 12:
            return huruf[n]
        elif n < 20:
            return proses(n - 10) + " Belas"
        elif n < 100:
            return proses(n // 10) + " Puluh " + proses(n % 10)
        elif n < 200:
            return "Seratus " + proses(n - 100)
        elif n < 1000:
            return proses(n // 100) + " Ratus " + proses(n % 100)
        elif n < 2000:
            return "Seribu " + proses(n - 1000)
        elif n < 1000000:
            return proses(n // 1000) + " Ribu " + proses(n % 1000)
        elif n < 1000000000:
            return proses(n // 1000000) + " Juta " + proses(n % 1000000)
        elif n < 1000000000000:
            return proses(n // 1000000000) + " Miliar " + proses(n % 1000000000)
        else:
            return str(n)

    res = proses(int(abs(angka)))
    return " ".join(res.split())