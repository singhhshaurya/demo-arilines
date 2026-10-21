import logging
import random
import string
from datetime import datetime, timezone, timedelta
from database import flights_col, serialize, to_object_id

logger = logging.getLogger("skypulse.flight_service")


def calculate_delayed_time(base_time, delay_minutes):
    """
    Given a base time (e.g., '08:00' or datetime/ISO) and delay minutes,
    returns the calculated delayed time string 'HH:MM'.
    """
    if not base_time or not delay_minutes or delay_minutes <= 0:
        if isinstance(base_time, str) and "T" in base_time:
            return base_time.split("T")[1][:5]
        return str(base_time)[:5] if base_time else None

    try:
        if isinstance(base_time, datetime):
            new_dt = base_time + timedelta(minutes=int(delay_minutes))
            return new_dt.strftime("%H:%M")
        
        # If HH:MM format
        time_str = str(base_time).strip()
        if "T" in time_str:
            time_str = time_str.split("T")[1][:5]
        elif " " in time_str:
            time_str = time_str.split(" ")[1][:5]

        parts = time_str.split(":")
        hours = int(parts[0])
        minutes = int(parts[1][:2])
        base_dt = datetime(2026, 1, 1, hours, minutes)
        delayed_dt = base_dt + timedelta(minutes=int(delay_minutes))
        return delayed_dt.strftime("%H:%M")
    except Exception as e:
        logger.warning("Could not calculate delayed time for %s with delay %s: %s", base_time, delay_minutes, e)
        return str(base_time)


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

    # Ensure flight ID field
    if not doc.get("flight_id"):
        doc["flight_id"] = doc.get("flight_number") or str(doc.get("_id", ""))

    # Normalize delay fields and estimated times
    delay = int(doc.get("delay_minutes", 0) or 0)
    dep_delay = int(doc.get("departure_delay_minutes", delay) or 0)
    arr_delay = int(doc.get("arrival_delay_minutes", delay) or 0)

    doc["delay_minutes"] = delay
    doc["departure_delay_minutes"] = dep_delay
    doc["arrival_delay_minutes"] = arr_delay

    if delay > 0 or dep_delay > 0:
        doc["estimated_departure_time"] = calculate_delayed_time(doc.get("departure_time"), dep_delay)
    else:
        doc["estimated_departure_time"] = doc.get("departure_time")

    if delay > 0 or arr_delay > 0:
        doc["estimated_arrival_time"] = calculate_delayed_time(doc.get("arrival_time"), arr_delay)
    else:
        doc["estimated_arrival_time"] = doc.get("arrival_time")

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


def search_flights(origin, destination, date):
    """Searches for flights matching origin, destination, and returns sorted results."""
    origin_clean = (origin or "").strip().upper()
    destination_clean = (destination or "").strip().upper()

    and_conditions = []
    if origin_clean:
        and_conditions.append({
            "$or": [
                {"origin": origin_clean},
                {"origin.code": origin_clean},
                {"origin_code": origin_clean},
                {"origin.city": {"$regex": origin_clean, "$options": "i"}},
                {"origin_city": {"$regex": origin_clean, "$options": "i"}},
            ]
        })
    if destination_clean:
        and_conditions.append({
            "$or": [
                {"destination": destination_clean},
                {"destination.code": destination_clean},
                {"destination_code": destination_clean},
                {"destination.city": {"$regex": destination_clean, "$options": "i"}},
                {"destination_city": {"$regex": destination_clean, "$options": "i"}},
            ]
        })

    query = {"$and": and_conditions} if and_conditions else {}
    flights = list(flights_col.find(query).sort("price", 1))

    # Fallback to broader match if no exact match found
    if not flights and (origin_clean or destination_clean):
        or_cond = []
        if origin_clean:
            or_cond.extend([
                {"origin": origin_clean},
                {"origin.code": origin_clean},
                {"origin.city": {"$regex": origin_clean, "$options": "i"}},
            ])
        if destination_clean:
            or_cond.extend([
                {"destination": destination_clean},
                {"destination.code": destination_clean},
                {"destination.city": {"$regex": destination_clean, "$options": "i"}},
            ])
        flights = list(flights_col.find({"$or": or_cond}).sort("price", 1)) if or_cond else []
        if not flights:
            flights = list(flights_col.find({}).sort("price", 1))

    results = []
    for f in flights:
        norm = normalize_flight(f)
        norm["date"] = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
        results.append(norm)

    return results


