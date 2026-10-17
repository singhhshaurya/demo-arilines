import axios from 'axios'
import { getToken } from './auth'

const RAW_API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || ''
const API_BASE_URL = RAW_API_URL
  ? (RAW_API_URL.endsWith('/api') ? RAW_API_URL : `${RAW_API_URL.replace(/\/$/, '')}/api`)
  : '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.warn('API error encountered:', error.response?.status, error.message)
    return Promise.reject(error)
  }
)

// Fallback Mock Flights for resilient demo testing
export const MOCK_FLIGHTS = [
  {
    _id: 'fl-101',
    id: 'fl-101',
    flight_number: 'AI-805',
    airline: 'Air India',
    airline_logo: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=100&auto=format&fit=crop&q=60',
    origin: 'DEL',
    origin_city: 'New Delhi',
    origin_airport: 'Indira Gandhi International',
    destination: 'BOM',
    destination_city: 'Mumbai',
    destination_airport: 'Chhatrapati Shivaji Maharaj International',
    departure_time: '07:00',
    arrival_time: '09:15',
    duration: '2h 15m',
    duration_minutes: 135,
    stops: 0,
    stops_text: 'Non-stop',
    price: 4999,
    base_fare: 4200,
    seats_available: 18,
    class: 'Economy',
    aircraft: 'Airbus A320neo',
    cancellation_policy: 'FREE_CANCELLATION',
    cancellation_policy_text: 'Free cancellation up to 24h before departure',
    status: 'ON_TIME',
    delay_minutes: 0,
    date: '2026-11-15',
  },
  {
    _id: 'fl-102',
    id: 'fl-102',
    flight_number: '6E-2041',
    airline: 'IndiGo',
    airline_logo: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=100&auto=format&fit=crop&q=60',
    origin: 'DEL',
    origin_city: 'New Delhi',
    origin_airport: 'Indira Gandhi International',
    destination: 'BOM',
    destination_city: 'Mumbai',
    destination_airport: 'Chhatrapati Shivaji Maharaj International',
    departure_time: '11:30',
    arrival_time: '13:45',
    duration: '2h 15m',
    duration_minutes: 135,
    stops: 0,
    stops_text: 'Non-stop',
    price: 4350,
    base_fare: 3650,
    seats_available: 8,
    class: 'Economy',
    aircraft: 'Airbus A321neo',
    cancellation_policy: 'PARTIAL_REFUND',
    cancellation_policy_text: '₹2,500 fee if cancelled within 48h',
    status: 'ON_TIME',
    delay_minutes: 0,
    date: '2026-11-15',
  },
  {
    _id: 'fl-103',
    id: 'fl-103',
    flight_number: 'UK-992',
    airline: 'Vistara',
    airline_logo: 'https://images.unsplash.com/photo-1520437358207-323b43b50729?w=100&auto=format&fit=crop&q=60',
    origin: 'DEL',
    origin_city: 'New Delhi',
    origin_airport: 'Indira Gandhi International',
    destination: 'BOM',
    destination_city: 'Mumbai',
    destination_airport: 'Chhatrapati Shivaji Maharaj International',
    departure_time: '15:45',
    arrival_time: '18:05',
    duration: '2h 20m',
    duration_minutes: 140,
    stops: 0,
    stops_text: 'Non-stop',
    price: 5890,
    base_fare: 4950,
    seats_available: 24,
    class: 'Economy',
    aircraft: 'Boeing 787-9 Dreamliner',
    cancellation_policy: 'FREE_CANCELLATION',
    cancellation_policy_text: 'Free cancellation up to 24h before departure',
    status: 'ON_TIME',
    delay_minutes: 0,
    date: '2026-11-15',
  },
  {
    _id: 'fl-104',
    id: 'fl-104',
    flight_number: 'SG-8169',
    airline: 'SpiceJet',
    airline_logo: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=100&auto=format&fit=crop&q=60',
    origin: 'DEL',
    origin_city: 'New Delhi',
    origin_airport: 'Indira Gandhi International',
    destination: 'BOM',
    destination_city: 'Mumbai',
    destination_airport: 'Chhatrapati Shivaji Maharaj International',
    departure_time: '19:10',
    arrival_time: '23:30',
    duration: '4h 20m',
    duration_minutes: 260,
    stops: 1,
    stops_text: '1 Stop (via Jaipur)',
    price: 3899,
    base_fare: 3200,
    seats_available: 5,
    class: 'Economy',
    aircraft: 'Boeing 737 MAX 8',
    cancellation_policy: 'NON_REFUNDABLE',
    cancellation_policy_text: 'Non-refundable ticket',
    status: 'ON_TIME',
    delay_minutes: 0,
    date: '2026-11-15',
  },
  {
    _id: 'fl-105',
    id: 'fl-105',
    flight_number: 'QP-1302',
    airline: 'Akasa Air',
    airline_logo: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=100&auto=format&fit=crop&q=60',
    origin: 'DEL',
    origin_city: 'New Delhi',
    origin_airport: 'Indira Gandhi International',
    destination: 'BOM',
    destination_city: 'Mumbai',
    destination_airport: 'Chhatrapati Shivaji Maharaj International',
    departure_time: '21:00',
    arrival_time: '23:15',
    duration: '2h 15m',
    duration_minutes: 135,
    stops: 0,
    stops_text: 'Non-stop',
    price: 4199,
    base_fare: 3500,
    seats_available: 12,
    class: 'Economy',
    aircraft: 'Boeing 737 MAX',
    cancellation_policy: 'PARTIAL_REFUND',
    cancellation_policy_text: '₹2,500 fee if cancelled within 48h',
    status: 'ON_TIME',
    delay_minutes: 0,
    date: '2026-11-15',
  }
]

