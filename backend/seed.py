import logging
from datetime import datetime, timezone
from database import flights_col, airlines_col, policies_col, users_col

logger = logging.getLogger("skypulse.seed")

AIRLINES_DATA = [
    {
        "name": "Air India",
        "code": "AI",
        "logo": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=100&auto=format&fit=crop&q=80",
        "fleet": ["Airbus A320neo", "Boeing 787-9 Dreamliner", "Airbus A350-900"],
    },
    {
        "name": "IndiGo",
        "code": "6E",
        "logo": "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=100&auto=format&fit=crop&q=80",
        "fleet": ["Airbus A320neo", "Airbus A321neo"],
    },
    {
        "name": "Vistara",
        "code": "UK",
        "logo": "https://images.unsplash.com/photo-1520437358207-323b43b50729?w=100&auto=format&fit=crop&q=80",
        "fleet": ["Airbus A320neo", "Boeing 787-9 Dreamliner"],
    },
    {
        "name": "Akasa Air",
        "code": "QP",
        "logo": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=100&auto=format&fit=crop&q=80",
        "fleet": ["Boeing 737 MAX 8"],
    },
    {
        "name": "SpiceJet",
        "code": "SG",
        "logo": "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=100&auto=format&fit=crop&q=80",
        "fleet": ["Boeing 737-800", "Bombardier Q400"],
    },
    {
        "name": "Air India Express",
        "code": "IX",
        "logo": "https://images.unsplash.com/photo-1508873696983-2df5703bc2e1?w=100&auto=format&fit=crop&q=80",
        "fleet": ["Boeing 737-800", "Boeing 737 MAX 8"],
    },
    {
        "name": "SkyPulse Air",
        "code": "SP",
        "logo": "https://images.unsplash.com/photo-1517400508447-f8dd518b86db?w=100&auto=format&fit=crop&q=80",
        "fleet": ["Airbus A320neo", "Airbus A321neo"],
    },
    {
        "name": "Star Air",
        "code": "S5",
        "logo": "https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=100&auto=format&fit=crop&q=80",
        "fleet": ["Embraer E175", "Embraer ERJ 145"],
    },
]

POLICIES_DATA = [
    {
        "policy_id": "FREE_CANCELLATION",
        "name": "Flexible Fare - Free Cancellation",
        "is_refundable": True,
        "free_cancellation_hours": 24,
        "cancellation_fee": 0,
        "policy_text": "Free cancellation up to 24h before departure. 100% refund if airline delays > 2 hrs or cancels.",
    },
    {
        "policy_id": "PARTIAL_REFUND",
        "name": "Standard Fare - Partial Refund",
        "is_refundable": True,
        "free_cancellation_hours": 0,
        "cancellation_fee": 2500,
        "policy_text": "₹2,500 cancellation fee within 48h. 100% refund if airline delays > 2 hrs or cancels.",
    },
    {
        "policy_id": "NON_REFUNDABLE",
        "name": "Saver Fare - Non-Refundable",
        "is_refundable": False,
        "free_cancellation_hours": 0,
        "cancellation_fee": 0,
        "policy_text": "Non-refundable ticket. 100% refund eligible if airline delays > 2 hrs or cancels.",
    },
]


