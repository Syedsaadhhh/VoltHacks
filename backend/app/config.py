import os

PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "0.0.0.0")
PROTOCOL_VERSION = os.getenv("PROTOCOL_VERSION", "1.0.0")
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,*").split(",")
    if origin.strip()
]