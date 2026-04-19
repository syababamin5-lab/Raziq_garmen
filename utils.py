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