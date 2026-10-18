import logging
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from config import Config
from database import flights_col, serialize, to_object_id
from seed import seed_database
from services.auth_service import get_current_user_from_header, check_admin_access
from services.booking_service import get_all_system_bookings
from services.flight_service import (
    get_flight_by_identifier,
    create_flight_record,
    update_flight_record,
    delete_flight_record,
    delay_flight_record,
)

logger = logging.getLogger("skypulse.routes.admin")
admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/api/admin/check", methods=["GET"])
@admin_bp.route("/admin/check", methods=["GET"])
def admin_check():
    """
    Admin: Check current user authorization
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    responses:
      200:
        description: Authorization status
    """
    user = get_current_user_from_header()
    authorized = check_admin_access()
    return jsonify({
        "authorized": authorized,
        "email": user.get("email") if user else None,
        "role": user.get("role") if user else None,
        "required_admin_email": Config.ADMIN_EMAIL,
    })


@admin_bp.route("/api/admin/flights", methods=["GET"])
@admin_bp.route("/admin/flights", methods=["GET"])
def admin_get_flights():
    """
    Admin: List All Flights
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    responses:
      200:
        description: List of flights
      403:
        description: Unauthorized
    """
    if not check_admin_access():
        return jsonify({"error": "Forbidden: Administrator privileges required."}), 403

    flights = list(flights_col.find({}).sort("flight_number", 1))
    from services.flight_service import normalize_flight
    return jsonify({
        "flights": [normalize_flight(f) for f in flights],
        "count": len(flights),
    })


@admin_bp.route("/api/admin/flights/<flight_id>", methods=["GET"])
@admin_bp.route("/admin/flights/<flight_id>", methods=["GET"])
def admin_get_single_flight(flight_id):
    """
    Admin: View Single Flight Details
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    parameters:
      - name: flight_id
        in: path
        type: string
        required: true
    responses:
      200:
        description: Flight details
      403:
        description: Unauthorized
      404:
        description: Flight not found
    """
    if not check_admin_access():
        return jsonify({"error": "Forbidden: Administrator privileges required."}), 403

    flight = get_flight_by_identifier(flight_id)
    if not flight:
        return jsonify({"error": f"Flight '{flight_id}' not found."}), 404

    return jsonify({"flight": flight})


@admin_bp.route("/api/admin/flights", methods=["POST"])
@admin_bp.route("/admin/flights", methods=["POST"])
def admin_add_flight():
    """
    Admin: Create New Flight
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            flight_id:
              type: string
            airline:
              type: string
            origin:
              type: string
            destination:
              type: string
            departure_time:
              type: string
            arrival_time:
              type: string
            price:
              type: number
            aircraft:
              type: string
            cancellation_policy:
              type: string
    responses:
      201:
        description: Flight created
      403:
        description: Unauthorized
    """
    if not check_admin_access():
        return jsonify({"error": "Forbidden: Administrator privileges required."}), 403

    data = request.get_json() or {}
    created_flight = create_flight_record(data)

    logger.info("Admin created new flight: %s (%s)", created_flight.get("flight_number"), created_flight.get("_id"))
    return jsonify({
        "success": True,
        "flight": created_flight,
        "message": f"Flight '{created_flight.get('flight_number')}' created successfully!",
    }), 201


@admin_bp.route("/api/admin/flights/<flight_id>", methods=["PUT"])
@admin_bp.route("/admin/flights/<flight_id>", methods=["PUT"])
def admin_modify_flight(flight_id):
    """
    Admin: Modify Existing Flight Details
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    parameters:
      - name: flight_id
        in: path
        type: string
        required: true
      - in: body
        name: body
        required: true
    responses:
      200:
        description: Flight modified successfully
      403:
        description: Unauthorized
      404:
        description: Flight not found
    """
    if not check_admin_access():
        return jsonify({"error": "Forbidden: Administrator privileges required."}), 403

    data = request.get_json() or {}
    updated = update_flight_record(flight_id, data)
    if not updated:
        return jsonify({"error": f"Flight '{flight_id}' not found."}), 404

    logger.info("Admin modified flight: %s", flight_id)
    return jsonify({
        "success": True,
        "flight": updated,
        "message": f"Flight '{flight_id}' modified successfully!",
    })


@admin_bp.route("/api/admin/flights/<flight_id>", methods=["DELETE"])
@admin_bp.route("/admin/flights/<flight_id>", methods=["DELETE"])
def admin_delete_flight(flight_id):
    """
    Admin: Delete Flight
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    parameters:
      - name: flight_id
        in: path
        type: string
        required: true
    responses:
      200:
        description: Flight deleted successfully
      403:
        description: Unauthorized
      404:
        description: Flight not found
    """
    if not check_admin_access():
        return jsonify({"error": "Forbidden: Administrator privileges required."}), 403

    success = delete_flight_record(flight_id)
    if not success:
        return jsonify({"error": f"Flight '{flight_id}' not found or could not be deleted."}), 404

    logger.info("Admin deleted flight: %s", flight_id)
    return jsonify({
        "success": True,
        "message": f"Flight '{flight_id}' deleted successfully from system schedule.",
    })


