# SkyPulse Airlines — Demo Portal

A realistic demo flight booking website for showcasing payment and cancellation flows.
Built to support TinyFish autonomous web agent testing.

---

## Stack
- **Frontend**: React + Vite (port 5000)
- **Backend**: Flask (port 9000)
- **Database**: MongoDB (`skypulse_db`)
- **Auth**: Google OAuth 2.0
- **Payments**: Razorpay (Test/Sandbox mode)

---

## Setup

### 1. Environment Variables
```bash
cp .env.example .env
# Fill in your credentials in .env
```

### 2. Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
python app.py
```
Backend runs at: http://localhost:9000
Swagger docs at: http://localhost:9000/api/docs

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at: http://localhost:5000

---

## Demo Flows

### Payment Flow
1. Go to http://localhost:5000
2. Search any flight (e.g. DEL → BOM)
3. Click "Book Now" on any flight card
4. Fill passenger details
5. Click "Pay with Razorpay" — use test card `4111 1111 1111 1111`
6. Receive PNR confirmation

### Cancellation Flow
1. Note the PNR from confirmation
2. Go to http://localhost:5000/manage
3. Enter PNR + email
4. See refund preview based on cancellation policy
5. Confirm cancellation — see receipt

### Admin / Delay Simulator
1. Go to http://localhost:5000/admin
2. Enter admin password (set in .env as ADMIN_PASSWORD)
3. Use "Delay Simulator" tab to:
   - Mark any flight as DELAYED (+X minutes)
   - Mark as CANCELLED_BY_AIRLINE
4. Passengers can then cancel and see affected refund

---

## Cancellation Policies
- **Free Cancellation**: 100% refund up to 24h before departure
- **Partial Refund**: ₹2,500 fee if cancelled within 48h  
- **Non-refundable**: No refund

---

## API Endpoints
See full docs at: http://localhost:9000/api/docs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/flights/search | Search flights |
| GET | /api/flights/:id | Flight details |
| POST | /api/payments/create-order | Create Razorpay order |
| POST | /api/bookings | Confirm booking |
| GET | /api/bookings/pnr/:pnr | Get booking by PNR |
| POST | /api/bookings/pnr/:pnr/cancel | Cancel booking |
| POST | /api/auth/google | Google sign-in |
| GET | /api/admin/flights | Admin: all flights |
| PUT | /api/admin/flights/:id/status | Admin: update status |

---

## Test Razorpay Credentials
- Card: `4111 1111 1111 1111`
- Expiry: Any future date
- CVV: Any 3 digits
- OTP: `1234` (if prompted)
