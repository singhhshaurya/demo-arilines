from datetime import datetime, timezone
from flask import Blueprint, jsonify
from config import Config
from database import is_connected, flights_col, bookings_col, passengers_col, payments_col

system_bp = Blueprint("system", __name__)


@system_bp.route("/api/health", methods=["GET"])
@system_bp.route("/health", methods=["GET"])
def health_check():
    """
    Health Check Endpoint (Unauthenticated)
    ---
    tags:
      - System
    security: []
    responses:
      200:
        description: System health status and normalized collection counts
    """
    return jsonify({
        "status": "healthy",
        "service": "SkyPulse Airlines Demo API",
        "database_connected": is_connected(),
        "database_name": Config.DATABASE_NAME,
        "flights_count": flights_col.count_documents({}),
        "bookings_count": bookings_col.count_documents({}),
        "passengers_count": passengers_col.count_documents({}),
        "payments_count": payments_col.count_documents({}),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
