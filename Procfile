release: cd erp_api && python db_sync_admin.py
web: cd erp_frontend && npm install && npm run build && cd ../erp_api && uvicorn main:app --host 0.0.0.0 --port $PORT