def make_flight(
    airline,
    airline_code,
    flight_number,
    airline_logo,
    origin_code,
    origin_city,
    origin_terminal,
    dest_code,
    dest_city,
    dest_terminal,
    departure_time,
    arrival_time,
    duration,
    duration_minutes,
    price,
    stops=0,
    stops_text="Non-stop",
    layover=None,
    aircraft="Airbus A320neo",
    seats=180,
    seats_avail=35,
    policy_type="FREE_CANCELLATION",
    status="ON_TIME",
):
    base_fare = int(price * 0.82)
    if policy_type == "FREE_CANCELLATION":
        pol = {
            "policy_id": "FREE_CANCELLATION",
            "is_refundable": True,
            "free_cancellation_hours": 24,
            "cancellation_fee": 0,
            "policy_text": "Free cancellation up to 24h before departure. 100% refund if airline delays > 2 hrs.",
            "airline_delay_full_refund": True,
        }
        pol_text = "Free cancellation up to 24h before departure"
    elif policy_type == "PARTIAL_REFUND":
        pol = {
            "policy_id": "PARTIAL_REFUND",
            "is_refundable": True,
            "free_cancellation_hours": 0,
            "cancellation_fee": 2500,
            "policy_text": "₹2,500 cancellation fee within 48h. 100% refund if airline delays > 2 hrs.",
            "airline_delay_full_refund": True,
        }
        pol_text = "₹2,500 cancellation fee within 48h"
    else:
        pol = {
            "policy_id": "NON_REFUNDABLE",
            "is_refundable": False,
            "free_cancellation_hours": 0,
            "cancellation_fee": 0,
            "policy_text": "Non-refundable ticket. 100% refund eligible if airline delays > 2 hrs or cancels.",
            "airline_delay_full_refund": True,
        }
        pol_text = "Non-refundable ticket"

    doc = {
        "flight_id": flight_number,
        "flight_number": flight_number,
        "airline": airline,
        "airline_code": airline_code,
        "airline_logo": airline_logo,
        "origin": {
            "code": origin_code,
            "city": origin_city,
            "terminal": origin_terminal,
        },
        "origin_code": origin_code,
        "origin_city": origin_city,
        "origin_terminal": origin_terminal,
        "destination": {
            "code": dest_code,
            "city": dest_city,
            "terminal": dest_terminal,
        },
        "destination_code": dest_code,
        "destination_city": dest_city,
        "destination_terminal": dest_terminal,
        "departure_time": departure_time,
        "arrival_time": arrival_time,
        "duration": duration,
        "duration_minutes": duration_minutes,
        "stops": stops,
        "stops_text": stops_text,
        "price": price,
        "base_fare": base_fare,
        "class_prices": {
            "economy": price,
            "premium_economy": int(price * 1.45),
            "business": int(price * 2.3),
        },
        "seats_available": seats_avail,
        "total_seats": seats,
        "aircraft": aircraft,
        "class": "Economy",
        "status": status,
        "delay_minutes": 0,
        "new_departure_time": None,
        "cancellation_policy": policy_type,
        "cancellation_policy_text": pol_text,
        "policy": pol,
    }
    if layover:
        doc["layover"] = layover
        doc["connecting_airport"] = layover.get("code")
    return doc


AI_LOGO = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=100&auto=format&fit=crop&q=80"
INDIGO_LOGO = "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=100&auto=format&fit=crop&q=80"
VISTARA_LOGO = "https://images.unsplash.com/photo-1520437358207-323b43b50729?w=100&auto=format&fit=crop&q=80"
AKASA_LOGO = "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=100&auto=format&fit=crop&q=80"
SPICE_LOGO = "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=100&auto=format&fit=crop&q=80"
AI_EXP_LOGO = "https://images.unsplash.com/photo-1508873696983-2df5703bc2e1?w=100&auto=format&fit=crop&q=80"
SKYPULSE_LOGO = "https://images.unsplash.com/photo-1517400508447-f8dd518b86db?w=100&auto=format&fit=crop&q=80"
STAR_LOGO = "https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=100&auto=format&fit=crop&q=80"

