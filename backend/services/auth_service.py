import logging
from datetime import datetime, timezone, timedelta
from flask import request
import jwt
from config import Config
from database import users_col

logger = logging.getLogger("skypulse.auth")


def create_user_token(name, email, role):
    """
    Generates a JWT token with required fields:
    name, email, role, expiry_time (ISO string), plus standard exp and iat.
    """
    duration_hours = getattr(Config, "JWT_EXPIRATION_HOURS", 48)
    expiry = datetime.now(timezone.utc) + timedelta(hours=duration_hours)
    expiry_iso = expiry.isoformat()
    payload = {
        "name": name or "Traveler",
        "email": (email or "").strip().lower(),
        "role": role or "user",
        "expiry_time": expiry_iso,
        "exp": int(expiry.timestamp()),
        "iat": int(datetime.now(timezone.utc).timestamp()),
    }
    token = jwt.encode(payload, Config.JWT_SECRET, algorithm="HS256")
    return token, expiry_iso


def verify_existing_token(token):
    """Verifies if an existing JWT token is valid and unexpired. Returns decoded payload or None."""
    if not token or not isinstance(token, str):
        return None
    try:
        payload = jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])
        return payload
    except Exception:
        return None


def get_current_user_from_header():
    """Extracts and verifies user information from Bearer JWT in Authorization header if present."""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None
    token = auth_header.strip()
    if token.lower().startswith("bearer "):
        token = token[7:].strip()
    return verify_existing_token(token)


def check_admin_access():
    """
    Verifies that the current requester has admin role either via JWT payload
    or by record in the MongoDB users collection.
    """
    user = get_current_user_from_header()
    if not user:
        return False

    # 1. Check role in JWT payload
    if user.get("role") == "admin":
        return True

    email = (user.get("email") or "").strip().lower()
    if not email:
        return False

    # 2. Check hardcoded admin email list / configured admin
    if email == Config.ADMIN_EMAIL or email in Config.ADMIN_EMAILS:
        return True

    # 3. Check MongoDB users collection for role: "admin"
    db_user = users_col.find_one({"email": email})
    if db_user and db_user.get("role") == "admin":
        return True

    return False
