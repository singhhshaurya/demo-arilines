import apiClient from './client'

export { apiClient, API_BASE_URL } from './client'
export { MOCK_FLIGHTS, searchFlights, getFlightById, viewFlightStatus } from './flights'
export { createBooking, getBookingByPNR, cancelBooking, getMyBookings } from './bookings'
export { createPaymentOrder } from './payments'
export {
  adminGetFlights,
  adminGetFlight,
  adminAddFlight,
  adminUpdateFlight,
  adminDeleteFlight,
  adminUpdateSchedule,
  adminDelayFlight,
  adminUpdateFlightStatus,
  adminGetBookings,
} from './admin'
export { googleSignIn } from './auth'

export default apiClient
