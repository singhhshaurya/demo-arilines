import apiClient from './client'
import { MOCK_FLIGHTS } from './flights'

export const createBooking = async (data) => {
  try {
    const res = await apiClient.post('/bookings', data)
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
    const saved = JSON.parse(localStorage.getItem('skypulse_demo_bookings') || '[]')
    saved.unshift(mockBooking)
    localStorage.setItem('skypulse_demo_bookings', JSON.stringify(saved))
    return { booking: mockBooking, pnr }
  }
}

export const getBookingByPNR = async (pnr, email) => {
  try {
    const res = await apiClient.get(`/bookings/pnr/${pnr}`, {
      params: email ? { email } : {},
    })
    return res.data?.booking ? res.data : { booking: res.data }
  } catch (err) {
    console.warn('Backend getBookingByPNR failed, checking local demo storage:', err)
    const saved = JSON.parse(localStorage.getItem('skypulse_demo_bookings') || '[]')
    const found = saved.find(
      (b) => b.pnr?.toUpperCase() === pnr?.toUpperCase()
    )
    if (found) return { booking: found }

    return {
      booking: {
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
      },
    }
  }
}

export const cancelBooking = async (pnr, email) => {
  try {
    const res = await apiClient.post(`/bookings/pnr/${pnr}/cancel`, { email })
    return res.data
  } catch (err) {
    console.warn('Backend cancelBooking failed, simulating cancellation:', err)
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
    const res = await apiClient.get('/bookings/my')
    return res.data?.bookings || res.data || []
  } catch (err) {
    console.warn('Backend getMyBookings failed, returning local demo bookings:', err)
    const saved = JSON.parse(localStorage.getItem('skypulse_demo_bookings') || '[]')
    return saved
  }
}