INITIAL_FLIGHTS = [
    # ==================== DEL (New Delhi) Flights ====================
    make_flight("Air India", "AI", "AI-805", AI_LOGO, "DEL", "New Delhi", "T3", "BOM", "Mumbai", "T2", "07:00", "09:15", "2h 15m", 135, 4999, aircraft="Airbus A320neo", policy_type="FREE_CANCELLATION"),
    make_flight("IndiGo", "6E", "6E-2041", INDIGO_LOGO, "DEL", "New Delhi", "T1D", "BOM", "Mumbai", "T2", "11:30", "13:45", "2h 15m", 135, 4350, aircraft="Airbus A321neo", policy_type="PARTIAL_REFUND"),
    make_flight("Vistara", "UK", "UK-812", VISTARA_LOGO, "DEL", "New Delhi", "T3", "BLR", "Bangalore", "T2", "08:30", "11:15", "2h 45m", 165, 5450, aircraft="Boeing 787-9 Dreamliner", policy_type="FREE_CANCELLATION"),
    make_flight("Akasa Air", "QP", "QP-1301", AKASA_LOGO, "DEL", "New Delhi", "T2", "GOI", "Goa", "T1", "10:15", "13:00", "2h 45m", 165, 4890, aircraft="Boeing 737 MAX 8", policy_type="FREE_CANCELLATION"),
    make_flight("SpiceJet", "SG", "SG-8169", SPICE_LOGO, "DEL", "New Delhi", "T1", "HYD", "Hyderabad", "T1", "14:00", "16:15", "2h 15m", 135, 3990, aircraft="Boeing 737-800", policy_type="PARTIAL_REFUND"),
    make_flight("Air India Express", "IX", "IX-782", AI_EXP_LOGO, "DEL", "New Delhi", "T3", "CCU", "Kolkata", "T2", "06:15", "08:30", "2h 15m", 135, 4150, aircraft="Boeing 737-800", policy_type="NON_REFUNDABLE"),
    make_flight("SkyPulse Air", "SP", "SP-804", SKYPULSE_LOGO, "DEL", "New Delhi", "T3", "BOM", "Mumbai", "T2", "17:45", "20:00", "2h 15m", 135, 4799, aircraft="Airbus A320neo", policy_type="FREE_CANCELLATION"),
    # DEL Connecting
    make_flight("IndiGo", "6E", "6E-512", INDIGO_LOGO, "DEL", "New Delhi", "T1D", "GOI", "Goa", "T1", "06:45", "12:15", "5h 30m", 330, 5850, stops=1, stops_text="1 Stop (via BOM)", layover={"code": "BOM", "city": "Mumbai", "duration": "1h 45m"}, aircraft="Airbus A320neo", policy_type="PARTIAL_REFUND"),
    make_flight("Air India", "AI", "AI-428", AI_LOGO, "DEL", "New Delhi", "T3", "CCU", "Kolkata", "T2", "09:15", "15:30", "6h 15m", 375, 5200, stops=1, stops_text="1 Stop (via HYD)", layover={"code": "HYD", "city": "Hyderabad", "duration": "2h 10m"}, aircraft="Airbus A320neo", policy_type="FREE_CANCELLATION"),
    make_flight("Vistara", "UK", "UK-621", VISTARA_LOGO, "DEL", "New Delhi", "T3", "BLR", "Bangalore", "T2", "13:30", "19:10", "5h 40m", 340, 6100, stops=1, stops_text="1 Stop (via BOM)", layover={"code": "BOM", "city": "Mumbai", "duration": "1h 50m"}, aircraft="Airbus A320neo", policy_type="FREE_CANCELLATION"),

    # ==================== BOM (Mumbai) Flights ====================
    make_flight("IndiGo", "6E", "6E-2184", INDIGO_LOGO, "BOM", "Mumbai", "T1", "DEL", "New Delhi", "T3", "06:00", "08:15", "2h 15m", 135, 4400, aircraft="Airbus A321neo", policy_type="PARTIAL_REFUND"),
    make_flight("Air India", "AI", "AI-864", AI_LOGO, "BOM", "Mumbai", "T2", "DEL", "New Delhi", "T3", "18:30", "20:45", "2h 15m", 135, 5100, aircraft="Boeing 787-9 Dreamliner", policy_type="FREE_CANCELLATION"),
    make_flight("Akasa Air", "QP", "QP-1122", AKASA_LOGO, "BOM", "Mumbai", "T1", "GOI", "Goa", "T1", "08:00", "09:10", "1h 10m", 70, 3200, aircraft="Boeing 737 MAX 8", policy_type="FREE_CANCELLATION"),
    make_flight("Vistara", "UK", "UK-851", VISTARA_LOGO, "BOM", "Mumbai", "T2", "BLR", "Bangalore", "T2", "09:45", "11:30", "1h 45m", 105, 4300, aircraft="Airbus A320neo", policy_type="FREE_CANCELLATION"),
    make_flight("Air India Express", "IX", "IX-344", AI_EXP_LOGO, "BOM", "Mumbai", "T2", "HYD", "Hyderabad", "T1", "15:15", "16:45", "1h 30m", 90, 3550, aircraft="Boeing 737-800", policy_type="PARTIAL_REFUND"),
    make_flight("SpiceJet", "SG", "SG-402", SPICE_LOGO, "BOM", "Mumbai", "T1", "CCU", "Kolkata", "T2", "07:10", "09:50", "2h 40m", 160, 4800, aircraft="Boeing 737-800", policy_type="NON_REFUNDABLE"),
    make_flight("SkyPulse Air", "SP", "SP-687", SKYPULSE_LOGO, "BOM", "Mumbai", "T2", "DEL", "New Delhi", "T3", "21:00", "23:15", "2h 15m", 135, 4650, aircraft="Airbus A320neo", policy_type="FREE_CANCELLATION"),
    # BOM Connecting
    make_flight("Air India", "AI", "AI-551", AI_LOGO, "BOM", "Mumbai", "T2", "CCU", "Kolkata", "T2", "10:30", "16:45", "6h 15m", 375, 5750, stops=1, stops_text="1 Stop (via DEL)", layover={"code": "DEL", "city": "New Delhi", "duration": "2h 00m"}, aircraft="Airbus A320neo", policy_type="FREE_CANCELLATION"),
    make_flight("IndiGo", "6E", "6E-789", INDIGO_LOGO, "BOM", "Mumbai", "T1", "GOI", "Goa", "T1", "12:00", "17:30", "5h 30m", 330, 4950, stops=1, stops_text="1 Stop (via BLR)", layover={"code": "BLR", "city": "Bangalore", "duration": "1h 40m"}, aircraft="Airbus A320neo", policy_type="PARTIAL_REFUND"),
    make_flight("Star Air", "S5", "S5-201", STAR_LOGO, "BOM", "Mumbai", "T1", "DEL", "New Delhi", "T3", "14:15", "19:50", "5h 35m", 335, 5350, stops=1, stops_text="1 Stop (via HYD)", layover={"code": "HYD", "city": "Hyderabad", "duration": "1h 35m"}, aircraft="Embraer E175", policy_type="FREE_CANCELLATION"),

    # ==================== BLR (Bangalore) Flights ====================
    make_flight("Air India", "AI", "AI-503", AI_LOGO, "BLR", "Bangalore", "T1", "DEL", "New Delhi", "T3", "06:45", "09:30", "2h 45m", 165, 5299, aircraft="Airbus A320neo", policy_type="FREE_CANCELLATION"),
    make_flight("IndiGo", "6E", "6E-6102", INDIGO_LOGO, "BLR", "Bangalore", "T1", "BOM", "Mumbai", "T2", "08:15", "10:00", "1h 45m", 105, 4100, aircraft="Airbus A320neo", policy_type="PARTIAL_REFUND"),
    make_flight("Star Air", "S5", "S5-114", STAR_LOGO, "BLR", "Bangalore", "T1", "GOI", "Goa", "T1", "11:00", "12:15", "1h 15m", 75, 3400, aircraft="Embraer E175", policy_type="FREE_CANCELLATION"),
    make_flight("Akasa Air", "QP", "QP-1420", AKASA_LOGO, "BLR", "Bangalore", "T2", "HYD", "Hyderabad", "T1", "13:30", "14:40", "1h 10m", 70, 2850, aircraft="Boeing 737 MAX 8", policy_type="FREE_CANCELLATION"),
    make_flight("Air India Express", "IX", "IX-911", AI_EXP_LOGO, "BLR", "Bangalore", "T1", "CCU", "Kolkata", "T2", "16:00", "18:35", "2h 35m", 155, 4750, aircraft="Boeing 737-800", policy_type="PARTIAL_REFUND"),
    make_flight("Vistara", "UK", "UK-808", VISTARA_LOGO, "BLR", "Bangalore", "T2", "DEL", "New Delhi", "T3", "17:30", "20:15", "2h 45m", 165, 5600, aircraft="Airbus A320neo", policy_type="FREE_CANCELLATION"),
    make_flight("SkyPulse Air", "SP", "SP-301", SKYPULSE_LOGO, "BLR", "Bangalore", "T1", "BOM", "Mumbai", "T2", "19:45", "21:30", "1h 45m", 105, 4250, aircraft="Airbus A320neo", policy_type="FREE_CANCELLATION"),
    # BLR Connecting
    make_flight("IndiGo", "6E", "6E-442", INDIGO_LOGO, "BLR", "Bangalore", "T1", "CCU", "Kolkata", "T2", "09:00", "15:20", "6h 20m", 380, 5400, stops=1, stops_text="1 Stop (via HYD)", layover={"code": "HYD", "city": "Hyderabad", "duration": "2h 15m"}, aircraft="Airbus A320neo", policy_type="PARTIAL_REFUND"),
    make_flight("SpiceJet", "SG", "SG-631", SPICE_LOGO, "BLR", "Bangalore", "T1", "DEL", "New Delhi", "T3", "12:15", "18:00", "5h 45m", 345, 5100, stops=1, stops_text="1 Stop (via BOM)", layover={"code": "BOM", "city": "Mumbai", "duration": "1h 45m"}, aircraft="Boeing 737-800", policy_type="PARTIAL_REFUND"),
    make_flight("Air India", "AI", "AI-389", AI_LOGO, "BLR", "Bangalore", "T1", "GOI", "Goa", "T1", "14:30", "19:40", "5h 10m", 310, 4800, stops=1, stops_text="1 Stop (via BOM)", layover={"code": "BOM", "city": "Mumbai", "duration": "1h 30m"}, aircraft="Airbus A320neo", policy_type="FREE_CANCELLATION"),

    # ==================== GOI (Goa) Flights ====================
    make_flight("IndiGo", "6E", "6E-412", INDIGO_LOGO, "GOI", "Goa", "T1", "BOM", "Mumbai", "T2", "10:15", "11:25", "1h 10m", 70, 3150, aircraft="Airbus A320neo", policy_type="PARTIAL_REFUND"),
    make_flight("Air India", "AI", "AI-840", AI_LOGO, "GOI", "Goa", "T1", "DEL", "New Delhi", "T3", "14:20", "17:00", "2h 40m", 160, 5400, aircraft="Airbus A320neo", policy_type="FREE_CANCELLATION"),
    make_flight("Akasa Air", "QP", "QP-1355", AKASA_LOGO, "GOI", "Goa", "T1", "BLR", "Bangalore", "T1", "12:45", "14:00", "1h 15m", 75, 3350, aircraft="Boeing 737 MAX 8", policy_type="FREE_CANCELLATION"),
    make_flight("SpiceJet", "SG", "SG-1082", SPICE_LOGO, "GOI", "Goa", "T1", "HYD", "Hyderabad", "T1", "16:30", "17:55", "1h 25m", 85, 3200, aircraft="Bombardier Q400", policy_type="PARTIAL_REFUND"),
    make_flight("SkyPulse Air", "SP", "SP-141", SKYPULSE_LOGO, "GOI", "Goa", "T1", "BOM", "Mumbai", "T2", "20:15", "21:25", "1h 10m", 70, 3250, aircraft="Airbus A320neo", policy_type="FREE_CANCELLATION"),
    # GOI Connecting
    make_flight("Air India Express", "IX", "IX-504", AI_EXP_LOGO, "GOI", "Goa", "T1", "CCU", "Kolkata", "T2", "08:30", "14:45", "6h 15m", 375, 5650, stops=1, stops_text="1 Stop (via BOM)", layover={"code": "BOM", "city": "Mumbai", "duration": "2h 00m"}, aircraft="Boeing 737-800", policy_type="NON_REFUNDABLE"),
    make_flight("Vistara", "UK", "UK-714", VISTARA_LOGO, "GOI", "Goa", "T1", "DEL", "New Delhi", "T3", "11:45", "17:30", "5h 45m", 345, 6200, stops=1, stops_text="1 Stop (via BOM)", layover={"code": "BOM", "city": "Mumbai", "duration": "1h 40m"}, aircraft="Airbus A320neo", policy_type="FREE_CANCELLATION"),
    make_flight("Star Air", "S5", "S5-320", STAR_LOGO, "GOI", "Goa", "T1", "HYD", "Hyderabad", "T1", "15:00", "20:10", "5h 10m", 310, 4600, stops=1, stops_text="1 Stop (via BLR)", layover={"code": "BLR", "city": "Bangalore", "duration": "1h 50m"}, aircraft="Embraer E175", policy_type="FREE_CANCELLATION"),

    # ==================== HYD (Hyderabad) Flights ====================
    make_flight("IndiGo", "6E", "6E-554", INDIGO_LOGO, "HYD", "Hyderabad", "T1", "DEL", "New Delhi", "T1D", "07:30", "09:45", "2h 15m", 135, 4200, aircraft="Airbus A320neo", policy_type="PARTIAL_REFUND"),
    make_flight("Air India", "AI", "AI-542", AI_LOGO, "HYD", "Hyderabad", "T1", "BOM", "Mumbai", "T2", "09:00", "10:30", "1h 30m", 90, 3850, aircraft="Airbus A320neo", policy_type="FREE_CANCELLATION"),
    make_flight("Vistara", "UK", "UK-872", VISTARA_LOGO, "HYD", "Hyderabad", "T1", "BLR", "Bangalore", "T2", "11:15", "12:25", "1h 10m", 70, 3100, aircraft="Airbus A320neo", policy_type="FREE_CANCELLATION"),
    make_flight("Air India Express", "IX", "IX-614", AI_EXP_LOGO, "HYD", "Hyderabad", "T1", "CCU", "Kolkata", "T2", "14:00", "16:10", "2h 10m", 130, 4300, aircraft="Boeing 737-800", policy_type="NON_REFUNDABLE"),
    make_flight("SpiceJet", "SG", "SG-214", SPICE_LOGO, "HYD", "Hyderabad", "T1", "GOI", "Goa", "T1", "17:00", "18:25", "1h 25m", 85, 3400, aircraft="Boeing 737-800", policy_type="PARTIAL_REFUND"),
    make_flight("Star Air", "S5", "S5-180", STAR_LOGO, "HYD", "Hyderabad", "T1", "BOM", "Mumbai", "T1", "19:30", "21:00", "1h 30m", 90, 3700, aircraft="Embraer E175", policy_type="FREE_CANCELLATION"),
    make_flight("SkyPulse Air", "SP", "SP-422", SKYPULSE_LOGO, "HYD", "Hyderabad", "T1", "DEL", "New Delhi", "T3", "21:15", "23:30", "2h 15m", 135, 4150, aircraft="Airbus A320neo", policy_type="FREE_CANCELLATION"),
    # HYD Connecting
    make_flight("Akasa Air", "QP", "QP-1502", AKASA_LOGO, "HYD", "Hyderabad", "T1", "DEL", "New Delhi", "T3", "10:00", "15:45", "5h 45m", 345, 4900, stops=1, stops_text="1 Stop (via BOM)", layover={"code": "BOM", "city": "Mumbai", "duration": "1h 45m"}, aircraft="Boeing 737 MAX 8", policy_type="FREE_CANCELLATION"),
    make_flight("IndiGo", "6E", "6E-881", INDIGO_LOGO, "HYD", "Hyderabad", "T1", "CCU", "Kolkata", "T2", "12:30", "18:15", "5h 45m", 345, 5100, stops=1, stops_text="1 Stop (via BLR)", layover={"code": "BLR", "city": "Bangalore", "duration": "2h 00m"}, aircraft="Airbus A320neo", policy_type="PARTIAL_REFUND"),

    # ==================== CCU (Kolkata) Flights ====================
    make_flight("Air India", "AI", "AI-765", AI_LOGO, "CCU", "Kolkata", "T2", "DEL", "New Delhi", "T3", "06:30", "08:50", "2h 20m", 140, 4950, aircraft="Airbus A320neo", policy_type="FREE_CANCELLATION"),
    make_flight("IndiGo", "6E", "6E-382", INDIGO_LOGO, "CCU", "Kolkata", "T2", "BOM", "Mumbai", "T2", "08:45", "11:20", "2h 35m", 155, 4800, aircraft="Airbus A320neo", policy_type="PARTIAL_REFUND"),
    make_flight("Air India Express", "IX", "IX-209", AI_EXP_LOGO, "CCU", "Kolkata", "T2", "BLR", "Bangalore", "T1", "11:30", "14:05", "2h 35m", 155, 4600, aircraft="Boeing 737-800", policy_type="PARTIAL_REFUND"),
    make_flight("SpiceJet", "SG", "SG-517", SPICE_LOGO, "CCU", "Kolkata", "T1", "HYD", "Hyderabad", "T1", "14:15", "16:30", "2h 15m", 135, 4100, aircraft="Boeing 737-800", policy_type="NON_REFUNDABLE"),
    make_flight("SkyPulse Air", "SP", "SP-901", SKYPULSE_LOGO, "CCU", "Kolkata", "T2", "DEL", "New Delhi", "T3", "18:00", "20:20", "2h 20m", 140, 4850, aircraft="Airbus A320neo", policy_type="FREE_CANCELLATION"),
    # CCU Connecting
    make_flight("Vistara", "UK", "UK-720", VISTARA_LOGO, "CCU", "Kolkata", "T2", "GOI", "Goa", "T1", "09:30", "15:45", "6h 15m", 375, 6400, stops=1, stops_text="1 Stop (via DEL)", layover={"code": "DEL", "city": "New Delhi", "duration": "1h 50m"}, aircraft="Airbus A320neo", policy_type="FREE_CANCELLATION"),
    make_flight("Akasa Air", "QP", "QP-1612", AKASA_LOGO, "CCU", "Kolkata", "T1", "BOM", "Mumbai", "T2", "13:00", "19:15", "6h 15m", 375, 5500, stops=1, stops_text="1 Stop (via BLR)", layover={"code": "BLR", "city": "Bangalore", "duration": "2h 10m"}, aircraft="Boeing 737 MAX 8", policy_type="FREE_CANCELLATION"),
    make_flight("Air India", "AI", "AI-622", AI_LOGO, "CCU", "Kolkata", "T2", "GOI", "Goa", "T1", "15:30", "21:40", "6h 10m", 370, 6100, stops=1, stops_text="1 Stop (via BOM)", layover={"code": "BOM", "city": "Mumbai", "duration": "1h 45m"}, aircraft="Airbus A320neo", policy_type="FREE_CANCELLATION"),
]


