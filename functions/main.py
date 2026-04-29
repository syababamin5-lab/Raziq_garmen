import sys
import os
from firebase_functions import https_fn
from firebase_admin import initialize_app

# 1. Initialize Firebase Admin
initialize_app()

# 2. Add erp_api to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'erp_api'))

# 3. Import the FastAPI app
try:
    from main import app as fastapi_app
except ImportError:
    # Fallback for different directory structures in deployment
    sys.path.append(os.path.join(os.path.dirname(__file__), 'erp_api'))
    from main import app as fastapi_app

# 4. Export the function for Firebase
@https_fn.on_request()
def api(req: https_fn.Request) -> https_fn.Response:
    # Use asgi_adapter or similar if needed, but for simple routing:
    # This is a placeholder. In a real deployment, you would use a proper ASGI adapter
    # such as 'mangum' or 'asgiref'.
    # For Firebase Cloud Functions, we'll use a direct export if possible.
    return https_fn.Response("Backend API is running. Please use the /api/ prefix.")

# Note: For full FastAPI support on Firebase Cloud Functions, 
# it's recommended to use a proper adapter or deploy to Cloud Run.
