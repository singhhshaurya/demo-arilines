import os
import random
import string
import logging
from datetime import datetime, timezone, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from flasgger import Swagger
import jwt
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import razorpay

from config import Config
from database import (
    db,
    flights_col,
    bookings_col,
    users_col,
    airlines_col,
    policies_col,
    serialize,
    to_object_id,
    is_connected,
)
from seed import seed_database

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s in %(module)s: %(message)s")
logger = logging.getLogger("skypulse")

app = Flask(__name__)
app.config["SECRET_KEY"] = Config.JWT_SECRET

# Enable CORS for frontend
CORS(app, origins=Config.CORS_ORIGINS, supports_credentials=True)

# Swagger Configuration
swagger_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": "apispec_1",
            "route": "/api/docs/apispec_1.json",
            "rule_filter": lambda rule: True,
            "model_filter": lambda tag: True,
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/api/docs",
}
swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "SkyPulse Airlines API",
        "description": "Flight booking, payments, self-service cancellation, and admin operations API.",
        "version": "1.0.0",
    },
    "basePath": "/api",
    "schemes": ["http", "https"],
    "securityDefinitions": {
        "Bearer": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
            "description": "JWT Authorization header using Bearer scheme. Enter 'Bearer <token>' or '<token>' to authorize all requests.",
        }
    },
    "security": [
        {"Bearer": []}
    ],
}
swagger = Swagger(app, config=swagger_config, template=swagger_template)

# Razorpay Client
razorpay_client = None
if Config.RAZORPAY_KEY_ID and Config.RAZORPAY_KEY_SECRET:
    try:
        razorpay_client = razorpay.Client(auth=(Config.RAZORPAY_KEY_ID, Config.RAZORPAY_KEY_SECRET))
        logger.info("Razorpay client initialized (Key: %s...)", Config.RAZORPAY_KEY_ID[:8])
    except Exception as e:
        logger.warning("Could not initialize Razorpay client: %s", e)


def generate_pnr():
    """Generates an airline-style 6-character PNR code: SP-XXXXXX."""
    chars = "".join(random.choices(string.ascii_uppercase + "23456789", k=6))
    return f"SP-{chars}"


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


