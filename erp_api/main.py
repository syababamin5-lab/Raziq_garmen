from fastapi import FastAPI, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from models import engine, SessionLocal, get_db
from datetime import datetime
import os
import pdf_generator
import models
import schemas
import re
import io
import pandas as pd
import shutil

# Import Routers
from routers import (
    dashboard, produksi, pembelian, penjualan, 
    keuangan, laporan, karyawan, riwayat
)
from passlib.context import CryptContext
import jwt

# Password hashing configuration
SECRET_KEY = "raziq-garment-secret-key-123"
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt", "pbkdf2_sha256", "sha256_crypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    try:
        if pwd_context.verify(plain_password, hashed_password):
            return True
    except Exception:
        pass
    return plain_password == hashed_password

def get_password_hash(password):
    return pwd_context.hash(password)

app = FastAPI()

# Startup Event handles all DB initialization
@app.on_event("startup")
async def startup_event():
    models.Base.metadata.create_all(bind=models.engine)
    db = models.SessionLocal()
    try:
        # 1. AUTO-SEED USERS (Hanya jika tabel kosong)
        if db.query(models.User).count() == 0:
            users = [
                models.User(username="superadmin", password_hash=get_password_hash("admin123"), nama_lengkap="Syabaab (Admin Super)", role="super_admin"),
                models.User(username="admin", password_hash=get_password_hash("admin123"), nama_lengkap="Administrator", role="admin"),
                models.User(username="user", password_hash=get_password_hash("user123"), nama_lengkap="Staff User", role="user"),
                models.User(username="bos", password_hash=get_password_hash("bos123"), nama_lengkap="Owner / Investor", role="bos")
            ]
            db.add_all(users)
            db.commit()

        # 2. AUTO-SEED CHART OF ACCOUNTS (COA) - PERMANENSI MASTER DATA
        if db.query(models.AkunBukuBesar).count() == 0:
            coa_data = [
                {"kode_akun": "11110", "nama_akun": "Kas Tunai", "kategori": "Aset"},
                {"kode_akun": "11120", "nama_akun": "Kas di Bank", "kategori": "Aset"},
                {"kode_akun": "11210", "nama_akun": "Piutang Usaha", "kategori": "Aset"},
                {"kode_akun": "11220", "nama_akun": "Piutang Karyawan", "kategori": "Aset"},
                {"kode_akun": "12110", "nama_akun": "Persediaan Bahan Baku (Kain)", "kategori": "Aset"},
                {"kode_akun": "12120", "nama_akun": "Persediaan Bahan Penolong", "kategori": "Aset"},
                {"kode_akun": "12150", "nama_akun": "Persediaan Barang Jadi", "kategori": "Aset"},
                {"kode_akun": "13110", "nama_akun": "Tanah & Bangunan", "kategori": "Aset"},
                {"kode_akun": "13120", "nama_akun": "Akumulasi Penyusutan Bangunan", "kategori": "Aset"},
                {"kode_akun": "13210", "nama_akun": "Mesin Produksi & Peralatan", "kategori": "Aset"},
                {"kode_akun": "13220", "nama_akun": "Akumulasi Penyusutan Mesin", "kategori": "Aset"},
                {"kode_akun": "13310", "nama_akun": "Kendaraan Operasional", "kategori": "Aset"},
                {"kode_akun": "13320", "nama_akun": "Akumulasi Penyusutan Kendaraan", "kategori": "Aset"},
                {"kode_akun": "13410", "nama_akun": "Furniture & Inventaris Kantor", "kategori": "Aset"},
                {"kode_akun": "13420", "nama_akun": "Akumulasi Penyusutan Furniture", "kategori": "Aset"},
                {"kode_akun": "21110", "nama_akun": "Utang Usaha", "kategori": "Kewajiban"},
                {"kode_akun": "21210", "nama_akun": "Utang Gaji & Upah", "kategori": "Kewajiban"},
                {"kode_akun": "31110", "nama_akun": "Modal Disetor", "kategori": "Ekuitas"},
                {"kode_akun": "41110", "nama_akun": "Pendapatan Penjualan", "kategori": "Pendapatan"},
                {"kode_akun": "41120", "nama_akun": "Retur Penjualan", "kategori": "Pendapatan"},
                {"kode_akun": "51110", "nama_akun": "Pemakaian Bahan Baku", "kategori": "Beban"},
                {"kode_akun": "51120", "nama_akun": "Harga Pokok Penjualan (HPP)", "kategori": "Beban"},
                {"kode_akun": "51199", "nama_akun": "Ikhtisar Produksi", "kategori": "Beban"},
                {"kode_akun": "51210", "nama_akun": "BTKL - Upah Cutting", "kategori": "Beban"},
                {"kode_akun": "51220", "nama_akun": "BTKL - Upah Jahit / Makloon", "kategori": "Beban"},
                {"kode_akun": "51230", "nama_akun": "BTKL - Upah QC & Finishing", "kategori": "Beban"},
                {"kode_akun": "51310", "nama_akun": "BOP - Jasa Sablon / Makloon Luar", "kategori": "Beban"},
                {"kode_akun": "51320", "nama_akun": "BOP - Pemakaian Bahan Penolong & Packing", "kategori": "Beban"},
                {"kode_akun": "51330", "nama_akun": "BOP - Listrik, Air, Gas & BBM Pabrik", "kategori": "Beban"},
                {"kode_akun": "51340", "nama_akun": "BOP - Pemeliharaan & Sparepart Mesin Pabrik", "kategori": "Beban"},
                {"kode_akun": "51350", "nama_akun": "BOP - Beban Penyusutan Pabrik", "kategori": "Beban"},
                {"kode_akun": "51390", "nama_akun": "BOP - Asuransi & Biaya Pabrik Lainnya", "kategori": "Beban"},
                {"kode_akun": "61110", "nama_akun": "Beban Gaji Pemasaran & Komisi", "kategori": "Beban"},
                {"kode_akun": "61120", "nama_akun": "Beban Iklan & Promosi", "kategori": "Beban"},
                {"kode_akun": "61130", "nama_akun": "Beban Ongkos Kirim / Ekspedisi ke Customer", "kategori": "Beban"},
                {"kode_akun": "62110", "nama_akun": "Beban Gaji Admin & Umum", "kategori": "Beban"},
                {"kode_akun": "62120", "nama_akun": "Beban ATK & Konsumsi Kantor", "kategori": "Beban"},
                {"kode_akun": "62130", "nama_akun": "Beban Komunikasi & Internet", "kategori": "Beban"},
                {"kode_akun": "62140", "nama_akun": "Beban Perjalanan Dinas & Transport Kantor", "kategori": "Beban"},
                {"kode_akun": "62150", "nama_akun": "Beban Listrik, Air & Keamanan Kantor", "kategori": "Beban"},
                {"kode_akun": "62160", "nama_akun": "Beban Sewa, Pajak & Retribusi", "kategori": "Beban"},
                {"kode_akun": "62170", "nama_akun": "Beban Penyusutan Aset Kantor", "kategori": "Beban"},
                {"kode_akun": "62180", "nama_akun": "Beban Subscription Digital", "kategori": "Beban"},
                {"kode_akun": "62190", "nama_akun": "Beban Lain-lain", "kategori": "Beban"},
                {"kode_akun": "62220", "nama_akun": "Biaya Hosting", "kategori": "Beban"},
            ]
            db.add_all([models.AkunBukuBesar(**c) for c in coa_data])
            db.commit()

        # 3. AUTO-SEED COMPANY CONFIG
        if db.query(models.CompanyConfig).count() == 0:
            db.add(models.CompanyConfig())
            db.commit()
    finally:
        db.close()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router)
