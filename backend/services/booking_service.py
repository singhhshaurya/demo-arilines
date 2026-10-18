import logging
import random
import string
from datetime import datetime, timezone
from database import (
    bookings_col,
    flights_col,
    passengers_col,
    payments_col,
    cancellations_col,
    serialize,
    to_object_id,
)

logger = logging.getLogger("skypulse.booking_service")


def generate_pnr():
    """Generates an airline-style 6-character PNR code: SP-XXXXXX."""
    chars = "".join(random.choices(string.ascii_uppercase + "23456789", k=6))
    return f"SP-{chars}"


def calculate_refund(booking, flight):
    """Calculates refund preview and cancellation fee according to policy & flight delay."""
    total_paid = float(booking.get("total_paid", 4999))
    policy_type = (booking.get("cancellation_policy") or "FREE_CANCELLATION").upper()
    flight_status = (flight.get("status") if flight else "ON_TIME").upper()
    delay_minutes = int(flight.get("delay_minutes", 0) if flight else 0)

    # 1. AIRLINE DISRUPTION WAIVER (Vital for TripSaathi & TinyFish Testing!)
    # If airline cancelled the flight or delayed it >= 120 minutes: 100% full refund!
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


def populate_booking(booking_doc):
    """
    Decentralized Relational Join:
    Populates full relational entities from:
    - passengers_col (via passenger_id)
    - payments_col (via payment_id or pnr)
    - cancellations_col (via cancellation_id or pnr)
    - flights_col (via flight_id or flight_number)
    Guarantees 100% information integrity and backward compatibility.
    """
    if not booking_doc:
        return None

    doc = serialize(booking_doc)
    pnr = doc.get("pnr")

    # 1. Populate Passenger
    passenger_data = doc.get("passenger") or {}
    p_id = doc.get("passenger_id")
    if p_id:
        p_record = passengers_col.find_one({"_id": to_object_id(p_id)})
        if p_record:
            passenger_data = serialize(p_record)
    elif pnr:
        # Fallback relational search by email if passenger_id not yet populated
        email = doc.get("user_email")
        if email:
            p_record = passengers_col.find_one({"email": email})
            if p_record:
                passenger_data = serialize(p_record)

    doc["passenger"] = passenger_data

    # 2. Populate Payment
    payment_data = doc.get("payment") or {}
    pay_id = doc.get("payment_id")
    if pay_id:
        pay_record = payments_col.find_one({"_id": to_object_id(pay_id)})
        if pay_record:
            payment_data = serialize(pay_record)
    elif pnr:
        pay_record = payments_col.find_one({"pnr": pnr})
        if pay_record:
            payment_data = serialize(pay_record)

    doc["payment"] = payment_data

    # 3. Populate Cancellation if applicable
    cancellation_data = doc.get("cancellation") or {}
    canc_id = doc.get("cancellation_id")
    if canc_id:
        canc_record = cancellations_col.find_one({"_id": to_object_id(canc_id)})
        if canc_record:
            cancellation_data = serialize(canc_record)
    elif pnr and doc.get("status") == "CANCELLED":
        canc_record = cancellations_col.find_one({"pnr": pnr})
        if canc_record:
            cancellation_data = serialize(canc_record)

    doc["cancellation"] = cancellation_data

    # 4. Populate Live Flight reference
    flight = None
    flight_id = doc.get("flight_id")
    obj_id = to_object_id(flight_id)
    if obj_id:
        flight = flights_col.find_one({"_id": obj_id})
    if not flight and doc.get("flight_number"):
        flight = flights_col.find_one({"flight_number": doc.get("flight_number")})

    if flight:
        doc["live_flight"] = serialize(flight)
        if not doc.get("flight"):
            doc["flight"] = serialize(flight)

    return doc


