import apiClient from './client'
import { MOCK_FLIGHTS } from './flights'

export const adminGetFlights = async (password) => {
  try {
    const res = await apiClient.get('/admin/flights', {
      headers: password ? { 'x-admin-password': password } : {},
    })
    return res.data?.flights || res.data || []
  } catch (err) {
    console.warn('Backend adminGetFlights failed, returning mock flights:', err)
    const localFlights = JSON.parse(localStorage.getItem('skypulse_admin_flights') || 'null')
    return localFlights || MOCK_FLIGHTS
  }
}

export const adminGetFlight = async (flightId, password) => {
  try {
    const res = await apiClient.get(`/admin/flights/${flightId}`, {
      headers: password ? { 'x-admin-password': password } : {},
    })
    return res.data?.flight || res.data
  } catch (err) {
    console.warn('Backend adminGetFlight failed, looking in mock flights:', err)
    return MOCK_FLIGHTS.find((f) => f.flight_number === flightId || f._id === flightId || f.id === flightId)
  }
}

export const adminAddFlight = async (flightData, password) => {
  try {
    const res = await apiClient.post('/admin/flights', flightData, {
      headers: password ? { 'x-admin-password': password } : {},
    })
    return res.data
  } catch (err) {
    console.warn('Backend adminAddFlight failed, adding locally:', err)
    const localFlights = JSON.parse(localStorage.getItem('skypulse_admin_flights') || JSON.stringify(MOCK_FLIGHTS))
    const flightId = flightData.flight_number || `SP-${Math.floor(100 + Math.random() * 900)}`
    const newFlight = {
      _id: `fl-${Date.now()}`,
      id: `fl-${Date.now()}`,
      flight_id: flightId,
      flight_number: flightId,
      status: 'ON_TIME',
      delay_minutes: 0,
      departure_delay_minutes: 0,
      arrival_delay_minutes: 0,
      ...flightData,
    }
    localFlights.unshift(newFlight)
    localStorage.setItem('skypulse_admin_flights', JSON.stringify(localFlights))
    return { success: true, flight: newFlight }
  }
}

export const adminUpdateFlight = async (flightId, flightData, password) => {
  try {
    const res = await apiClient.put(`/admin/flights/${flightId}`, flightData, {
      headers: password ? { 'x-admin-password': password } : {},
    })
    return res.data
  } catch (err) {
    console.warn('Backend adminUpdateFlight failed, updating locally:', err)
    const localFlights = JSON.parse(localStorage.getItem('skypulse_admin_flights') || JSON.stringify(MOCK_FLIGHTS))
    const idx = localFlights.findIndex(
      (f) => f._id === flightId || f.id === flightId || f.flight_number === flightId
    )
    if (idx !== -1) {
      localFlights[idx] = { ...localFlights[idx], ...flightData }
      localStorage.setItem('skypulse_admin_flights', JSON.stringify(localFlights))
      return { success: true, flight: localFlights[idx] }
    }
    throw err
  }
}

export const adminDeleteFlight = async (flightId, password) => {
  try {
    const res = await apiClient.delete(`/admin/flights/${flightId}`, {
      headers: password ? { 'x-admin-password': password } : {},
    })
    return res.data
  } catch (err) {
    console.warn('Backend adminDeleteFlight failed, deleting locally:', err)
    const localFlights = JSON.parse(localStorage.getItem('skypulse_admin_flights') || JSON.stringify(MOCK_FLIGHTS))
    const filtered = localFlights.filter(
      (f) => f._id !== flightId && f.id !== flightId && f.flight_number !== flightId
    )
    localStorage.setItem('skypulse_admin_flights', JSON.stringify(filtered))
    return { success: true, message: `Flight ${flightId} deleted locally.` }
  }
}

export const adminUpdateSchedule = async (flightId, scheduleData, password) => {
  try {
    const res = await apiClient.put(`/admin/flights/${flightId}/schedule`, scheduleData, {
      headers: password ? { 'x-admin-password': password } : {},
    })
    return res.data
  } catch (err) {
    console.warn('Backend adminUpdateSchedule failed, updating locally:', err)
    return adminUpdateFlight(flightId, scheduleData, password)
  }
}

export const adminDelayFlight = async (flightId, delayData, password) => {
  try {
    const res = await apiClient.put(`/admin/flights/${flightId}/delay`, delayData, {
      headers: password ? { 'x-admin-password': password } : {},
    })
    return res.data
  } catch (err) {
    console.warn('Backend adminDelayFlight failed, updating locally:', err)
    const delayMinutes = delayData.delay_minutes || delayData.departure_delay_minutes || 0
    return adminUpdateFlightStatus(flightId, delayMinutes > 0 ? 'DELAYED' : 'ON_TIME', delayMinutes, password)
  }
}

export const adminUpdateFlightStatus = async (id, status, delayMinutes = 0, password) => {
  try {
    const res = await apiClient.put(
      `/admin/flights/${id}/status`,
      { status, delay_minutes: delayMinutes },
      { headers: password ? { 'x-admin-password': password } : {} }
    )
    return res.data
  } catch (err) {
    console.warn('Backend adminUpdateFlightStatus failed, updating local state:', err)
    const localFlights = JSON.parse(localStorage.getItem('skypulse_admin_flights') || JSON.stringify(MOCK_FLIGHTS))
    const updated = localFlights.map((f) => {
      if (f._id === id || f.id === id || f.flight_number === id) {
        return {
          ...f,
          status,
          delay_minutes: delayMinutes,
          departure_delay_minutes: delayMinutes,
          arrival_delay_minutes: delayMinutes,
        }
      }
      return f
    })
    localStorage.setItem('skypulse_admin_flights', JSON.stringify(updated))
    return { success: true, updatedFlight: updated.find((f) => f._id === id || f.id === id || f.flight_number === id) }
  }
}

export const adminGetBookings = async (password) => {
  try {
    const res = await apiClient.get('/admin/bookings', {
      headers: password ? { 'x-admin-password': password } : {},
    })
    return res.data?.bookings || res.data || []
  } catch (err) {
    console.warn('Backend adminGetBookings failed, returning local bookings:', err)
    const saved = JSON.parse(localStorage.getItem('skypulse_demo_bookings') || '[]')
    return saved
  }
}
