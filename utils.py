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
    angka = int(abs(angka))
    huruf = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"]
    if angka < 12:
        return huruf[angka]
    elif angka < 20:
        return terbilang(angka - 10) + " Belas"
    elif angka < 100:
        return terbilang(angka // 10) + " Puluh " + terbilang(angka % 10)
    elif angka < 200:
        return "Seratus " + terbilang(angka - 100)
    elif angka < 1000:
        return terbilang(angka // 100) + " Ratus " + terbilang(angka % 100)
    elif angka < 2000:
        return "Seribu " + terbilang(angka - 1000)
    elif angka < 1000000:
        return terbilang(angka // 1000) + " Ribu " + terbilang(angka % 1000)
    elif angka < 1000000000:
        return terbilang(angka // 1000000) + " Juta " + terbilang(angka % 1000000)
    elif angka < 1000000000000:
        return terbilang(angka // 1000000000) + " Miliar " + terbilang(angka % 1000000000)
    else:
        return str(angka)