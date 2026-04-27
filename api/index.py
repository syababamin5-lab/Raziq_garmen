import sys
import os

try:
    # Tambahkan folder erp_api ke path agar bisa import
    sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'erp_api'))
    from main import app
    handler = app
except Exception as e:
    # Jika gagal import, kembalikan error sebagai response agar bisa kita baca
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    error_app = FastAPI()
    @error_app.get("/{full_path:path}")
    async def error_handler(full_path: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Vercel Import Error",
                "message": str(e),
                "path": os.getcwd(),
                "files": os.listdir(os.getcwd()) if os.path.exists(os.getcwd()) else []
            }
        )
    handler = error_app
