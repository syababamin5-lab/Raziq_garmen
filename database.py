from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

#koneksi ke file database SQLite
SQLALCHEMY_DATABASE_URL = "sqlite:///./garmen.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Pembuat sesi (SessionLocal) yang akan dipanggil oleh menu-menu
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Mendefinisikan Base (Fondasi untuk laci-laci database)
Base = declarative_base()

import models
Base.metadata.create_all(bind=engine)