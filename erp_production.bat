@echo off
title ERP Garmen Production Server
cd /d %~dp0erp_api
echo Starting ERP Server...
..\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000
pause