@admin_bp.route("/api/admin/flights/<flight_id>/schedule", methods=["PUT"])
@admin_bp.route("/admin/flights/<flight_id>/schedule", methods=["PUT"])
def admin_maintain_schedule(flight_id):
    """
    Admin: Maintain Flight Schedule (Places & Times)
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    parameters:
      - name: flight_id
        in: path
        type: string
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            origin:
              type: string
            origin_city:
              type: string
            origin_terminal:
              type: string
            destination:
              type: string
            destination_city:
              type: string
            destination_terminal:
              type: string
            departure_time:
              type: string
            arrival_time:
              type: string
            duration:
              type: string
            date:
              type: string
    responses:
      200:
        description: Schedule updated
      403:
        description: Unauthorized
      404:
        description: Flight not found
    """
    if not check_admin_access():
        return jsonify({"error": "Forbidden: Administrator privileges required."}), 403

    data = request.get_json() or {}
    schedule_data = {
        "origin": (data.get("origin") or "").strip().upper() if data.get("origin") else None,
        "origin_code": (data.get("origin") or "").strip().upper() if data.get("origin") else None,
        "origin_city": data.get("origin_city"),
        "origin_terminal": data.get("origin_terminal"),
        "destination": (data.get("destination") or "").strip().upper() if data.get("destination") else None,
        "destination_code": (data.get("destination") or "").strip().upper() if data.get("destination") else None,
        "destination_city": data.get("destination_city"),
        "destination_terminal": data.get("destination_terminal"),
        "departure_time": data.get("departure_time"),
        "arrival_time": data.get("arrival_time"),
        "duration": data.get("duration"),
        "date": data.get("date"),
    }
    # Filter out None values
    clean_schedule = {k: v for k, v in schedule_data.items() if v is not None}

    updated = update_flight_record(flight_id, clean_schedule)
    if not updated:
        return jsonify({"error": f"Flight '{flight_id}' not found."}), 404

    logger.info("Admin updated schedule for flight: %s", flight_id)
    return jsonify({
        "success": True,
        "flight": updated,
        "message": f"Schedule for flight '{flight_id}' updated successfully!",
    })


@admin_bp.route("/api/admin/flights/<flight_id>/delay", methods=["PUT"])
@admin_bp.route("/admin/flights/<flight_id>/delay", methods=["PUT"])
def admin_delay_flight_custom(flight_id):
    """
    Admin: Delay Flight Input (Arrival/Departure Delays with Disruption Note)
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    parameters:
      - name: flight_id
        in: path
        type: string
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            delay_minutes:
              type: integer
            departure_delay_minutes:
              type: integer
            arrival_delay_minutes:
              type: integer
            reason:
              type: string
            status:
              type: string
    responses:
      200:
        description: Flight delay recorded
      403:
        description: Unauthorized
      404:
        description: Flight not found
    """
    if not check_admin_access():
        return jsonify({"error": "Forbidden: Administrator privileges required."}), 403

    data = request.get_json() or {}
    delay_minutes = int(data.get("delay_minutes", 0))
    dep_delay = int(data.get("departure_delay_minutes", delay_minutes))
    arr_delay = int(data.get("arrival_delay_minutes", delay_minutes))
    reason = data.get("reason")
    status = data.get("status", "DELAYED" if delay_minutes > 0 or dep_delay > 0 or arr_delay > 0 else "ON_TIME")

    updated = delay_flight_record(flight_id, delay_minutes, dep_delay, arr_delay, reason, status)
    if not updated:
        return jsonify({"error": f"Flight '{flight_id}' not found."}), 404

    logger.info(
        "Admin applied delay to %s: %dm dep / %dm arr, reason: %s",
        flight_id, dep_delay, arr_delay, reason
    )
    return jsonify({
        "success": True,
        "flight": updated,
        "message": f"Delay applied to '{flight_id}': +{dep_delay}m departure / +{arr_delay}m arrival.",
    })


@admin_bp.route("/api/admin/flights/<flight_id>/status", methods=["PUT"])
@admin_bp.route("/admin/flights/<flight_id>/status", methods=["PUT"])
def admin_update_flight_status(flight_id):
    """
    Admin: Flight Delay / Cancellation Simulator (Legacy Quick Action)
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    """
    if not check_admin_access():
        return jsonify({"error": "Forbidden: Administrator privileges required."}), 403

    data = request.get_json() or {}
    new_status = data.get("status", "ON_TIME").upper()
    delay_minutes = int(data.get("delay_minutes", 0))
    reason = data.get("reason")

    updated = delay_flight_record(flight_id, delay_minutes, delay_minutes, delay_minutes, reason, new_status)
    if not updated:
        return jsonify({"error": "Flight not found"}), 404

    return jsonify({
        "success": True,
        "message": f"Flight status updated to {new_status}",
        "flight": updated,
    })


@admin_bp.route("/api/admin/bookings", methods=["GET"])
@admin_bp.route("/admin/bookings", methods=["GET"])
def admin_get_bookings():
    """
    Admin: View All System Bookings (Populated Relational Entities)
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    """
    if not check_admin_access():
        return jsonify({"error": "Forbidden: Administrator privileges required."}), 403

    bookings = get_all_system_bookings()
    return jsonify({
        "bookings": bookings,
        "count": len(bookings),
    })


@admin_bp.route("/api/admin/seed", methods=["POST"])
@admin_bp.route("/admin/seed", methods=["POST"])
def admin_reset_seed():
    """
    Admin: Reset & Re-seed Flights & Policies
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    """
    if not check_admin_access():
        return jsonify({"error": "Forbidden: Administrator privileges required."}), 403

    seed_database(force=True)
    return jsonify({"success": True, "message": "Database successfully re-seeded with demo flights."})
