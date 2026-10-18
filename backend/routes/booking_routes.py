from flask import Blueprint, request, jsonify
from services.auth_service import get_current_user_from_header
from services.booking_service import (
    create_booking_record,
    cancel_booking_record,
    get_booking_by_pnr_record,
    get_user_bookings,
)

booking_bp = Blueprint("bookings", __name__)


@booking_bp.route("/api/bookings", methods=["POST"])
@booking_bp.route("/bookings", methods=["POST"])
def create_booking_endpoint():
    """
    Create New Flight Booking (Guest or Authenticated)
    ---
    tags:
      - Bookings
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
            passenger:
              type: object
              properties:
                name:
                  type: string
                email:
                  type: string
                phone:
                  type: string
                age:
                  type: integer
                gender:
                  type: string
            class:
              type: string
            fare:
              type: object
    responses:
      201:
        description: Booking created with PNR and relational references
    """
    data = request.get_json() or {}
    user = get_current_user_from_header()

    pnr, populated_booking = create_booking_record(data, user)

    return jsonify({
        "success": True,
        "pnr": pnr,
        "booking": populated_booking,
        "message": "Flight booked successfully!",
    }), 201


@booking_bp.route("/api/bookings/pnr/<pnr>", methods=["GET"])
@booking_bp.route("/bookings/pnr/<pnr>", methods=["GET"])
def get_booking_by_pnr_endpoint(pnr):
    """
    Retrieve Booking by PNR (Populated Relational Entities)
    ---
    tags:
      - Bookings
    security: []
    parameters:
      - name: pnr
        in: path
        type: string
        required: true
        description: 6-character Booking PNR
    responses:
      200:
        description: Booking details and cancellation refund preview
      404:
        description: Booking not found
    """
    booking, refund_preview = get_booking_by_pnr_record(pnr)

    if not booking:
        return jsonify({"error": f"Booking with PNR '{pnr}' not found."}), 404

    return jsonify({
        "booking": booking,
        "refund_preview": refund_preview,
    })


@booking_bp.route("/api/bookings/pnr/<pnr>/cancel", methods=["POST"])
@booking_bp.route("/bookings/pnr/<pnr>/cancel", methods=["POST"])
def cancel_booking_endpoint(pnr):
    """
    Cancel Booking & Calculate Refund (Strict Ownership Required)
    ---
    tags:
      - Bookings
    security:
      - Bearer: []
    parameters:
      - name: pnr
        in: path
        type: string
        required: true
        description: 6-character Booking PNR
    responses:
      200:
        description: Cancellation confirmed with refund receipt
      401:
        description: Authentication required to cancel this account booking
      403:
        description: Forbidden - Not authorized to cancel this booking
      404:
        description: Booking not found
    """
    current_user = get_current_user_from_header()
    data = request.get_json(silent=True) or {}
    provided_email = (data.get("email") or request.args.get("email") or "").strip().lower()

    result = cancel_booking_record(pnr, current_user, provided_email)
    status_code = result.pop("status_code", 200)

    return jsonify(result), status_code


@booking_bp.route("/api/bookings/my", methods=["GET"])
@booking_bp.route("/bookings/my", methods=["GET"])
def get_my_bookings_endpoint():
    """
    Get Current User's Bookings
    ---
    tags:
      - Bookings
    security:
      - Bearer: []
    responses:
      200:
        description: List of user bookings
    """
    user = get_current_user_from_header()
    user_email = user.get("email") if user else None

    bookings = get_user_bookings(user_email)
    return jsonify({
        "bookings": bookings,
        "count": len(bookings),
    })
