from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
import os

# Menunjuk ke file garmen.db yang SAMA dengan Streamlit (satu database, dua UI)
# Path absolut ke database yang sudah ada
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "garmen.db")

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Dependency untuk FastAPI (Dependency Injection)
def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