app.include_router(produksi.router)
app.include_router(pembelian.router)
app.include_router(penjualan.router)
app.include_router(keuangan.router)
app.include_router(laporan.router)
app.include_router(karyawan.router)
app.include_router(riwayat.router)

# Folder untuk upload foto profil
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads", "profiles")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")), name="uploads")

# ==========================================================
# AUTHENTICATION ENDPOINTS
# ==========================================================
from passlib.context import CryptContext
import jwt

SECRET_KEY = "raziq_garment_secret_key"

def create_access_token(data: dict):
    to_encode = data.copy()
    to_encode.update({"exp": datetime.now() + pd.Timedelta(days=7)}) # Just use a long expiration for simplicity
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Seed users removed (moved to startup_event)

@app.post("/api/auth/login", response_model=schemas.TokenResponse)
def login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == request.username).first()
    if not user or not verify_password(request.password, user.password_hash):
        return schemas.TokenResponse(access_token="", user={"error": "Username atau password salah!"})
    
    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    return schemas.TokenResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "username": user.username,
            "nama_lengkap": user.nama_lengkap,
            "role": user.role,
            "foto_url": user.foto_url,
            "email": user.email,
            "no_hp": user.no_hp
        }
    )

@app.put("/api/auth/profile")
def update_my_profile(data: dict, db: Session = Depends(get_db)):
    username = data.get("username")
    if not username: return {"status": "error", "message": "Username required"}
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user: return {"status": "error", "message": "User tidak ditemukan"}
    
    if "nama_lengkap" in data: user.nama_lengkap = data["nama_lengkap"]
    if "email" in data: user.email = data["email"]
    if "no_hp" in data: user.no_hp = data["no_hp"]
    if "foto_url" in data: user.foto_url = data["foto_url"]
    if "password" in data and data["password"]:
        user.password_hash = get_password_hash(data["password"])
        
    db.commit()
    return {
        "status": "success", 
        "message": "Profil diperbarui",
        "user": {
            "id": user.id,
            "username": user.username,
            "nama_lengkap": user.nama_lengkap,
            "role": user.role,
            "foto_url": user.foto_url,
            "email": user.email,
            "no_hp": user.no_hp
        }
    }