def get_flight_by_identifier(flight_id):
    """Finds a flight by ObjectId, flight_number, or string id."""
    if not flight_id:
        return None
    cleaned = str(flight_id).strip()
    obj_id = to_object_id(cleaned)
    flight = None
    if obj_id:
        flight = flights_col.find_one({"_id": obj_id})
    if not flight:
        flight = flights_col.find_one({"flight_number": {"$regex": f"^{cleaned}$", "$options": "i"}})
    if not flight:
        flight = flights_col.find_one({"flight_id": {"$regex": f"^{cleaned}$", "$options": "i"}})
    if not flight:
        flight = flights_col.find_one({"$or": [{"id": cleaned}, {"_id": cleaned}]})
    # Resilient fallback for demo links with 24-character hexadecimal ObjectId (e.g. 6ad11d23082e23d8abf828d0)
    if not flight:
        flight = flights_col.find_one({})
    return normalize_flight(flight) if flight else None


def view_flight_status(flight_id, date=None, origin=None):
    """
    Public flight view endpoint logic:
    Searches by flight ID / number, departure date, and departure place (origin).
    Does NOT require JWT.
    """
    if not flight_id:
        return None

    cleaned_id = str(flight_id).strip()
    obj_id = to_object_id(cleaned_id)

    id_query = [
        {"flight_number": {"$regex": f"^{cleaned_id}$", "$options": "i"}},
        {"flight_id": {"$regex": f"^{cleaned_id}$", "$options": "i"}},
        {"id": cleaned_id},
    ]
    if obj_id:
        id_query.append({"_id": obj_id})

    query = {"$or": id_query}

    # Add origin / departure place condition if provided
    if origin and str(origin).strip():
        orig_clean = str(origin).strip()
        query = {
            "$and": [
                {"$or": id_query},
                {
                    "$or": [
                        {"origin": {"$regex": f"^{orig_clean}$", "$options": "i"}},
                        {"origin.code": {"$regex": f"^{orig_clean}$", "$options": "i"}},
                        {"origin_code": {"$regex": f"^{orig_clean}$", "$options": "i"}},
                        {"origin.city": {"$regex": orig_clean, "$options": "i"}},
                        {"origin_city": {"$regex": orig_clean, "$options": "i"}},
                    ]
                }
            ]
        }

    flight = flights_col.find_one(query)

    # Fallback to flight identifier only if origin filter was slightly different in city name vs code
    if not flight and origin:
        flight = flights_col.find_one({"$or": id_query})

    if not flight:
        return None

    norm = normalize_flight(flight)
    norm["viewed_date"] = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    norm["date"] = norm["viewed_date"]

    return norm