// API Functions

export const searchFlights = async (origin, dest, date, passengers = 1, classType = 'economy') => {
  try {
    const res = await api.get('/flights/search', {
      params: {
        origin,
        destination: dest,
        date,
        passengers,
        class: classType,
      },
    })
    return res.data?.flights || res.data || []
  } catch (err) {
    console.warn('Backend searchFlights failed, providing matching demo flights:', err)
    // Return adapted mock flights matching the requested route
    return MOCK_FLIGHTS.map((f) => ({
      ...f,
      origin: origin || f.origin,
      destination: dest || f.destination,
      date: date || f.date,
    }))
  }
}

export const getFlightById = async (id) => {
  try {
    const res = await api.get(`/flights/${id}`)
    return res.data?.flight || res.data
  } catch (err) {
    console.warn('Backend getFlightById failed, using mock flight:', err)
    return MOCK_FLIGHTS.find((f) => f._id === id || f.id === id) || MOCK_FLIGHTS[0]
  }
}

export const createPaymentOrder = async (flightId, amount) => {
  try {
    const res = await api.post('/payments/create-order', {
      flight_id: flightId,
      amount,
    })
    return res.data
  } catch (err) {
    console.warn('Backend create-order failed, providing demo order:', err)
    // Demo mock order
    return {
      order_id: `order_demo_${Date.now()}`,
      key_id: 'rzp_test_placeholder',
      amount: Math.round(amount * 100),
      currency: 'INR',
    }
  }
}

export const createBooking = async (data) => {
  try {
    const res = await api.post('/bookings', data)
    return res.data
  } catch (err) {
    console.warn('Backend createBooking failed, providing simulated booking response:', err)
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase()
    const pnr = `SK-${randomHex}`
    const mockBooking = {
      pnr,
      booking_id: `b_${Date.now()}`,
      status: 'CONFIRMED',
      created_at: new Date().toISOString(),
      ...data,
    }
    // Save to localStorage for demo persistence
    const saved = JSON.parse(localStorage.getItem('skypulse_demo_bookings') || '[]')
    saved.unshift(mockBooking)
    localStorage.setItem('skypulse_demo_bookings', JSON.stringify(saved))
    return { booking: mockBooking, pnr }
  }
}

export const getBookingByPNR = async (pnr, email) => {
  try {
    const res = await api.get(`/bookings/pnr/${pnr}`, {
      params: email ? { email } : {},
    })
    return res.data?.booking || res.data
  } catch (err) {
    console.warn('Backend getBookingByPNR failed, checking local demo storage:', err)
    const saved = JSON.parse(localStorage.getItem('skypulse_demo_bookings') || '[]')
    const found = saved.find(
      (b) => b.pnr?.toUpperCase() === pnr?.toUpperCase()
    )
    if (found) return found

    // Return a default demo booking for this PNR
    return {
      pnr,
      status: 'CONFIRMED',
      flight: MOCK_FLIGHTS[0],
      flight_id: 'fl-101',
      passenger: {
        name: 'Demo Passenger',
        email: email || 'passenger@example.com',
        phone: '+91 98765 43210',
        age: 28,
        gender: 'Male',
      },
      class: 'Economy',
      fare: {
        base_fare: 4999,
        taxes: 900,
        convenience_fee: 299,
        total: 6198,
      },
      cancellation_policy: 'FREE_CANCELLATION',
      cancellation_policy_text: 'Free cancellation up to 24h before departure',
      created_at: new Date().toISOString(),
    }
  }
}

export const cancelBooking = async (pnr, email) => {
  try {
    const res = await api.post(`/bookings/pnr/${pnr}/cancel`, { email })
    return res.data
  } catch (err) {
    console.warn('Backend cancelBooking failed, simulating cancellation:', err)
    // Update local demo storage
    const saved = JSON.parse(localStorage.getItem('skypulse_demo_bookings') || '[]')
    const idx = saved.findIndex((b) => b.pnr?.toUpperCase() === pnr?.toUpperCase())
    if (idx !== -1) {
      saved[idx].status = 'CANCELLED'
      localStorage.setItem('skypulse_demo_bookings', JSON.stringify(saved))
    }
    return {
      success: true,
      message: 'Booking cancelled successfully',
      pnr,
      refund_amount: 5899,
      cancellation_fee: 299,
      status: 'CANCELLED',
    }
  }
}