@app.get("/api/users")
def get_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return [{"id": u.id, "username": u.username, "nama_lengkap": u.nama_lengkap, "role": u.role, "is_active": u.is_active} for u in users]

@app.get("/api/company-config")
def get_company_config(db: Session = Depends(get_db)):
    config = db.query(models.CompanyConfig).first()
    if not config:
        config = models.CompanyConfig()
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

@app.post("/api/company-config")
def update_company_config(data: dict, db: Session = Depends(get_db)):
    config = db.query(models.CompanyConfig).first()
    if not config:
        config = models.CompanyConfig()
        db.add(config)
    
    for key, value in data.items():
        if hasattr(config, key):
            setattr(config, key, value)
    
    db.commit()
    return {"status": "success", "message": "Konfigurasi diperbarui"}

@app.get("/api/users")
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

@app.post("/api/users/upload-photo")
async def upload_user_photo(file: UploadFile = File(...)):
    try:
        ext = file.filename.split('.')[-1]
        filename = f"profile_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"status": "success", "url": f"/uploads/profiles/{filename}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/company-config/upload-ttd")
async def upload_company_ttd(file: UploadFile = File(...)):
    try:
        ext = file.filename.split('.')[-1]
        filename = f"ttd_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"status": "success", "url": f"/uploads/profiles/{filename}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.put("/api/users/{user_id}")
