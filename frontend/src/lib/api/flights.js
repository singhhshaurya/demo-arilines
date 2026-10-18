import apiClient from './client'

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
  },
]

export const searchFlights = async (origin, dest, date, passengers = 1, classType = 'economy') => {
  try {
    const res = await apiClient.get('/flights/search', {
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
    const res = await apiClient.get(`/flights/${id}`)
    return res.data?.flight || res.data
  } catch (err) {
    console.warn('Backend getFlightById failed, using mock flight:', err)
    return MOCK_FLIGHTS.find((f) => f._id === id || f.id === id) || MOCK_FLIGHTS[0]
  }
}

export const viewFlightStatus = async (flightId, date, origin) => {
  try {
    const res = await apiClient.get('/flights/status', {
      params: {
        flight_id: flightId,
        date: date || '',
        origin: origin || '',
      },
    })
    return res.data?.flight || res.data
  } catch (err) {
    console.warn('Backend viewFlightStatus failed, checking mock fallback:', err)
    const match = MOCK_FLIGHTS.find(
      (f) =>
        f.flight_number?.toUpperCase() === flightId?.toUpperCase() ||
        f.id?.toUpperCase() === flightId?.toUpperCase() ||
        f._id === flightId
    )
    if (match) {
      return {
        ...match,
        date: date || match.date,
        origin: origin || match.origin,
      }
    }
    throw err
  }
}