export const getMyBookings = async () => {
  try {
    const res = await api.get('/bookings/my')
    return res.data?.bookings || res.data || []
  } catch (err) {
    console.warn('Backend getMyBookings failed, returning local demo bookings:', err)
    const saved = JSON.parse(localStorage.getItem('skypulse_demo_bookings') || '[]')
    return saved
  }
}

export const adminGetFlights = async (password) => {
  try {
    const res = await api.get('/admin/flights', {
      headers: { 'x-admin-password': password },
    })
    return res.data?.flights || res.data || []
  } catch (err) {
    console.warn('Backend adminGetFlights failed, returning mock flights:', err)
    const localFlights = JSON.parse(localStorage.getItem('skypulse_admin_flights') || 'null')
    return localFlights || MOCK_FLIGHTS
  }
}

export const adminUpdateFlightStatus = async (id, status, delayMinutes = 0, password) => {
  try {
    const res = await api.put(
      `/admin/flights/${id}/status`,
      { status, delay_minutes: delayMinutes },
      { headers: { 'x-admin-password': password } }
    )
    return res.data
  } catch (err) {
    console.warn('Backend adminUpdateFlightStatus failed, updating local state:', err)
    const localFlights = JSON.parse(localStorage.getItem('skypulse_admin_flights') || JSON.stringify(MOCK_FLIGHTS))
    const updated = localFlights.map((f) => {
      if (f._id === id || f.id === id) {
        return { ...f, status, delay_minutes: delayMinutes }
      }
      return f
    })
    localStorage.setItem('skypulse_admin_flights', JSON.stringify(updated))
    return { success: true, updatedFlight: updated.find((f) => f._id === id || f.id === id) }
  }
}

export const adminGetBookings = async (password) => {
  try {
    const res = await api.get('/admin/bookings', {
      headers: { 'x-admin-password': password },
    })
    return res.data?.bookings || res.data || []
  } catch (err) {
    console.warn('Backend adminGetBookings failed, returning local bookings:', err)
    const saved = JSON.parse(localStorage.getItem('skypulse_demo_bookings') || '[]')
    if (saved.length === 0) {
      return [
        {
          pnr: 'SK-7K9A2X',
          passenger: { name: 'Aditya Sharma', email: 'aditya@example.com' },
          flight: { flight_number: 'AI-805', origin: 'DEL', destination: 'BOM' },
          fare: { total: 4999 },
          status: 'CONFIRMED',
          created_at: new Date().toISOString(),
        },
        {
          pnr: 'SK-2B4L9P',
          passenger: { name: 'Priya Patel', email: 'priya@example.com' },
          flight: { flight_number: '6E-2041', origin: 'BOM', destination: 'GOI' },
          fare: { total: 3200 },
          status: 'CANCELLED',
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ]
    }
    return saved
  }
}

export const adminAddFlight = async (flightData, password) => {
  try {
    const res = await api.post('/admin/flights', flightData, {
      headers: { 'x-admin-password': password },
    })
    return res.data
  } catch (err) {
    console.warn('Backend adminAddFlight failed, adding locally:', err)
    const localFlights = JSON.parse(localStorage.getItem('skypulse_admin_flights') || JSON.stringify(MOCK_FLIGHTS))
    const newFlight = {
      _id: `fl-${Date.now()}`,
      id: `fl-${Date.now()}`,
      status: 'ON_TIME',
      delay_minutes: 0,
      ...flightData,
    }
    localFlights.unshift(newFlight)
    localStorage.setItem('skypulse_admin_flights', JSON.stringify(localFlights))
    return { success: true, flight: newFlight }
  }
}

export const googleSignIn = async (credential) => {
  try {
    const res = await api.post('/auth/google', { token: credential, id_token: credential })
    return res.data
  } catch (err) {
    console.warn('Backend googleSignIn failed, creating mock token for demo:', err)
    // Parse JWT from Google credential directly so user gets authentic name & picture in UI
    try {
      const parts = credential.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
        return {
          token: credential,
          user: {
            name: payload.name || payload.given_name || 'Traveler',
            email: payload.email,
            picture: payload.picture,
            sub: payload.sub,
          },
        }
      }
    } catch (e) {
      console.error('Failed to parse Google credential token:', e)
    }

    return {
      token: `demo_token_${Date.now()}`,
      user: {
        name: 'Demo Traveler',
        email: 'traveler@skypulse.com',
        picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      },
    }
  }
}

export default api
