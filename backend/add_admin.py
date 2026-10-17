from datetime import datetime, timezone
from database import users_col

admin_email = "shauryarazor25@gmail.com"

res = users_col.update_one(
    {"email": admin_email},
    {
        "$set": {
            "email": admin_email,
            "name": "Shaurya Admin",
            "role": "admin",
            "updated_at": datetime.now(timezone.utc),
        },
        "$setOnInsert": {
            "created_at": datetime.now(timezone.utc),
        },
    },
    upsert=True,
)

print(f"Admin user {admin_email} successfully saved to MongoDB users collection.")
user = users_col.find_one({"email": admin_email})
print(f"Current record in DB: email={user.get('email')}, role={user.get('role')}, id={user.get('_id')}")
