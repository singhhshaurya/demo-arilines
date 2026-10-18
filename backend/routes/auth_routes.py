import base64
import json
import logging
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from config import Config
from database import users_col
from services.auth_service import create_user_token, verify_existing_token

logger = logging.getLogger("skypulse.routes.auth")
auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/api/auth/google", methods=["POST"])
@auth_bp.route("/auth/google", methods=["POST"])
def auth_google():
    """
    Google OAuth Authentication
    ---
    tags:
      - Authentication
    security: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            token:
              type: string
            id_token:
              type: string
    responses:
      200:
        description: Authentication token and user details
    """
    data = request.get_json() or {}
    token_str = data.get("token") or data.get("id_token") or ""

    user_info = None

    # Try verifying real Google ID token
    if Config.GOOGLE_AUTH_CLIENT_ID and token_str and len(token_str) > 50:
        try:
            idinfo = id_token.verify_oauth2_token(
                token_str, google_requests.Request(), Config.GOOGLE_AUTH_CLIENT_ID
            )
            user_info = {
                "email": idinfo.get("email"),
                "name": idinfo.get("name", idinfo.get("email", "").split("@")[0]),
                "picture": idinfo.get("picture", ""),
                "google_id": idinfo.get("sub"),
            }
        except Exception as e:
            logger.info("Direct Google token verification bypassed/failed (%s), trying decoded payload", e)

    # Fallback to decode without verification for mock/demo testing
    if not user_info and token_str:
        try:
            parts = token_str.split(".")
            if len(parts) >= 2:
                padded = parts[1] + "=" * (-len(parts[1]) % 4)
                decoded = base64.urlsafe_b64decode(padded.encode()).decode()
                payload = json.loads(decoded)
                user_info = {
                    "email": payload.get("email") or "traveler@example.com",
                    "name": payload.get("name") or "SkyPulse Traveler",
                    "picture": payload.get("picture", ""),
                    "google_id": payload.get("sub", "mock-sub"),
                }
        except Exception:
            pass

    if not user_info:
        user_info = {
            "email": "traveler@skypulse.com",
            "name": "Arnesh Sharma",
            "picture": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
            "google_id": "demo-traveler-001",
        }

    email = (user_info.get("email") or "").strip().lower()
    user_info["email"] = email

    # Check database for existing user
    db_user = users_col.find_one({"email": email})

    # Determine role:
    # 1. Configured admin email or admin list
    # 2. Existing role in database (e.g. hardcoded admin)
    # 3. Default to "user"
    if email == Config.ADMIN_EMAIL or email in Config.ADMIN_EMAILS:
        role = "admin"
    elif db_user and db_user.get("role"):
        role = db_user.get("role")
    else:
        role = "user"
    user_info["role"] = role

    # Check for existing valid JWT token in database (Session Token Persistence)
    token = None
    expiry_iso = None
    if db_user and db_user.get("jwt_token"):
        token_payload = verify_existing_token(db_user.get("jwt_token"))
        if token_payload:
            token = db_user.get("jwt_token")
            expiry_iso = token_payload.get("expiry_time") or db_user.get("token_expiry")

    # If not present or expired, create new JWT token with required fields
    if not token:
        token, expiry_iso = create_user_token(user_info.get("name"), email, role)

    # Save/update user in database
    users_col.update_one(
        {"email": email},
        {
            "$set": {
                **user_info,
                "role": role,
                "jwt_token": token,
                "token_expiry": expiry_iso,
                "last_login": datetime.now(timezone.utc),
            },
            "$setOnInsert": {
                "created_at": datetime.now(timezone.utc),
            },
        },
        upsert=True,
    )

    return jsonify({
        "token": token,
        "user": {
            **user_info,
            "expiry_time": expiry_iso,
        },
    })


@auth_bp.route("/api/dev", methods=["GET"])
@auth_bp.route("/dev", methods=["GET"])
def dev_user_lookup():
    """
    Developer Testing Endpoint (GET only)
    ---
    tags:
      - Developer
    parameters:
      - name: email
        in: query
        type: string
        required: true
        description: User email to retrieve JWT token, name, and role for testing
    security: []
    responses:
      200:
        description: User profile, role, and corresponding JWT token
      400:
        description: Missing email parameter
      404:
        description: User not found in database
    """
    email = request.args.get("email")

    if not email or not str(email).strip():
        return jsonify({
            "error": "Email parameter is required. Provide ?email=user@example.com (GET only)."
        }), 400

    email_clean = str(email).strip().lower()
    user_doc = users_col.find_one({"email": {"$regex": f"^{email_clean}$", "$options": "i"}})
    if not user_doc:
        return jsonify({
            "error": f"User with email '{email}' not found in database.",
            "email": email,
            "found": False,
        }), 404

    # Determine role: check admin email list or role stored in DB
    if email_clean == Config.ADMIN_EMAIL or email_clean in Config.ADMIN_EMAILS:
        role = "admin"
    else:
        role = user_doc.get("role", "user")

    name = user_doc.get("name") or "Traveler"

    # Check for existing valid JWT token
    token = user_doc.get("jwt_token")
    token_payload = verify_existing_token(token)
    expiry_iso = user_doc.get("token_expiry")

    # If missing or expired, generate and persist one
    if not token or not token_payload:
        token, expiry_iso = create_user_token(name, user_doc.get("email"), role)
        users_col.update_one(
            {"_id": user_doc["_id"]},
            {
                "$set": {
                    "role": role,
                    "jwt_token": token,
                    "token_expiry": expiry_iso,
                    "updated_at": datetime.now(timezone.utc),
                }
            }
        )
    else:
        expiry_iso = token_payload.get("expiry_time") or expiry_iso

    return jsonify({
        "success": True,
        "name": name,
        "email": user_doc.get("email"),
        "role": role,
        "jwt_token": token,
        "expiry_time": expiry_iso,
    })
