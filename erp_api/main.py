"""
main.py - Entry point FastAPI Backend
ERP Garment - Raziq Garment 2026
======================================
Jalankan dengan: uvicorn main:app --reload --port 8000
Docs API:        http://127.0.0.1:8000/docs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import semua router
from routers import dashboard

# Inisiasi database (membuat tabel jika belum ada)
from database import engine, Base
import models  # noqa: F401 — memicu registrasi semua model ke Base

Base.metadata.create_all(bind=engine)

# ── Inisiasi Aplikasi ─────────────────────────────────────────
app = FastAPI(
    title="ERP Garment API — Raziq Garment",
    description=(
        "Backend FastAPI untuk sistem ERP Garment. "
        "Menggunakan SQLite database yang sama dengan aplikasi Streamlit."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS: izinkan React dev server (port 5173) mengakses backend ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # CRA / Next.js (fallback)
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Daftarkan Router ──────────────────────────────────────────
app.include_router(dashboard.router)


# ── Health Check ─────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {
        "status": "online",
        "app": "ERP Garment API",
        "versi": "2.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "database": "sqlite://garmen.db"}