def create_booking_record(data, user):
    """
    Decentralized creation of a booking across normalized collections:
    1. Passengers collection (inserts or references passenger)
    2. Payments collection (records transaction)
    3. Bookings collection (stores booking with relational foreign keys)
    """
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

    booking_type = "authenticated" if user else "guest"
    passenger_info = data.get("passenger") or {}
    fare_info = data.get("fare") or {}
    total_amount = fare_info.get("total") or data.get("total_paid") or flight.get("price") or 4999

    passenger_email = (passenger_info.get("email") or (user.get("email") if user else "") or "").strip().lower()

    # 1. Normalize Passenger entity
    existing_passenger = passengers_col.find_one({"email": passenger_email}) if passenger_email else None
    if existing_passenger:
        passenger_id = existing_passenger["_id"]
    else:
        new_passenger = {
            "name": passenger_info.get("name", "Demo Passenger"),
            "email": passenger_email or "passenger@example.com",
            "phone": passenger_info.get("phone", "+91 98765 43210"),
            "age": passenger_info.get("age", 28),
            "gender": passenger_info.get("gender", "Male"),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        res_p = passengers_col.insert_one(new_passenger)
        passenger_id = res_p.inserted_id

    # 2. Normalize Payment entity
    payment_input = data.get("payment") or {}
    now = datetime.now(timezone.utc)
    payment_doc = {
        "pnr": pnr,
        "order_id": payment_input.get("order_id") or f"order_{int(now.timestamp())}",
        "payment_id": payment_input.get("payment_id") or f"pay_{int(now.timestamp())}",
        "status": payment_input.get("status", "SUCCESS"),
        "amount": float(total_amount),
        "currency": "INR",
        "method": "razorpay",
        "created_at": now,
    }
    res_pay = payments_col.insert_one(payment_doc)
    payment_id = res_pay.inserted_id

    # 3. Create normalized Booking entity
    booking_doc = {
        "pnr": pnr,
        "flight_id": str(flight.get("_id") or flight_id or ""),
        "passenger_id": passenger_id,
        "payment_id": payment_id,
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
        "booking_type": booking_type,
        "user_email": (user.get("email") if user else passenger_email).strip().lower(),
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
        "booked_at": now,
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

    # Populate relational documents for return
    populated = populate_booking(booking_doc)
    return pnr, populated


def cancel_booking_record(pnr, current_user, provided_email=""):
    """
    Cancels a booking by PNR with strict ownership enforcement:
    - User must be logged in (JWT)
    - User email must match booking owner email (or be admin)
    - Records cancellation in normalized cancellations collection
    """
    cleaned_pnr = pnr.strip().upper()
    booking = bookings_col.find_one({"pnr": {"$regex": f"^{cleaned_pnr}$", "$options": "i"}})

    if not booking:
        return {"error": f"Booking with PNR '{pnr}' not found.", "status_code": 404}

    if booking.get("status") == "CANCELLED":
        populated = populate_booking(booking)
        return {
            "success": True,
            "message": "Booking is already cancelled.",
            "booking": populated,
            "refund_amount": populated.get("cancellation", {}).get("refund_amount", 0),
            "cancellation_fee": populated.get("cancellation", {}).get("cancellation_fee", 0),
            "status": "CANCELLED",
            "status_code": 200,
        }

    # Populate to get current passenger email
    populated_initial = populate_booking(booking)
    booking_owner_email = (
        booking.get("user_email")
        or populated_initial.get("passenger", {}).get("email")
        or ""
    ).strip().lower()

    # Strict cancellation authorization:
    # 1. Admin authorization
    from services.auth_service import check_admin_access
    is_admin = check_admin_access()

    if not current_user and not is_admin:
        return {
            "error": "Authentication required: You must be logged in as the booking owner to cancel this flight.",
            "code": "AUTH_REQUIRED",
            "status_code": 401,
        }

    caller_email = (current_user.get("email") or "").strip().lower() if current_user else ""

    if not is_admin and caller_email != booking_owner_email:
        masked_owner = f"{booking_owner_email[:2]}***@{booking_owner_email.split('@')[-1]}" if "@" in booking_owner_email else "***"
        return {
            "error": f"Forbidden: You are not authorized to cancel this booking. This ticket belongs to {masked_owner}.",
            "code": "FORBIDDEN",
            "status_code": 403,
        }

    # Fetch live flight for disruption waiver check
    flight = None
    flight_id = booking.get("flight_id")
    obj_id = to_object_id(flight_id)
    if obj_id:
        flight = flights_col.find_one({"_id": obj_id})
    if not flight:
        flight = flights_col.find_one({"flight_number": booking.get("flight_number")})

    refund_data = calculate_refund(booking, flight)
    now = datetime.now(timezone.utc)

    # 1. Create normalized Cancellation record
    cancellation_record = {
        "pnr": booking["pnr"],
        "booking_id": booking["_id"],
        "cancelled_at": now,
        "cancelled_by": caller_email or "admin",
        "refund_amount": refund_data["refund_amount"],
        "cancellation_fee": refund_data["cancellation_fee"],
        "rule_applied": refund_data["rule_applied"],
        "refund_status": "PROCESSED_TO_SOURCE",
        "receipt_id": f"REC-{random.randint(100000, 999999)}",
        "created_at": now,
    }
    canc_res = cancellations_col.insert_one(cancellation_record)
    cancellation_id = canc_res.inserted_id

    # 2. Update booking document with cancellation foreign key
    bookings_col.update_one(
        {"_id": booking["_id"]},
        {
            "$set": {
                "status": "CANCELLED",
                "cancellation_id": cancellation_id,
                "cancellation": cancellation_record,
                "updated_at": now,
            }
        },
    )

    # 3. Restore seat in flight
    if flight and flight.get("_id"):
        flights_col.update_one({"_id": flight["_id"]}, {"$inc": {"seats_available": 1}})

    updated_booking = bookings_col.find_one({"_id": booking["_id"]})
    populated_updated = populate_booking(updated_booking)

    return {
        "success": True,
        "message": "Flight booking cancelled successfully.",
        "pnr": booking["pnr"],
        "status": "CANCELLED",
        "refund_amount": refund_data["refund_amount"],
        "cancellation_fee": refund_data["cancellation_fee"],
        "receipt_id": cancellation_record["receipt_id"],
        "rule_applied": refund_data["rule_applied"],
        "booking": populated_updated,
        "status_code": 200,
    }


def get_booking_by_pnr_record(pnr):
    """Finds booking by PNR and populates full relational data with refund preview."""
    cleaned_pnr = pnr.strip().upper()
    booking = bookings_col.find_one({"pnr": {"$regex": f"^{cleaned_pnr}$", "$options": "i"}})
    if not booking:
        return None, None

    populated = populate_booking(booking)

    # Live flight for refund calculation
    flight = None
    flight_id = booking.get("flight_id")
    obj_id = to_object_id(flight_id)
    if obj_id:
        flight = flights_col.find_one({"_id": obj_id})
    if not flight:
        flight = flights_col.find_one({"flight_number": booking.get("flight_number")})

    refund_preview = calculate_refund(booking, flight)
    return populated, refund_preview


def get_user_bookings(user_email):
    """Retrieves all bookings belonging to a user email (populated)."""
    email = (user_email or "").strip().lower()
    if not email:
        return []

    # Find matching passengers first
    p_ids = [p["_id"] for p in passengers_col.find({"email": email})]

    query = {
        "$or": [
            {"user_email": email},
            {"passenger.email": email},
            {"passenger_id": {"$in": p_ids}} if p_ids else {},
        ]
    }
    # Clean empty query dicts
    query["$or"] = [cond for cond in query["$or"] if cond]

    bookings = list(bookings_col.find(query).sort("booked_at", -1))
    return [populate_booking(b) for b in bookings]


def get_all_system_bookings():
    """Admin: Retrieves all system bookings populated with relational data."""
    bookings = list(bookings_col.find({}).sort("booked_at", -1))
    return [populate_booking(b) for b in bookings]