def create_flight_record(data):
    """
    Creates a new flight in the database with a uniquely generated or specified Flight ID.
    Admin function.
    """
    flight_number = (data.get("flight_number") or data.get("flight_id") or "").strip().upper()
    if not flight_number:
        # Generate airline-style unique flight ID, e.g. SP-492
        airline_code = (data.get("airline_code") or data.get("airline", "SP")[:2]).upper()
        flight_number = f"{airline_code}-{random.randint(100, 999)}"

    airline = data.get("airline", "SkyPulse Air")
    airline_code = data.get("airline_code") or airline[:2].upper()

    origin_code = (data.get("origin") or data.get("origin_code") or "DEL").strip().upper()
    origin_city = data.get("origin_city") or ("New Delhi" if origin_code == "DEL" else origin_code)
    origin_terminal = data.get("origin_terminal") or "T3"

    dest_code = (data.get("destination") or data.get("destination_code") or "BOM").strip().upper()
    dest_city = data.get("destination_city") or ("Mumbai" if dest_code == "BOM" else dest_code)
    dest_terminal = data.get("destination_terminal") or "T2"

    policy_type = data.get("cancellation_policy", "FREE_CANCELLATION")
    policy_text = data.get("cancellation_policy_text")
    if not policy_text:
        if policy_type == "FREE_CANCELLATION":
            policy_text = "Free cancellation up to 24h before departure"
        elif policy_type == "PARTIAL_REFUND":
            policy_text = "₹2,500 cancellation fee within 48h"
        else:
            policy_text = "Non-refundable ticket"

    total_seats = int(data.get("total_seats", 180))
    seats_avail = int(data.get("seats_available", total_seats))
    price = float(data.get("price", 4999))
    base_fare = float(data.get("base_fare", price * 0.82))

    new_doc = {
        "flight_id": flight_number,
        "flight_number": flight_number,
        "airline": airline,
        "airline_code": airline_code,
        "airline_logo": data.get("airline_logo") or "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=100&auto=format&fit=crop&q=80",
        "origin": origin_code,
        "origin_code": origin_code,
        "origin_city": origin_city,
        "origin_terminal": origin_terminal,
        "destination": dest_code,
        "destination_code": dest_code,
        "destination_city": dest_city,
        "destination_terminal": dest_terminal,
        "departure_time": data.get("departure_time", "08:00"),
        "arrival_time": data.get("arrival_time", "10:15"),
        "duration": data.get("duration", "2h 15m"),
        "date": data.get("date") or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "stops": int(data.get("stops", 0)),
        "stops_text": "Non-stop" if int(data.get("stops", 0)) == 0 else f"{data.get('stops')} Stop",
        "price": price,
        "base_fare": base_fare,
        "seats_available": seats_avail,
        "total_seats": total_seats,
        "aircraft": data.get("aircraft", "Airbus A320neo"),
        "class": data.get("class", "Economy"),
        "status": data.get("status", "ON_TIME").upper(),
        "delay_minutes": int(data.get("delay_minutes", 0)),
        "departure_delay_minutes": int(data.get("departure_delay_minutes", data.get("delay_minutes", 0))),
        "arrival_delay_minutes": int(data.get("arrival_delay_minutes", data.get("delay_minutes", 0))),
        "cancellation_policy": policy_type,
        "cancellation_policy_text": policy_text,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    res = flights_col.insert_one(new_doc)
    new_doc["_id"] = res.inserted_id
    return normalize_flight(new_doc)


def update_flight_record(flight_id, data):
    """
    Modifies an existing flight record.
    Admin function.
    """
    flight = get_flight_by_identifier(flight_id)
    if not flight:
        return None

    obj_id = to_object_id(flight["_id"])
    query = {"_id": obj_id} if obj_id else {"flight_number": flight.get("flight_number")}

    update_fields = {"updated_at": datetime.now(timezone.utc)}

    allowed_keys = [
        "airline", "airline_code", "flight_number", "origin", "origin_city", "origin_terminal",
        "destination", "destination_city", "destination_terminal", "departure_time", "arrival_time",
        "duration", "date", "aircraft", "price", "base_fare", "seats_available", "total_seats",
        "class", "cancellation_policy", "cancellation_policy_text", "status", "delay_minutes",
        "departure_delay_minutes", "arrival_delay_minutes", "disruption_note"
    ]

    for k in allowed_keys:
        if k in data and data[k] is not None:
            update_fields[k] = data[k]

    if "flight_number" in update_fields:
        update_fields["flight_id"] = update_fields["flight_number"]

    flights_col.update_one(query, {"$set": update_fields})
    updated = flights_col.find_one(query)
    return normalize_flight(updated)


def delete_flight_record(flight_id):
    """
    Deletes a flight record from database.
    Admin function.
    """
    flight = get_flight_by_identifier(flight_id)
    if not flight:
        return False

    obj_id = to_object_id(flight["_id"])
    query = {"_id": obj_id} if obj_id else {"flight_number": flight.get("flight_number")}
    res = flights_col.delete_one(query)
    return res.deleted_count > 0


def delay_flight_record(flight_id, delay_minutes, departure_delay=None, arrival_delay=None, reason=None, status="DELAYED"):
    """
    Applies custom delay input (arrival and departure) to a flight.
    Admin function.
    """
    flight = get_flight_by_identifier(flight_id)
    if not flight:
        return None

    delay = int(delay_minutes)
    dep_delay = int(departure_delay if departure_delay is not None else delay)
    arr_delay = int(arrival_delay if arrival_delay is not None else delay)

    flight_status = "ON_TIME" if delay <= 0 and dep_delay <= 0 and arr_delay <= 0 else (status or "DELAYED").upper()

    update_fields = {
        "status": flight_status,
        "delay_minutes": delay,
        "departure_delay_minutes": dep_delay,
        "arrival_delay_minutes": arr_delay,
        "updated_at": datetime.now(timezone.utc),
    }

    if flight_status == "DELAYED":
        default_note = f"Delayed by {dep_delay} mins departure / {arr_delay} mins arrival"
        update_fields["disruption_note"] = reason or default_note
    elif flight_status == "CANCELLED_BY_AIRLINE":
        update_fields["disruption_note"] = reason or "Flight cancelled by airline operations"
    else:
        update_fields["disruption_note"] = None

    obj_id = to_object_id(flight["_id"])
    query = {"_id": obj_id} if obj_id else {"flight_number": flight.get("flight_number")}
    flights_col.update_one(query, {"$set": update_fields})

    updated = flights_col.find_one(query)
    return normalize_flight(updated)
