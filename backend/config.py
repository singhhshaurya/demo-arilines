import os
from pathlib import Path
from dotenv import load_dotenv

# Search for .env in current directory and parent directory
env_path = Path(__file__).resolve().parent / ".env"
root_env_path = Path(__file__).resolve().parent.parent / ".env"

if root_env_path.exists():
    load_dotenv(root_env_path)
if env_path.exists():
    load_dotenv(env_path, override=True)


class Config:
    """Application configuration loaded from environment variables."""

    # Server Settings
    PORT = int(os.getenv("FLASK_PORT") or os.getenv("PORT") or 9000)
    FLASK_ENV = os.getenv("APP_ENV") or os.getenv("FLASK_ENV") or "development"

    # MongoDB Settings
    MONGODB_USERNAME = os.getenv("MONGODB_USERNAME", "").strip('"\' ')
    MONGODB_PASSWORD = os.getenv("MONGODB_PASSWORD", "").strip('"\' ')
    MONGODB_URI = os.getenv("MONGODB_URI", "").strip('"\' ')
    DATABASE_NAME = os.getenv("MONGODB_DATABASE") or os.getenv("DATABASE_NAME") or "skypulse_db"

    # If MONGODB_URI is not set, try constructing it if username/password are given
    if not MONGODB_URI and MONGODB_USERNAME and MONGODB_PASSWORD:
        MONGODB_URI = f"mongodb+srv://{MONGODB_USERNAME}:{MONGODB_PASSWORD}@cluster0.dtv8fu3.mongodb.net/"
    elif not MONGODB_URI:
        MONGODB_URI = "mongodb://localhost:27017"

    # Google OAuth 2.0 Credentials
    GOOGLE_AUTH_CLIENT_ID = os.getenv("GOOGLE_AUTH_CLIENT_ID", "").strip('"\' ')
    GOOGLE_AUTH_CLIENT_SECRET = os.getenv("GOOGLE_AUTH_CLIENT_SECRET", "").strip('"\' ')

    # Razorpay Credentials
    RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_ToCDACAiFNsKep").strip('"\' ')
    RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "MgpT9WWaSGJbZlRszs2whIvF").strip('"\' ')
    RAZORPAY_MODE = os.getenv("RAZORPAY_MODE", "test")

    # Admin Settings
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123").strip('"\' ')
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@skypulse.com").strip('"\' ')
    ADMIN_EMAILS = [
        e.strip()
        for e in os.getenv("ADMIN_EMAILS", "").split(",")
        if e.strip()
    ]
    if ADMIN_EMAIL and ADMIN_EMAIL not in ADMIN_EMAILS:
        ADMIN_EMAILS.append(ADMIN_EMAIL)

    # JWT Settings
    JWT_SECRET = os.getenv("SECRET_KEY") or os.getenv("JWT_SECRET") or "skypulse_super_secret_jwt_key_2026"
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", 48))

    # CORS Settings
    CORS_ORIGINS = [
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]
