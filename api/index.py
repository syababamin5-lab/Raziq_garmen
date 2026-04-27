import sys
import os

# Tambahkan folder erp_api ke path agar bisa import
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'erp_api'))

from main import app

# Vercel akan mencari variabel 'app' atau 'handler'
handler = app
