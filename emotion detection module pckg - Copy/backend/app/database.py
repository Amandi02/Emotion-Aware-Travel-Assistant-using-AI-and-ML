"""MongoDB connection and helpers."""
from typing import Any, Dict, Optional

from pymongo import MongoClient
from pymongo.database import Database #This loads:Your database link (URL),Your database name
from pymongo.errors import ServerSelectionTimeoutError

from app.config import settings

_client: Optional[MongoClient] = None #“We haven’t connected to MongoDB yet.”It starts empty.

#“If we’re not connected to MongoDB, connect now.Then give me access to the database.”
def get_db() -> Database:
    global _client
    if _client is None:
        _client = MongoClient(settings.mongodb_uri)
    return _client[settings.mongodb_db_name]


def save_analysis(
    user_id: Optional[str],
    source: str,
    result: Dict[str, Any],
) -> Optional[str]:
    """Save an emotion analysis result to MongoDB. Returns inserted id, or None if MongoDB is unavailable."""
    try:
        db = get_db()
        doc = { #creates a digital paper
            "user_id": user_id,
            "source": source,  # "frame" or "video"
            "result": result,
        }
        col = db["analyses"]
        ins = col.insert_one(doc)
        return str(ins.inserted_id)
    except (ServerSelectionTimeoutError, Exception):
        return None


def get_analysis(analysis_id: str) -> Optional[Dict[str, Any]]:
    """Get one analysis by id."""
    from bson import ObjectId

    db = get_db()
    try:
        doc = db["analyses"].find_one({"_id": ObjectId(analysis_id)})
    except Exception:
        return None
    if not doc:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc
