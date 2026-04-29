@echo off
echo ==============================================
echo MENJALANKAN SISTEM ERP GARMEN (DECOUPLED)
echo ==============================================
echo.
echo 1. Menyiapkan Backend (FastAPI) di background...
start "ERP Backend (FastAPI Python)" cmd /k "cd /d D:\sistem_garmen_v2\erp_api && python -m uvicorn main:app --reload"

echo 2. Menyiapkan Frontend (React Vite) di background...
start "ERP Frontend (React Localhost)" cmd /k "cd /d D:\sistem_garmen_v2\erp_frontend && npm run dev"

echo.
echo ==============================================
echo Semua server siap! Silakan akses Frontend di Browser Anda.
echo Biarkan kedua jendela hitam (CMD) tersebut tetap terbuka.
echo ==============================================
pause