def update_user(user_id: int, data: dict, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: return {"status": "error", "message": "User tidak ditemukan"}
    
    if "nama_lengkap" in data: user.nama_lengkap = data["nama_lengkap"]
    if "role" in data: user.role = data["role"]
    if "foto_url" in data: user.foto_url = data["foto_url"]
    if "email" in data: user.email = data["email"]
    if "no_hp" in data: user.no_hp = data["no_hp"]
    if "password" in data and data["password"]:
        user.password_hash = get_password_hash(data["password"])
        
    db.commit()
    return {"status": "success", "message": "User diperbarui"}

@app.post("/api/users")
def create_user(data: schemas.UserCreate, db: Session = Depends(get_db)):
    cek = db.query(models.User).filter(models.User.username == data.username).first()
    if cek: return {"status": "error", "message": "Username sudah digunakan!"}
    
    new_user = models.User(
        username=data.username,
        password_hash=get_password_hash(data.password),
        nama_lengkap=data.nama_lengkap,
        role=data.role
    )
    db.add(new_user)
    db.commit()
    return {"status": "success", "message": "User berhasil dibuat"}

@app.delete("/api/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: return {"status": "error", "message": "User tidak ditemukan"}
    if user.username == "superadmin": return {"status": "error", "message": "Akun Superadmin tidak bisa dihapus!"}
    
    db.delete(user)
    db.commit()
    return {"status": "success", "message": "User berhasil dihapus"}

# ==========================================================
# MASTER DATA ENDPOINTS (FIRESTORE VERSION)
# ==========================================================

@app.get("/api/master/barang")
def get_master_barang(db: Session = Depends(get_db)):
    return db.query(models.Barang).all()

@app.get("/api/master/barang/print")
def print_master_barang(tipe: str = "all", db: Session = Depends(get_db)):
    try:
        query = db.query(models.Barang)
        if tipe == "baju":
            query = query.filter(models.Barang.kategori.in_(["Barang Jadi (Baju)", "BARANG_JADI"]))
        elif tipe == "bahan":
            query = query.filter(~models.Barang.kategori.in_(["Barang Jadi (Baju)", "BARANG_JADI"]))
            
        items = query.all()
        # Susun Data untuk PDF
        data = []
        for b in items:
            row = {
                "Kategori": b.kategori,
                "Model Code": b.model_code,
                "Nama Barang": b.nama_barang,
                "SKU": b.kode_sku,
                "Stok": f"{b.stok_saat_ini:g} {b.satuan}",
                "Harga Modal": f"Rp {b.harga_modal:,.0f}/{b.satuan}".replace(',', '.')
            }
            if tipe != "bahan":
                row["Harga Jual/LS"] = f"Rp {b.harga_jual:,.0f}".replace(',', '.') if "Barang Jadi" in b.kategori else "-"
            data.append(row)
        
        if not data:
            return {"status": "error", "message": "Tidak ada data barang untuk dicetak"}
            
        df = pd.DataFrame(data)
        
        # Lebar kolom dinamis
        if tipe == "bahan":
            col_widths = [55, 45, 85, 40, 35, 42]
            judul = "LAPORAN STOK GUDANG BAHAN BAKU"
        elif tipe == "baju":
            col_widths = [45, 35, 75, 30, 25, 32, 35]
            judul = "LAPORAN STOK GUDANG BARANG JADI"
        else:
            col_widths = [45, 35, 75, 30, 25, 32, 35]
            judul = "LAPORAN STOK GUDANG (REAL-TIME)"
            
        # Ambil Profil
        config = db.query(models.CompanyConfig).first()
        
        pdf_bytes = pdf_generator.export_dataframe_pdf(judul, "", df, col_widths, config)
        
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": "inline; filename=laporan_stok.pdf"}
        )
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/master/karyawan")
def get_master_karyawan(db: Session = Depends(get_db)):
    return db.query(models.Karyawan).all()

@app.get("/api/master/mitra")
def get_master_mitra(db: Session = Depends(get_db)):
    return db.query(models.Mitra).all()

@app.get("/api/master/akun")
def get_master_akun(db: Session = Depends(get_db)):
    return db.query(models.AkunBukuBesar).all()

@app.post("/api/master/barang")
def add_master_barang(data: schemas.MasterBarangRequest, db: Session = Depends(get_db)):
    cek = db.query(models.Barang).filter(models.Barang.kode_sku == data.kode_sku).first()
    if cek: return {"status": "error", "message": "SKU sudah ada!"}
    
    new_barang = models.Barang(
        model_code=data.model_code, 
        nama_barang=data.nama_barang, 
        kode_sku=data.kode_sku,
        kategori=data.kategori, 
        satuan=data.satuan, 
        harga_jual=data.harga_jual, 
        harga_modal=0.0 if data.kategori == "Barang Jadi (Baju)" else (data.harga_modal or 0.0),
        stok_saat_ini=0
    )
    db.add(new_barang)
    db.commit()
    return {"status": "success", "message": "Barang ditambahkan"}

@app.post("/api/master/karyawan")
def add_master_karyawan(data: schemas.MasterKaryawanRequest, db: Session = Depends(get_db)):
    try:
        new_karyawan = models.Karyawan(
            nama_karyawan=data.nama_karyawan, 
            no_hp=data.no_hp, 
            alamat=data.alamat, 
            divisi=data.divisi, 
            tipe_gaji=data.tipe_gaji, 
            nominal_gaji=data.nominal_gaji, 
            target_produksi_mingguan=data.target_produksi_mingguan, 
            saldo_kasbon=data.saldo_kasbon_awal
        )
        db.add(new_karyawan)
        
        if data.saldo_kasbon_awal > 0:
            db.add(models.JurnalUmum(
                kode_akun="11220", nama_akun="Piutang Karyawan", 
                keterangan=f"Saldo Awal Kasbon - {data.nama_karyawan}", 
                debit=data.saldo_kasbon_awal, kredit=0, tanggal=datetime.now()
            ))
            db.add(models.JurnalUmum(
                kode_akun="31110", nama_akun="Modal Disetor", 
                keterangan=f"Saldo Awal Kasbon - {data.nama_karyawan}", 
                debit=0, kredit=data.saldo_kasbon_awal, tanggal=datetime.now()
            ))
        db.commit()
        return {"status": "success", "message": "Karyawan ditambahkan"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

@app.post("/api/master/mitra")
def add_master_mitra(data: schemas.MasterMitraRequest, db: Session = Depends(get_db)):
    try:
        new_mitra = models.Mitra(
            nama_mitra=data.nama_mitra, 
            kategori=data.kategori, 
            no_hp=data.no_hp, 
            alamat=data.alamat,
            saldo_piutang=data.saldo_awal if data.kategori == "CUSTOMER" else 0,
            saldo_utang=data.saldo_awal if data.kategori != "CUSTOMER" else 0
        )
        db.add(new_mitra)

        if data.saldo_awal > 0:
            if data.kategori == "CUSTOMER":
                db.add(models.JurnalUmum(kode_akun="11210", nama_akun="Piutang Usaha", keterangan=f"Saldo Awal - {data.nama_mitra}", debit=data.saldo_awal, kredit=0, tanggal=datetime.now()))
                db.add(models.JurnalUmum(kode_akun="31110", nama_akun="Modal Disetor", keterangan=f"Saldo Awal - {data.nama_mitra}", debit=0, kredit=data.saldo_awal, tanggal=datetime.now()))
            else:
                db.add(models.JurnalUmum(kode_akun="31110", nama_akun="Modal Disetor", keterangan=f"Saldo Awal - {data.nama_mitra}", debit=data.saldo_awal, kredit=0, tanggal=datetime.now()))
                db.add(models.JurnalUmum(kode_akun="21110", nama_akun="Utang Usaha", keterangan=f"Saldo Awal - {data.nama_mitra}", debit=0, kredit=data.saldo_awal, tanggal=datetime.now()))
        db.commit()
        return {"status": "success", "message": "Mitra ditambahkan"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

@app.post("/api/master/akun")
def add_master_akun(data: schemas.MasterAkunRequest, db: Session = Depends(get_db)):
    try:
        new_akun = models.AkunBukuBesar(kode_akun=data.kode_akun, nama_akun=data.nama_akun, kategori=data.kategori)
        db.add(new_akun)
        db.commit()
        return {"status": "success", "message": "Akun ditambahkan"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

@app.post("/api/master/saldo_awal")
def add_master_saldo(data: schemas.MasterSaldoAwalRequest, db: Session = Depends(get_db)):
    try:
        db.add(models.JurnalUmum(kode_akun=data.akun_id, nama_akun=data.nama_akun, keterangan=data.keterangan, debit=data.nominal_saldo, kredit=0, tanggal=datetime.now()))
        db.add(models.JurnalUmum(kode_akun="31110", nama_akun="Modal Disetor", keterangan=data.keterangan, debit=0, kredit=data.nominal_saldo, tanggal=datetime.now()))
        db.commit()
        return {"status": "success", "message": "Saldo Awal tersimpan"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

@app.put("/api/master/barang/{item_id}")
def update_master_barang(item_id: int, data: dict, db: Session = Depends(get_db)):
    item = db.query(models.Barang).filter(models.Barang.id == item_id).first()
    if not item: return {"status": "error", "message": "Barang tidak ditemukan"}
    for key, value in data.items():
        if hasattr(item, key): setattr(item, key, value)
    db.commit()
    return {"status": "success", "message": "Barang diperbarui"}

@app.put("/api/master/karyawan/{item_id}")
def update_master_karyawan(item_id: int, data: dict, db: Session = Depends(get_db)):
    item = db.query(models.Karyawan).filter(models.Karyawan.id == item_id).first()
    if not item: return {"status": "error", "message": "Karyawan tidak ditemukan"}
    for key, value in data.items():
        if hasattr(item, key): setattr(item, key, value)
    db.commit()
    return {"status": "success", "message": "Karyawan diperbarui"}

@app.put("/api/master/mitra/{item_id}")
def update_master_mitra(item_id: int, data: dict, db: Session = Depends(get_db)):
    item = db.query(models.Mitra).filter(models.Mitra.id == item_id).first()
    if not item: return {"status": "error", "message": "Mitra tidak ditemukan"}
    for key, value in data.items():
        if hasattr(item, key): setattr(item, key, value)
    db.commit()
    return {"status": "success", "message": "Mitra diperbarui"}

# EDIT & DELETE Firestore...
# (Akan diimplementasikan bertahap jika diperlukan, sementara fokus pada operasional utama)

@app.post("/api/master/import-excel")
async def import_excel(tipe: str, overwrite: bool = False, file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        if overwrite:
            print(f"--- TRUNCATE DATA {tipe} ---")
            if tipe == "BAJU":
                # Hapus semua barang jadi
                db.query(models.Barang).filter(models.Barang.kategori.in_(["BARANG_JADI", "Barang Jadi (Baju)"])).delete(synchronize_session=False)
                # Hapus jurnal saldo awal terkait persediaan baju
                db.query(models.JurnalUmum).filter(models.JurnalUmum.keterangan.ilike("%Saldo Awal Baju%")).delete(synchronize_session=False)
            elif tipe == "BAHAN":
                # Hapus semua bahan baku/pembantu/penolong
                db.query(models.Barang).filter(models.Barang.kategori.ilike("Bahan%")).delete(synchronize_session=False)
                # Hapus jurnal saldo awal terkait persediaan bahan
                db.query(models.JurnalUmum).filter(models.JurnalUmum.keterangan.ilike("%Saldo Awal bahan%")).delete(synchronize_session=False)
            db.commit()

        print(f"--- Memulai Import {tipe} ke SQLite ---")
        content = await file.read()
        df = pd.read_excel(io.BytesIO(content))
        
        # Ambil semua data SKU yang ada dulu agar tidak lambat (Fetch Once)
        inv_docs = db.query(models.Barang).all()
        existing_skus = {doc.kode_sku: doc for doc in inv_docs}
        
        count = 0

        def bersihkan(nilai):
            if pd.isna(nilai): return 0.0
            if isinstance(nilai, (int, float)): return float(nilai)
            
            s = str(nilai).lower().replace('rp', '').strip()
            if not s: return 0.0
            
            # Logika Pemisah:
            # Standar Excel IDR: Titik (.) = Ribuan, Koma (,) = Desimal
            # Standar Pandas: Titik (.) = Desimal
            
            if '.' in s and ',' in s:
                # Format: 270.000,00 -> 270000.00
                s = s.replace('.', '').replace(',', '.')
            elif ',' in s:
                # Format: 270000,00 -> 270000.00
                s = s.replace(',', '.')
            elif '.' in s:
                # Bisa jadi 270.000 (Ribuan) atau 270000.0 (Desimal)
                parts = s.split('.')
                if len(parts[-1]) == 3: # Pola ribuan (cth: .000)
                    s = s.replace('.', '')
                else: # Pola desimal (cth: .0 atau .5)
                    pass 
            
            try:
                return float(s)
            except: return 0.0

        if tipe == "BAJU":
            total_aset_baju = 0
            for _, row in df.iterrows():
                sku = str(row['SKU']).strip()
                
                stok_excel = bersihkan(row['Stok Awal'])
                harga_jual = bersihkan(row['Harga Jual'])
                harga_modal_excel = bersihkan(row['Harga Modal'])
                satuan_teks = str(row['Satuan (Lusin/Pcs)']).strip().lower() if 'Satuan (Lusin/Pcs)' in row else str(row['Satuan']).strip().lower()
                
                stok_pcs = stok_excel * 12 if ("lusin" in satuan_teks or "ls" in satuan_teks) else stok_excel
                
                # KOREKSI ATURAN PERUSAHAAN: 
                # Di Excel, Harga Modal dan Harga Jual untuk Baju SELALU ditulis PER LUSIN.
                # Namun di Database: 
                # - harga_modal disimpan per PCS
                # - harga_jual disimpan per LUSIN
                harga_modal = harga_modal_excel / 12
                harga_jual_db = harga_jual
                
                if sku in existing_skus:
                    barang = existing_skus[sku]
                    barang.stok_saat_ini += stok_pcs
                    barang.harga_jual = harga_jual_db
                    barang.harga_modal = harga_modal
                else:
                    new_barang = models.Barang(
                        model_code=row.get('Model Code', 'BAJU'), nama_barang=row.get('Product Name', ''), 
                        kode_sku=sku, kategori="Barang Jadi (Baju)", satuan="Pcs", 
                        stok_saat_ini=stok_pcs, harga_jual=harga_jual_db, harga_modal=harga_modal
                    )
                    db.add(new_barang)
                
                if stok_pcs > 0 and harga_modal > 0:
                    total_aset_baju += (stok_pcs * harga_modal)
                
                count += 1

            if total_aset_baju > 0:
                db.add(models.JurnalUmum(tanggal=datetime.now(), kode_akun="12150", nama_akun="Persediaan Barang Jadi", keterangan="Saldo Awal Baju (SQLite Import)", debit=total_aset_baju, kredit=0))
                db.add(models.JurnalUmum(tanggal=datetime.now(), kode_akun="31110", nama_akun="Modal Disetor", keterangan="Saldo Awal Baju (SQLite Import)", debit=0, kredit=total_aset_baju))
            
            db.commit()
            return {"status": "success", "message": f"Berhasil Import {count} data Baju ke SQLite!"}

        elif tipe == "BAHAN":
            for _, row in df.iterrows():
                sku = str(row['SKU']).strip()
                if sku not in existing_skus:
                    kat_str = str(row.get('Kategori', '')).upper()
                    kategori = "Bahan Baku (Kain)"
                    if "PEMBANTU" in kat_str: kategori = "Bahan Pembantu (Benang, Kancing, dll)"
                    elif "PENOLONG" in kat_str: kategori = "Bahan Penolong (Label, Plastik, dll)"
                    
                    stok = float(row['Stok Awal']) if pd.notna(row['Stok Awal']) else 0
                    hrg_m = float(row['Harga Modal']) if pd.notna(row['Harga Modal']) else 0
                    
                    new_barang = models.Barang(
                        nama_barang=row.get('Nama Bahan', ''), kode_sku=sku, model_code="BAHAN",
                        kategori=kategori, satuan=row.get('Satuan (Kg/Pcs)', "Kg"),
                        stok_saat_ini=stok, harga_modal=hrg_m
                    )
                    db.add(new_barang)
                    
                    if stok > 0 and hrg_m > 0:
                        nilai = stok * hrg_m
                        akun_bhn = "12110" if kategori == "Bahan Baku (Kain)" else "12120"
                        db.add(models.JurnalUmum(tanggal=datetime.now(), kode_akun=akun_bhn, nama_akun=f"Persediaan {kategori}", keterangan=f"Saldo Awal {sku}", debit=nilai, kredit=0))
                        db.add(models.JurnalUmum(tanggal=datetime.now(), kode_akun="31110", nama_akun="Modal Disetor", keterangan=f"Saldo Awal {sku}", debit=0, kredit=nilai))
                count += 1
            db.commit()
            return {"status": "success", "message": f"Berhasil Import {count} data Bahan ke SQLite!"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

# ==========================================================
# SUPER ADMIN DATABASE MANAGEMENT ENDPOINTS
# ==========================================================

@app.delete("/api/admin/database/prune")
def prune_database(start_date: str, end_date: str, db: Session = Depends(get_db)):
    """Menghapus data transaksi (PRUNING) dalam rentang tanggal tertentu. DATA MASTER AMAN."""
    try:
        # Konversi string ke datetime. Jika hanya tanggal (YYYY-MM-DD), 
        # fromisoformat akan menghasilkan jam 00:00:00.
        sd = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        ed = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        # Pastikan end_date mencakup seluruh hari (sampai 23:59:59)
        # Jika ed jamnya masih 00:00:00, kita set ke akhir hari
        if ed.hour == 0 and ed.minute == 0 and ed.second == 0:
            ed = ed.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        # 1. Prune Jurnal Umum
        db.query(models.JurnalUmum).filter(models.JurnalUmum.tanggal >= sd, models.JurnalUmum.tanggal <= ed).delete(synchronize_session=False)
        
        # 2. Prune Penjualan (Header & Detail)
        inv_to_prune = db.query(models.HeaderPenjualan.no_invoice).filter(models.HeaderPenjualan.tanggal >= sd, models.HeaderPenjualan.tanggal <= ed).all()
        inv_list = [i[0] for i in inv_to_prune]
        if inv_list:
            db.query(models.DetailPenjualan).filter(models.DetailPenjualan.no_invoice.in_(inv_list)).delete(synchronize_session=False)
            db.query(models.HeaderPenjualan).filter(models.HeaderPenjualan.no_invoice.in_(inv_list)).delete(synchronize_session=False)
            
        # 3. Prune Pembelian (Header & Detail)
        po_to_prune = db.query(models.HeaderPembelian.no_po).filter(models.HeaderPembelian.tanggal >= sd, models.HeaderPembelian.tanggal <= ed).all()
        po_list = [p[0] for p in po_to_prune]
        if po_list:
            db.query(models.DetailPembelian).filter(models.DetailPembelian.no_po.in_(po_list)).delete(synchronize_session=False)
            db.query(models.HeaderPembelian).filter(models.HeaderPembelian.no_po.in_(po_list)).delete(synchronize_session=False)
            
        # Catatan: Produksi dan Kasbon terekam di JurnalUmum, jadi otomatis terhapus jika masuk range.
        # Saldo Mitra/Barang mungkin perlu rekalkulasi jika pruning dilakukan di tengah jalan, 
        # namun instruksi hanya meminta penghapusan.
        
        db.commit()
        return {"status": "success", "message": f"Data transaksi periode {start_date} s/d {end_date} berhasil dibersihkan!"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

@app.get("/api/admin/database/export-all")
def export_full_database(db: Session = Depends(get_db)):
    """Ekspor SELURUH database ke Excel Multi-Sheet."""
    try:
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            # Daftar semua model untuk diekspor
            tables = {
                "Akun_COA": models.AkunBukuBesar,
                "Barang_Stok": models.Barang,
                "Karyawan": models.Karyawan,
                "Mitra_Bisnis": models.Mitra,
                "Jurnal_Umum": models.JurnalUmum,
                "Invoice_Header": models.HeaderPenjualan,
                "Invoice_Detail": models.DetailPenjualan,
                "PO_Header": models.HeaderPembelian,
                "PO_Detail": models.DetailPembelian,
                "User_Sistem": models.User,
                "Config_Perusahaan": models.CompanyConfig
            }
            
            for sheet_name, model in tables.items():
                items = db.query(model).all()
                if items:
                    # Convert list of models to list of dicts
                    data = [item.__dict__ for item in items]
                    # Remove SQLAlchemy internal state
                    for d in data: d.pop('_sa_instance_state', None)
                    df = pd.DataFrame(data)
                    df.to_excel(writer, sheet_name=sheet_name, index=False)
                else:
                    # Create empty sheet with columns if no data
                    pd.DataFrame(columns=[c.name for c in model.__table__.columns]).to_excel(writer, sheet_name=sheet_name, index=False)
                    
        output.seek(0)
        return StreamingResponse(
            output, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=FULL_DATABASE_BACKUP.xlsx"}
        )
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/admin/database/export-category/{name}")
def export_database_category(name: str, db: Session = Depends(get_db)):
    """Ekspor per kategori data."""
    try:
        model_map = {
            "karyawan": models.Karyawan,
            "barang": models.Barang,
            "mitra": models.Mitra,
            "akun": models.AkunBukuBesar
        }
        
        target_model = model_map.get(name.lower())
        if not target_model:
            return {"status": "error", "message": "Kategori tidak valid"}
            
        items = db.query(target_model).all()
        data = [item.__dict__ for item in items]
        for d in data: d.pop('_sa_instance_state', None)
        
        df = pd.DataFrame(data)
        output = io.BytesIO()
        df.to_excel(output, index=False, engine='xlsxwriter')
        output.seek(0)
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=MASTER_{name.upper()}.xlsx"}
        )
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/admin/database/export-transactions")
def export_transactions_range(start_date: str, end_date: str, db: Session = Depends(get_db)):
    """Ekspor data TRANSAKSI saja dalam rentang tanggal tertentu ke Excel Multi-Sheet."""
    try:
        sd = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        ed = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            # Tabel Transaksi
            tables = {
                "Jurnal_Umum": (models.JurnalUmum, models.JurnalUmum.tanggal),
                "Invoice_Header": (models.HeaderPenjualan, models.HeaderPenjualan.tanggal),
                "PO_Header": (models.HeaderPembelian, models.HeaderPembelian.tanggal)
            }
            
            for sheet_name, (model, date_col) in tables.items():
                items = db.query(model).filter(date_col >= sd, date_col <= ed).all()
                if items:
                    data = [item.__dict__ for item in items]
                    for d in data: d.pop('_sa_instance_state', None)
                    df = pd.DataFrame(data)
                    df.to_excel(writer, sheet_name=sheet_name, index=False)
                else:
                    pd.DataFrame(columns=[c.name for c in model.__table__.columns]).to_excel(writer, sheet_name=sheet_name, index=False)
            
            # Detail (Berdasarkan No Invoice/PO yang masuk range)
            inv_list = [i[0] for i in db.query(models.HeaderPenjualan.no_invoice).filter(models.HeaderPenjualan.tanggal >= sd, models.HeaderPenjualan.tanggal <= ed).all()]
            if inv_list:
                details = db.query(models.DetailPenjualan).filter(models.DetailPenjualan.no_invoice.in_(inv_list)).all()
                data = [item.__dict__ for item in details]
                for d in data: d.pop('_sa_instance_state', None)
                pd.DataFrame(data).to_excel(writer, sheet_name="Invoice_Detail", index=False)
            
            po_list = [p[0] for p in db.query(models.HeaderPembelian.no_po).filter(models.HeaderPembelian.tanggal >= sd, models.HeaderPembelian.tanggal <= ed).all()]
            if po_list:
                details = db.query(models.DetailPembelian).filter(models.DetailPembelian.no_po.in_(po_list)).all()
                data = [item.__dict__ for item in details]
                for d in data: d.pop('_sa_instance_state', None)
                pd.DataFrame(data).to_excel(writer, sheet_name="PO_Detail", index=False)

        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=TRANSAKSI_{start_date}_to_{end_date}.xlsx"}
        )
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ==========================================================
# DEPLOYMENT: SERVE REACT FRONTEND (SPA)
# ==========================================================
# Folder dist hasil 'npm run build'
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
build_path = os.path.join(base_dir, "erp_frontend", "dist")

if os.path.exists(build_path):
    # Mount folder assets secara spesifik jika ada
    assets_path = os.path.join(build_path, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")
    
    # Catch-all route untuk melayani index.html (SPA)
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # Jika request ke API, biarkan FastAPI menghandle (sudah lewat router di atas)
        # Jika bukan file fisik, kirim index.html
        file_path = os.path.join(build_path, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(build_path, "index.html"))
else:
    @app.get("/")
    def read_root():
        return {"message": "ERP Backend is Running. Frontend build (dist) not found."}