@echo off
title ERP Garmen Production Server
color 0A
echo =======================================================
echo          RAZIQ GARMENT - ERP PRODUCTION SYSTEM         
echo =======================================================
echo.
echo [1/2] Memeriksa Database Lokal...
if exist "d:\sistem_garmen_v2\garmen.db" (
    echo [OK] Database ditemukan.
) else (
    echo [!] Database tidak ditemukan! Pastikan garmen.db ada di root.
)

echo.
echo [2/2] Menghidupkan Server Tunggal (Backend + UI)...
cd /d d:\sistem_garmen_v2\erp_api

:: Cek apakah venv ada di root
if exist "d:\sistem_garmen_v2\.venv\Scripts\activate.bat" (
    echo [INFO] Menggunakan Virtual Environment (.venv)...
    call d:\sistem_garmen_v2\.venv\Scripts\activate.bat
)

echo.
echo =======================================================
echo  SISTEM BERHASIL DIJALANKAN!
echo  Silakan buka Browser Anda dan akses:
echo.
echo  URL: http://localhost:8000
echo.
echo  * Jangan tutup jendela hitam ini selama bekerja *
echo =======================================================
echo.

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --log-level info

pause
