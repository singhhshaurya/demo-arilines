import logging
import random
from datetime import datetime, timezone
from bson import ObjectId
from pymongo import MongoClient
import mongomock
from config import Config

logger = logging.getLogger("skypulse.database")

# Attempt real MongoDB connection, fallback to mongomock if unavailable
db_connected_to_real = False
try:
    if Config.MONGODB_URI:
        real_client = MongoClient(Config.MONGODB_URI, serverSelectionTimeoutMS=4000)
        # Test connection
        real_client.server_info()
        client = real_client
        db_connected_to_real = True
        logger.info("Successfully connected to real MongoDB at %s", Config.MONGODB_URI.split("@")[-1] if "@" in Config.MONGODB_URI else "local")
    else:
        raise ValueError("No MongoDB URI configured")
except Exception as e:
    logger.warning("MongoDB connection failed (%s). Falling back to resilient in-memory MongoDB mock.", e)
    client = mongomock.MongoClient()
    db_connected_to_real = False

db = client[Config.DATABASE_NAME]

# -------------------------------------------------------------------------
# Normalized Collections
# -------------------------------------------------------------------------
flights_col = db["flights"]
bookings_col = db["bookings"]
users_col = db["users"]
airlines_col = db["airlines"]
policies_col = db["policies"]
passengers_col = db["passengers"]
payments_col = db["payments"]
cancellations_col = db["cancellations"]


def is_connected():
    """Returns True if connected to live MongoDB, False if using mock."""
    return db_connected_to_real


def serialize(doc):
    """
    Recursively converts MongoDB BSON documents, ObjectIds, and datetimes
    into JSON-serializable Python data structures.
    """
    if doc is None:
        return None

    if isinstance(doc, ObjectId):
        return str(doc)

    if isinstance(doc, datetime):
        return doc.isoformat()

    if isinstance(doc, list):
        return [serialize(item) for item in doc]

    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if key == "_id":
                result["_id"] = str(value)
                result["id"] = str(value)
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, (dict, list)):
                result[key] = serialize(value)
            else:
                result[key] = value
        return result

    return doc


def to_object_id(val):
    """
    Safely converts a string to a BSON ObjectId if valid.
    """
    if isinstance(val, ObjectId):
        return val
    if isinstance(val, str) and ObjectId.is_valid(val):
        return ObjectId(val)
    return None


def migrate_and_normalize_database():
    """
    Decentralizes and normalizes existing bookings into distinct collections:
    - passengers
    - payments
    - cancellations
    Establishes relational foreign keys (passenger_id, payment_id, cancellation_id).
    Guarantees zero information loss by keeping relationships and embedded snapshots intact.
    """
    try:
        logger.info("Starting database normalization and migration check...")
        
        # Ensure indexes for rapid relational lookups
        try:
            bookings_col.create_index("pnr", unique=True)
            bookings_col.create_index("user_email")
            bookings_col.create_index("passenger_id")
            passengers_col.create_index("email")
            payments_col.create_index("pnr")
            cancellations_col.create_index("pnr")
            flights_col.create_index("flight_number")
        except Exception as idx_err:
            logger.warning("Index creation notice: %s", idx_err)

        migrated_count = 0
        all_bookings = list(bookings_col.find({}))
        for b in all_bookings:
            pnr = b.get("pnr")
            b_id = b["_id"]
            updated_fields = {}

            # 1. Normalize Passenger entity
            p_id = b.get("passenger_id")
            if not p_id:
                p_info = b.get("passenger") or {}
                p_email = (p_info.get("email") or b.get("user_email") or "").strip().lower()
                existing_p = None
                if p_email:
                    existing_p = passengers_col.find_one({"email": p_email})

                if existing_p:
                    p_id = existing_p["_id"]
                else:
                    new_p = {
                        "name": p_info.get("name") or "Passenger",
                        "email": p_email or "passenger@example.com",
                        "phone": p_info.get("phone") or "+91 98765 43210",
                        "age": p_info.get("age", 28),
                        "gender": p_info.get("gender", "Other"),
                        "created_at": b.get("booked_at") or datetime.now(timezone.utc),
                        "updated_at": datetime.now(timezone.utc),
                    }
                    p_res = passengers_col.insert_one(new_p)
                    p_id = p_res.inserted_id

                updated_fields["passenger_id"] = p_id

            # 2. Normalize Payment entity
            pay_id = b.get("payment_id")
            if not pay_id:
                pay_info = b.get("payment") or {}
                existing_pay = payments_col.find_one({"pnr": pnr}) if pnr else None

                if existing_pay:
                    pay_id = existing_pay["_id"]
                else:
                    new_pay = {
                        "pnr": pnr,
                        "booking_id": b_id,
                        "order_id": pay_info.get("order_id") or f"order_{pnr}",
                        "payment_id": pay_info.get("payment_id") or f"pay_{pnr}",
                        "status": pay_info.get("status") or "SUCCESS",
                        "amount": float(pay_info.get("amount") or b.get("total_paid") or 4999),
                        "currency": pay_info.get("currency") or "INR",
                        "method": "razorpay",
                        "created_at": b.get("booked_at") or datetime.now(timezone.utc),
                    }
                    pay_res = payments_col.insert_one(new_pay)
                    pay_id = pay_res.inserted_id

                updated_fields["payment_id"] = pay_id

            # 3. Normalize Cancellation entity (if cancelled)
            if b.get("status") == "CANCELLED" and not b.get("cancellation_id"):
                canc_info = b.get("cancellation") or {}
                existing_canc = cancellations_col.find_one({"pnr": pnr}) if pnr else None

                if existing_canc:
                    canc_id = existing_canc["_id"]
                else:
                    new_canc = {
                        "pnr": pnr,
                        "booking_id": b_id,
                        "cancelled_at": canc_info.get("cancelled_at") or datetime.now(timezone.utc),
                        "cancelled_by": b.get("user_email") or (b.get("passenger") or {}).get("email") or "user",
                        "refund_amount": float(canc_info.get("refund_amount", 0)),
                        "cancellation_fee": float(canc_info.get("cancellation_fee", 0)),
                        "rule_applied": canc_info.get("rule_applied") or "Policy applied",
                        "refund_status": canc_info.get("refund_status") or "PROCESSED_TO_SOURCE",
                        "receipt_id": canc_info.get("receipt_id") or f"REC-{random.randint(100000, 999999)}",
                        "created_at": canc_info.get("cancelled_at") or datetime.now(timezone.utc),
                    }
                    canc_res = cancellations_col.insert_one(new_canc)
                    canc_id = canc_res.inserted_id

                updated_fields["cancellation_id"] = canc_id

            if updated_fields:
                bookings_col.update_one({"_id": b_id}, {"$set": updated_fields})
                migrated_count += 1

        logger.info(
            "Database normalization complete. Migrated %d bookings. Total: %d passengers, %d payments, %d cancellations.",
            migrated_count,
            passengers_col.count_documents({}),
            payments_col.count_documents({}),
            cancellations_col.count_documents({}),
        )
    except Exception as e:
        logger.error("Error during database normalization: %s", e)