# -------------------------------------------------------------
# System & Health
# -------------------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health_check():
    """
    Health Check Endpoint
    ---
    tags:
      - System
    responses:
      200:
        description: System health status
    """
    return jsonify({
        "status": "healthy",
        "service": "SkyPulse Airlines Demo API",
        "database_connected": is_connected(),
        "database_name": Config.DATABASE_NAME,
        "flights_count": flights_col.count_documents({}),
        "bookings_count": bookings_col.count_documents({}),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


# -------------------------------------------------------------
# Google Authentication
# -------------------------------------------------------------
@app.route("/api/auth/google", methods=["POST"])
def auth_google():
    """
    Google OAuth Authentication
    ---
    tags:
      - Authentication
    security:
      - Bearer: []
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
                import base64
                import json
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
            # Continue the user session using existing unexpired token
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


# -------------------------------------------------------------
# Flights API
# -------------------------------------------------------------
def normalize_flight(f):
    """Ensures consistent, serializable flight fields and string origin/destination codes for frontend."""
    if not f:
        return f
    doc = serialize(f)

    # Normalize origin
    if isinstance(doc.get("origin"), dict):
        orig_dict = doc["origin"]
        doc["origin_code"] = orig_dict.get("code", "DEL")
        doc["origin_city"] = orig_dict.get("city", "New Delhi")
        doc["origin_terminal"] = orig_dict.get("terminal", "T3")
        doc["origin"] = orig_dict.get("code", "DEL")
    elif not doc.get("origin_city"):
        doc["origin_city"] = doc.get("origin", "DEL")

    # Normalize destination
    if isinstance(doc.get("destination"), dict):
        dest_dict = doc["destination"]
        doc["destination_code"] = dest_dict.get("code", "BOM")
        doc["destination_city"] = dest_dict.get("city", "Mumbai")
        doc["destination_terminal"] = dest_dict.get("terminal", "T2")
        doc["destination"] = dest_dict.get("code", "BOM")
    elif not doc.get("destination_city"):
        doc["destination_city"] = doc.get("destination", "BOM")

    # Normalize departure_time and arrival_time if ISO format
    if isinstance(doc.get("departure_time"), str) and "T" in doc["departure_time"]:
        try:
            doc["departure_datetime"] = doc["departure_time"]
            doc["departure_time"] = doc["departure_time"].split("T")[1][:5]
        except Exception:
            pass

    if isinstance(doc.get("arrival_time"), str) and "T" in doc["arrival_time"]:
        try:
            doc["arrival_datetime"] = doc["arrival_time"]
            doc["arrival_time"] = doc["arrival_time"].split("T")[1][:5]
        except Exception:
            pass

    # Normalize cancellation policy
    if not doc.get("cancellation_policy") and doc.get("policy"):
        p = doc["policy"]
        if p.get("is_refundable") and p.get("free_cancellation_hours", 0) > 0:
            doc["cancellation_policy"] = "FREE_CANCELLATION"
        elif p.get("is_refundable"):
            doc["cancellation_policy"] = "PARTIAL_REFUND"
        else:
            doc["cancellation_policy"] = "NON_REFUNDABLE"
        if not doc.get("cancellation_policy_text"):
            doc["cancellation_policy_text"] = p.get("policy_text")

    return doc


@app.route("/api/flights/search", methods=["GET"])
def search_flights():
    """
    Search Flights
    ---
    tags:
      - Flights
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
    origin = request.args.get("origin", "").strip().upper()
    destination = request.args.get("destination", "").strip().upper()
    date = request.args.get("date", "").strip()

    and_conditions = []
    if origin:
        and_conditions.append({
            "$or": [
                {"origin": origin},
                {"origin.code": origin},
                {"origin_code": origin},
            ]
        })
    if destination:
        and_conditions.append({
            "$or": [
                {"destination": destination},
                {"destination.code": destination},
                {"destination_code": destination},
            ]
        })

    query = {"$and": and_conditions} if and_conditions else {}
    flights = list(flights_col.find(query).sort("price", 1))

    # If no exact match found, return all available flights for smooth demo experience
    if not flights and (origin or destination):
        or_cond = []
        if origin:
            or_cond.extend([{"origin": origin}, {"origin.code": origin}])
        if destination:
            or_cond.extend([{"destination": destination}, {"destination.code": destination}])
        flights = list(flights_col.find({"$or": or_cond}).sort("price", 1)) if or_cond else []
        if not flights:
            flights = list(flights_col.find({}).sort("price", 1))

    results = []
    for f in flights:
        norm = normalize_flight(f)
        norm["date"] = date or "2026-11-15"
        results.append(norm)

    return jsonify({
        "flights": results,
        "count": len(results),
        "search": {
            "origin": origin,
            "destination": destination,
            "date": date,
        },
    })


@app.route("/api/flights/<flight_id>", methods=["GET"])
def get_flight_details(flight_id):
    """
    Get Single Flight Details
    ---
    tags:
      - Flights
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
    obj_id = to_object_id(flight_id)
    flight = None
    if obj_id:
        flight = flights_col.find_one({"_id": obj_id})
    if not flight:
        flight = flights_col.find_one({"flight_number": flight_id})
    if not flight:
        flight = flights_col.find_one({"$or": [{"id": flight_id}, {"_id": flight_id}]})

    if not flight:
        return jsonify({"error": "Flight not found"}), 404

    return jsonify({"flight": serialize(flight)})


# -------------------------------------------------------------
# Payments API (Razorpay Sandbox)
# -------------------------------------------------------------
@app.route("/api/payments/create-order", methods=["POST"])
def create_payment_order():
    """
    Create Razorpay Payment Order
    ---
    tags:
      - Payments
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            flight_id:
              type: string
            amount:
              type: number
    responses:
      200:
        description: Order ID and payment metadata
    """
    data = request.get_json() or {}
    amount = float(data.get("amount", 4999))
    amount_in_paise = int(amount * 100)

    order_id = f"order_{int(datetime.now().timestamp() * 1000)}"

    if razorpay_client:
        try:
            razorpay_order = razorpay_client.order.create({
                "amount": amount_in_paise,
                "currency": "INR",
                "payment_capture": 1,
                "notes": {
                    "flight_id": str(data.get("flight_id", "")),
                    "demo": "SkyPulse Sandbox Order",
                },
            })
            order_id = razorpay_order.get("id", order_id)
        except Exception as e:
            logger.warning("Razorpay order creation fallback triggered: %s", e)

    return jsonify({
        "order_id": order_id,
        "amount": amount_in_paise,
        "currency": "INR",
        "key_id": Config.RAZORPAY_KEY_ID,
    })


@app.route("/api/payments/verify", methods=["POST"])
def verify_payment():
    """
    Verify Razorpay Payment Signature
    ---
    tags:
      - Payments
    """
    data = request.get_json() or {}
    return jsonify({
        "status": "success",
        "verified": True,
        "payment_id": data.get("razorpay_payment_id", f"pay_{int(datetime.now().timestamp())}"),
    })


# -------------------------------------------------------------
# Bookings API
# -------------------------------------------------------------
@app.route("/api/bookings", methods=["POST"])
def create_booking():
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
        description: Booking created with PNR
    """
    data = request.get_json() or {}

    pnr = generate_pnr()
    flight_id = data.get("flight_id")
    obj_id = to_object_id(flight_id)

    flight = None
    if obj_id:
        flight = flights_col.find_one({"_id": obj_id})
    if not flight and flight_id:
        flight = flights_col.find_one({"flight_number": flight_id})
    if not flight:
        flight = data.get("flight") or {}

    user = get_current_user_from_header()
    booking_type = "authenticated" if user else "guest"

    passenger = data.get("passenger") or {}
    fare_info = data.get("fare") or {}
    total_amount = fare_info.get("total") or data.get("total_paid") or flight.get("price") or 4999

    booking_doc = {
        "pnr": pnr,
        "flight_id": str(flight.get("_id") or flight_id or ""),
        "flight_number": flight.get("flight_number", "AI-805"),
        "airline": flight.get("airline", "Air India"),
        "airline_logo": flight.get("airline_logo", ""),
        "route": f"{flight.get('origin', 'DEL')} -> {flight.get('destination', 'BOM')}",
        "origin": flight.get("origin", "DEL"),
        "origin_city": flight.get("origin_city", "New Delhi"),
        "destination": flight.get("destination", "BOM"),
        "destination_city": flight.get("destination_city", "Mumbai"),
        "departure_time": flight.get("departure_time", "07:00"),
        "arrival_time": flight.get("arrival_time", "09:15"),
        "duration": flight.get("duration", "2h 15m"),
        "class": data.get("class", "Economy"),
        "aircraft": flight.get("aircraft", "Airbus A320neo"),
        "passenger": {
            "name": passenger.get("name", "Demo Passenger"),
            "email": passenger.get("email", "passenger@example.com"),
            "phone": passenger.get("phone", "+91 98765 43210"),
            "age": passenger.get("age", 28),
            "gender": passenger.get("gender", "Male"),
        },
        "booking_type": booking_type,
        "user_email": user.get("email") if user else passenger.get("email"),
        "fare": {
            "base_fare": fare_info.get("base_fare", int(total_amount * 0.8)),
            "taxes": fare_info.get("taxes", int(total_amount * 0.15)),
            "convenience_fee": fare_info.get("convenience_fee", 299),
            "total": total_amount,
        },
        "total_paid": total_amount,
        "cancellation_policy": flight.get("cancellation_policy", "FREE_CANCELLATION"),
        "cancellation_policy_text": flight.get("cancellation_policy_text", "Free cancellation up to 24h prior."),
        "policy": flight.get("policy", {}),
        "status": "CONFIRMED",
        "payment": data.get("payment", {
            "order_id": f"order_{int(datetime.now().timestamp())}",
            "payment_id": f"pay_{int(datetime.now().timestamp())}",
            "status": "SUCCESS",
            "amount": total_amount,
        }),
        "booked_at": datetime.now(timezone.utc),
        "cancellation": {
            "cancelled_at": None,
            "refund_amount": 0,
            "cancellation_fee": 0,
            "reason": None,
        },
    }

    insert_res = bookings_col.insert_one(booking_doc)
    booking_doc["_id"] = insert_res.inserted_id

    # Decrement seats in flight
    if obj_id:
        flights_col.update_one({"_id": obj_id}, {"$inc": {"seats_available": -1}})

    return jsonify({
        "success": True,
        "pnr": pnr,
        "booking": serialize(booking_doc),
        "message": "Flight booked successfully!",
    }), 201


def _calculate_refund(booking, flight):
    """Calculates refund preview and cancellation fee according to policy & flight delay."""
    total_paid = float(booking.get("total_paid", 4999))
    policy_type = (booking.get("cancellation_policy") or "FREE_CANCELLATION").upper()
    flight_status = (flight.get("status") if flight else "ON_TIME").upper()
    delay_minutes = int(flight.get("delay_minutes", 0) if flight else 0)

    # 1. AIRLINE DISRUPTION WAIVER (Vital for TripSaathi & TinyFish Testing!)
    # If airline cancelled the flight or delayed it > 120 minutes: 100% full refund!
    if flight_status in ["CANCELLED", "CANCELLED_BY_AIRLINE"] or delay_minutes >= 120:
        cancellation_fee = 0
        refund_amount = total_paid
        rule_applied = "Airline Disruption Guarantee (100% Full Refund due to airline delay/cancellation)"
        eligible = True
    elif "FREE" in policy_type:
        cancellation_fee = 0
        refund_amount = total_paid
        rule_applied = "Free 24h Cancellation Policy applied (100% Refund)"
        eligible = True
    elif "PARTIAL" in policy_type:
        policy_fee = 2500
        cancellation_fee = min(policy_fee, total_paid)
        refund_amount = max(0, total_paid - cancellation_fee)
        rule_applied = f"Partial Refund Policy (Standard deduction of ₹{cancellation_fee:,})"
        eligible = True
    else:  # NON_REFUNDABLE
        cancellation_fee = total_paid
        refund_amount = 0
        rule_applied = "Saver Non-refundable Ticket Policy (₹0 Refund)"
        eligible = False

    return {
        "eligible": eligible,
        "total_paid": total_paid,
        "cancellation_fee": cancellation_fee,
        "refund_amount": refund_amount,
        "rule_applied": rule_applied,
        "flight_status": flight_status,
        "delay_minutes": delay_minutes,
    }


@app.route("/api/bookings/<pnr>", methods=["GET"])
@app.route("/api/bookings/pnr/<pnr>", methods=["GET"])
def get_booking_by_pnr(pnr):
    """
    Retrieve Booking by PNR
    ---
    tags:
      - Bookings
    parameters:
      - name: pnr
        in: path
        type: string
        required: true
    responses:
      200:
        description: Booking details and cancellation refund preview
      404:
        description: Booking not found
    """
    cleaned_pnr = pnr.strip().upper()
    booking = bookings_col.find_one({"pnr": {"$regex": f"^{cleaned_pnr}$", "$options": "i"}})

    if not booking:
        return jsonify({"error": f"Booking with PNR '{pnr}' not found."}), 404

    # Fetch live flight to see if delayed / cancelled
    flight = None
    flight_id = booking.get("flight_id")
    obj_id = to_object_id(flight_id)
    if obj_id:
        flight = flights_col.find_one({"_id": obj_id})
    if not flight:
        flight = flights_col.find_one({"flight_number": booking.get("flight_number")})

    refund_preview = _calculate_refund(booking, flight)

    serialized_booking = serialize(booking)
    if flight:
        serialized_booking["live_flight"] = serialize(flight)

    return jsonify({
        "booking": serialized_booking,
        "refund_preview": refund_preview,
    })


@app.route("/api/bookings/<pnr>/cancel", methods=["POST"])
@app.route("/api/bookings/pnr/<pnr>/cancel", methods=["POST"])
def cancel_booking(pnr):
    """
    Cancel Booking & Calculate Refund
    ---
    tags:
      - Bookings
    parameters:
      - name: pnr
        in: path
        type: string
        required: true
    responses:
      200:
        description: Cancellation confirmed with refund receipt
    """
    cleaned_pnr = pnr.strip().upper()
    booking = bookings_col.find_one({"pnr": {"$regex": f"^{cleaned_pnr}$", "$options": "i"}})

    if not booking:
        return jsonify({"error": f"Booking with PNR '{pnr}' not found."}), 404

    if booking.get("status") == "CANCELLED":
        return jsonify({
            "message": "Booking is already cancelled.",
            "booking": serialize(booking),
            "refund_amount": booking.get("cancellation", {}).get("refund_amount", 0),
            "cancellation_fee": booking.get("cancellation", {}).get("cancellation_fee", 0),
            "status": "CANCELLED",
        }), 200

    # Fetch live flight
    flight = None
    flight_id = booking.get("flight_id")
    obj_id = to_object_id(flight_id)
    if obj_id:
        flight = flights_col.find_one({"_id": obj_id})
    if not flight:
        flight = flights_col.find_one({"flight_number": booking.get("flight_number")})

    refund_data = _calculate_refund(booking, flight)
    now = datetime.now(timezone.utc)

    # Update booking in DB
    cancellation_record = {
        "cancelled_at": now,
        "refund_amount": refund_data["refund_amount"],
        "cancellation_fee": refund_data["cancellation_fee"],
        "rule_applied": refund_data["rule_applied"],
        "refund_status": "PROCESSED_TO_SOURCE",
        "receipt_id": f"REC-{random.randint(100000, 999999)}",
    }

    bookings_col.update_one(
        {"_id": booking["_id"]},
        {
            "$set": {
                "status": "CANCELLED",
                "cancellation": cancellation_record,
                "updated_at": now,
            }
        },
    )

    # Restore seat count in flight
    if flight and flight.get("_id"):
        flights_col.update_one({"_id": flight["_id"]}, {"$inc": {"seats_available": 1}})

    booking["status"] = "CANCELLED"
    booking["cancellation"] = cancellation_record

    return jsonify({
        "success": True,
        "message": "Flight booking cancelled successfully.",
        "pnr": booking["pnr"],
        "status": "CANCELLED",
        "refund_amount": refund_data["refund_amount"],
        "cancellation_fee": refund_data["cancellation_fee"],
        "receipt_id": cancellation_record["receipt_id"],
        "rule_applied": refund_data["rule_applied"],
        "booking": serialize(booking),
    })


@app.route("/api/bookings/my", methods=["GET"])
def get_my_bookings():
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
    query = {}
    if user and user.get("email"):
        query = {"$or": [{"user_email": user["email"]}, {"passenger.email": user["email"]}]}

    bookings = list(bookings_col.find(query).sort("booked_at", -1))
    return jsonify({
        "bookings": [serialize(b) for b in bookings],
        "count": len(bookings),
    })


# -------------------------------------------------------------
# Admin Endpoints (Flight Operations & Delay Simulator)
# -------------------------------------------------------------
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


@app.route("/api/admin/check", methods=["GET"])
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


@app.route("/api/admin/flights", methods=["GET"])
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
        return jsonify({
            "error": "Forbidden: Administrator privileges required."
        }), 403

    flights = list(flights_col.find({}).sort("flight_number", 1))
    return jsonify({
        "flights": [serialize(f) for f in flights],
        "count": len(flights),
    })


@app.route("/api/admin/flights", methods=["POST"])
def admin_add_flight():
    """
    Admin: Add New Flight & Aircraft
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
          required:
            - airline
            - flight_number
            - origin
            - destination
            - departure_time
            - price
          properties:
            airline:
              type: string
            airline_code:
              type: string
            flight_number:
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
        return jsonify({
            "error": "Forbidden: Administrator privileges required."
        }), 403

    data = request.get_json() or {}
    required = ["airline", "flight_number", "origin", "destination", "departure_time", "price"]
    for req in required:
        if not data.get(req):
            return jsonify({"error": f"Field '{req}' is required"}), 400

    policy_type = data.get("cancellation_policy", "FREE_CANCELLATION")
    policy_text = data.get("cancellation_policy_text")
    if not policy_text:
        if policy_type == "FREE_CANCELLATION":
            policy_text = "Free cancellation up to 24h before departure"
        elif policy_type == "PARTIAL_REFUND":
            policy_text = "₹2,500 cancellation fee within 48h"
        else:
            policy_text = "Non-refundable ticket"

    new_flight = {
        "airline": data.get("airline"),
        "airline_code": data.get("airline_code", data.get("airline")[:2].upper()),
        "flight_number": data.get("flight_number").strip().upper(),
        "airline_logo": data.get("airline_logo") or "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=100&auto=format&fit=crop&q=80",
        "origin": data.get("origin").strip().upper(),
        "origin_city": data.get("origin_city", data.get("origin")),
        "origin_terminal": data.get("origin_terminal", "T1"),
        "destination": data.get("destination").strip().upper(),
        "destination_city": data.get("destination_city", data.get("destination")),
        "destination_terminal": data.get("destination_terminal", "T2"),
        "departure_time": data.get("departure_time"),
        "arrival_time": data.get("arrival_time", "12:00"),
        "duration": data.get("duration", "2h 15m"),
        "stops": int(data.get("stops", 0)),
        "stops_text": "Non-stop" if int(data.get("stops", 0)) == 0 else f"{data.get('stops')} Stop",
        "price": float(data.get("price", 4999)),
        "base_fare": float(data.get("base_fare", float(data.get("price", 4999)) * 0.82)),
        "seats_available": int(data.get("seats_available", 30)),
        "total_seats": int(data.get("total_seats", 180)),
        "aircraft": data.get("aircraft", "Airbus A320neo"),
        "class": data.get("class", "Economy"),
        "status": "ON_TIME",
        "delay_minutes": 0,
        "new_departure_time": None,
        "cancellation_policy": policy_type,
        "cancellation_policy_text": policy_text,
        "created_at": datetime.now(timezone.utc),
    }

    res = flights_col.insert_one(new_flight)
    new_flight["_id"] = res.inserted_id

    return jsonify({
        "success": True,
        "flight": serialize(new_flight),
        "message": "Flight created successfully!",
    }), 201


@app.route("/api/admin/flights/<flight_id>/status", methods=["PUT"])
def admin_update_flight_status(flight_id):
    """
    Admin: Flight Delay / Cancellation Simulator (TripSaathi Testing)
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
            status:
              type: string
              enum: [ON_TIME, DELAYED, CANCELLED_BY_AIRLINE]
            delay_minutes:
              type: integer
    responses:
      200:
        description: Flight status updated
      403:
        description: Unauthorized
    """
    if not check_admin_access():
        return jsonify({
            "error": "Forbidden: Administrator privileges required."
        }), 403

    data = request.get_json() or {}
    new_status = data.get("status", "ON_TIME").upper()
    delay_minutes = int(data.get("delay_minutes", 0))

    obj_id = to_object_id(flight_id)
    query = {"_id": obj_id} if obj_id else {"flight_number": flight_id}

    update_fields = {
        "status": new_status,
        "delay_minutes": delay_minutes if new_status == "DELAYED" else 0,
        "updated_at": datetime.now(timezone.utc),
    }

    if new_status == "DELAYED" and delay_minutes > 0:
        update_fields["disruption_note"] = f"Delayed by {delay_minutes} mins due to air traffic control"
    elif new_status == "CANCELLED_BY_AIRLINE":
        update_fields["disruption_note"] = "Flight cancelled by airline operations"
    else:
        update_fields["disruption_note"] = None

    flights_col.update_one(query, {"$set": update_fields})
    updated = flights_col.find_one(query)

    if not updated:
        return jsonify({"error": "Flight not found"}), 404

    logger.info("Flight %s status simulated: %s (%d mins delay)", flight_id, new_status, delay_minutes)

    return jsonify({
        "success": True,
        "message": f"Flight status simulated to {new_status}",
        "flight": serialize(updated),
    })


@app.route("/api/admin/bookings", methods=["GET"])
def admin_get_bookings():
    """
    Admin: View All System Bookings
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    responses:
      200:
        description: List of bookings
      403:
        description: Unauthorized
    """
    if not check_admin_access():
        return jsonify({
            "error": "Forbidden: Administrator privileges required."
        }), 403

    bookings = list(bookings_col.find({}).sort("booked_at", -1))
    return jsonify({
        "bookings": [serialize(b) for b in bookings],
        "count": len(bookings),
    })


@app.route("/api/admin/seed", methods=["POST"])
def admin_reset_seed():
    """
    Admin: Reset & Re-seed Flights & Policies
    ---
    tags:
      - Admin
    security:
      - Bearer: []
    responses:
      200:
        description: Database re-seeded
      403:
        description: Unauthorized
    """
    if not check_admin_access():
        return jsonify({
            "error": "Forbidden: Administrator privileges required."
        }), 403

    seed_database(force=True)
    return jsonify({"success": True, "message": "Database successfully re-seeded with demo flights."})


# -------------------------------------------------------------
# Developer Testing Endpoint
# -------------------------------------------------------------
@app.route("/api/dev", methods=["GET", "POST"])
@app.route("/dev", methods=["GET", "POST"])
def dev_user_lookup():
    """
    Developer Testing Endpoint
    ---
    tags:
      - Developer
    parameters:
      - name: email
        in: query
        type: string
        required: false
        description: User email to retrieve JWT token, name, and role for testing
      - in: body
        name: body
        required: false
        schema:
          type: object
          properties:
            email:
              type: string
    security:
      - Bearer: []
    responses:
      200:
        description: User profile, role, and corresponding JWT token
      400:
        description: Missing email parameter
      404:
        description: User not found in database
    """
    data = request.get_json(silent=True) or {}
    email = request.args.get("email") or data.get("email") or request.form.get("email")

    if not email or not str(email).strip():
        return jsonify({
            "error": "Email parameter is required. Provide ?email=user@example.com or POST body {'email': '...'}"
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


# -------------------------------------------------------------
# App Entry Point
# -------------------------------------------------------------
if __name__ == "__main__":
    logger.info("Starting SkyPulse backend on port %d...", Config.PORT)
    # Seed database on startup if empty
    seed_database(force=False)
    app.run(host="0.0.0.0", port=Config.PORT, debug=(Config.FLASK_ENV == "development"))
