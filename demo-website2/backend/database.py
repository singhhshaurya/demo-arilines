import logging
from datetime import datetime
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

# Collections
flights_col = db["flights"]
bookings_col = db["bookings"]
users_col = db["users"]
airlines_col = db["airlines"]
policies_col = db["policies"]


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