def seed_database(force=False):
    """
    Seeds initial airlines, policies, and rich domestic flight data across all supported cities.
    Uses upsert by flight_number so existing flights/bookings are never destroyed.
    """
    try:
        # Seed / Upsert Airlines
        for airline in AIRLINES_DATA:
            airlines_col.update_one(
                {"code": airline["code"]},
                {"$set": airline},
                upsert=True,
            )
        logger.info("Upserted %d airlines", len(AIRLINES_DATA))

        # Seed / Upsert Policies
        for policy in POLICIES_DATA:
            policies_col.update_one(
                {"policy_id": policy["policy_id"]},
                {"$set": policy},
                upsert=True,
            )
        logger.info("Upserted %d policies", len(POLICIES_DATA))

        # Seed / Upsert Flights
        now = datetime.now(timezone.utc)
        upserted_count = 0
        for f in INITIAL_FLIGHTS:
            f_copy = dict(f)
            f_num = f_copy["flight_number"]
            flights_col.update_one(
                {"flight_number": f_num},
                {
                    "$set": f_copy,
                    "$setOnInsert": {"created_at": now},
                },
                upsert=True,
            )
            upserted_count += 1

        logger.info("Successfully seeded/upserted %d domestic flights into MongoDB", upserted_count)

        # Seed / Confirm Permanent Admin User
        admin_email = "shauryarazor25@gmail.com"
        users_col.update_one(
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
        logger.info("Admin user %s confirmed in MongoDB", admin_email)

        return True
    except Exception as e:
        logger.error("Database seeding failed: %s", e)
        return False


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("Running database seed with expanded airlines and cities...")
    res = seed_database(force=False)
    total = flights_col.count_documents({})
    print(f"Seed completed: {res}. Total flights in MongoDB: {total}")
