from flask import Blueprint, request, jsonify
from services.flight_service import (
    search_flights,
    get_flight_by_identifier,
    view_flight_status,
)

flight_bp = Blueprint("flights", __name__)


@flight_bp.route("/api/flights/search", methods=["GET"])
@flight_bp.route("/flights/search", methods=["GET"])
def flight_search_endpoint():
    """
    Search Flights
    ---
    tags:
      - Flights
    security: []
    parameters:
      - name: origin
        in: query
        type: string
        description: Origin airport code (e.g. DEL)
      - name: destination
        in: query
        type: string
        description: Destination airport code (e.g. BOM)
      - name: date
        in: query
        type: string
        description: Departure date (YYYY-MM-DD)
      - name: passengers
        in: query
        type: integer
      - name: class
        in: query
        type: string
    responses:
      200:
        description: List of matching flights
    """
    origin = request.args.get("origin", "").strip()
    destination = request.args.get("destination", "").strip()
    date = request.args.get("date", "").strip()

    results = search_flights(origin, destination, date)

    return jsonify({
        "flights": results,
        "count": len(results),
        "search": {
            "origin": origin,
            "destination": destination,
            "date": date,
        },
    })


@flight_bp.route("/api/flights/view", methods=["GET"])
@flight_bp.route("/flights/view", methods=["GET"])
@flight_bp.route("/api/flights/status", methods=["GET"])
@flight_bp.route("/flights/status", methods=["GET"])
def view_flight_endpoint():
    """
    User View Flight Status (Unauthenticated - No JWT required)
    ---
    tags:
      - Flights
    security: []
    parameters:
      - name: flight_id
        in: query
        type: string
        required: true
        description: Flight number or Flight ID (e.g. AI-805, SP-804)
      - name: date
        in: query
        type: string
        required: false
        description: Scheduled departure date (YYYY-MM-DD)
      - name: origin
        in: query
        type: string
        required: false
        description: Departure place/airport code (e.g. DEL, New Delhi)
    responses:
      200:
        description: Live flight status, schedule, and delay information
      400:
        description: Missing flight_id parameter
      404:
        description: Flight not found
    """
    flight_id = (
        request.args.get("flight_id")
        or request.args.get("id")
        or request.args.get("flight_number")
        or ""
    ).strip()
    date = request.args.get("date", "").strip()
    origin = (
        request.args.get("origin")
        or request.args.get("departure_place")
        or request.args.get("origin_city")
        or ""
    ).strip()

    if not flight_id:
        return jsonify({
            "error": "Flight ID or Flight Number is required to view flight status.",
            "success": False,
        }), 400

    flight = view_flight_status(flight_id, date, origin)
    if not flight:
        return jsonify({
            "error": f"Flight '{flight_id}' not found for the specified departure criteria.",
            "flight_id": flight_id,
            "date": date,
            "origin": origin,
            "success": False,
        }), 404

    return jsonify({
        "success": True,
        "flight": flight,
        "status": flight.get("status", "ON_TIME"),
        "is_delayed": flight.get("status") == "DELAYED",
        "delay_minutes": flight.get("delay_minutes", 0),
        "departure_delay_minutes": flight.get("departure_delay_minutes", 0),
        "arrival_delay_minutes": flight.get("arrival_delay_minutes", 0),
        "estimated_departure_time": flight.get("estimated_departure_time"),
        "estimated_arrival_time": flight.get("estimated_arrival_time"),
        "disruption_note": flight.get("disruption_note"),
    })


@flight_bp.route("/api/flights/<flight_id>", methods=["GET"])
@flight_bp.route("/flights/<flight_id>", methods=["GET"])
def flight_detail_endpoint(flight_id):
    """
    Get Single Flight Details
    ---
    tags:
      - Flights
    security: []
    parameters:
      - name: flight_id
        in: path
        type: string
        required: true
    responses:
      200:
        description: Flight details
      404:
        description: Flight not found
    """
    flight = get_flight_by_identifier(flight_id)
    if not flight:
        return jsonify({"error": "Flight not found"}), 404

    return jsonify({"flight": flight})
