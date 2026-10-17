import React, { useState, useEffect } from 'react'
import {
  adminGetFlights,
  adminUpdateFlightStatus,
  adminGetBookings,
  adminAddFlight,
  googleSignIn,
} from '../lib/api'
import { getUser, setToken, clearToken } from '../lib/auth'
import GoogleAuthButton from '../components/GoogleAuthButton'
import {
  ShieldAlert,
  Plane,
  Clock,
  AlertTriangle,
  PlusCircle,
  Users,
  CheckCircle2,
  RefreshCw,
  Radio,
  Lock,
  LogOut,
  UserCheck,
  KeyRound,
} from 'lucide-react'

const REQUIRED_ADMIN_EMAIL = 'shauryarazor25@gmail.com'

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState(getUser())
  const [password, setPassword] = useState('admin123')
  const [activeTab, setActiveTab] = useState('simulator') // 'simulator', 'bookings', 'add-flight'

  // Data states
  const [flights, setFlights] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  // New flight form state
  const [newFlight, setNewFlight] = useState({
    airline: 'Air India',
    airline_code: 'AI',
    flight_number: 'AI-910',
    origin: 'DEL',
    origin_city: 'New Delhi',
    destination: 'BOM',
    destination_city: 'Mumbai',
    departure_time: '10:00',
    arrival_time: '12:15',
    duration: '2h 15m',
    price: 4999,
    seats_available: 45,
    aircraft: 'Airbus A320neo',
    cancellation_policy: 'FREE_CANCELLATION',
  })

  const isAdmin = currentUser?.email?.trim().toLowerCase() === REQUIRED_ADMIN_EMAIL

  const loadData = async () => {
    if (!isAdmin) return
    setLoading(true)
    try {
      const [flightList, bookingList] = await Promise.all([
        adminGetFlights(password),
        adminGetBookings(password),
      ])
      setFlights(flightList)
      setBookings(bookingList)
    } catch (err) {
      console.error('Failed to load admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [currentUser])

  const handleStatusChange = async (flightId, newStatus, delayMinutes = 0) => {
    try {
      await adminUpdateFlightStatus(flightId, newStatus, delayMinutes, password)
      setStatusMessage(`Flight ${flightId} updated to ${newStatus} (${delayMinutes}m delay)`)
      setTimeout(() => setStatusMessage(''), 4000)
      loadData()
    } catch (err) {
      alert('Failed to update flight status')
    }
  }

  const handleCreateFlight = async (e) => {
    e.preventDefault()
    try {
      await adminAddFlight(newFlight, password)
      setStatusMessage(`Flight ${newFlight.flight_number} created successfully!`)
      setTimeout(() => setStatusMessage(''), 4000)
      setActiveTab('simulator')
      loadData()
    } catch (err) {
      alert('Failed to add flight.')
    }
  }

  const handleSimulateAdminLogin = async () => {
    const adminPayload = {
      name: 'Shaurya Admin',
      email: REQUIRED_ADMIN_EMAIL,
      picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      sub: 'google-sub-shauryarazor25',
    }
    const mockToken = `header.${btoa(JSON.stringify(adminPayload))}.signature`
    try {
      const data = await googleSignIn(mockToken)
      setToken(data.token || mockToken)
      setCurrentUser(data.user || adminPayload)
    } catch {
      setToken(mockToken)
      setCurrentUser(adminPayload)
    }
  }

  const handleLogout = () => {
    clearToken()
    setCurrentUser(null)
  }

  // ACCESS DENIED VIEW: If not logged in as shauryarazor25@gmail.com
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F1F2F8] py-16 px-4 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-[#DDDDE5] max-w-md w-full p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-50 text-[#D1435B] flex items-center justify-center mx-auto border border-red-200">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] uppercase font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
              Access Restricted
            </span>
            <h2 className="text-xl font-extrabold text-[#111236]">Admin Portal Authorization</h2>
            <p className="text-xs text-[#68697F] leading-relaxed">
              Access to the Flight Operations & Delay Simulator is strictly restricted. Only the administrator account{' '}
              <strong className="text-[#111236] font-mono">{REQUIRED_ADMIN_EMAIL}</strong> is authorized.
            </p>
          </div>

          {currentUser ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-xs text-amber-900 space-y-2">
              <div className="flex items-center justify-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-[#FF7110]" />
                Unauthorized User Account
              </div>
              <p className="text-[11px] text-[#68697F]">
                Currently signed in as: <strong className="text-[#111236]">{currentUser.email}</strong>
              </p>
              <button
                onClick={handleLogout}
                className="mt-1 px-4 py-1.5 bg-white border border-amber-300 rounded text-xs font-semibold text-amber-900 hover:bg-amber-100/50 flex items-center gap-1.5 mx-auto transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out & Switch Account
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <p className="text-xs font-semibold text-[#111236]">
                Sign in with your authorized Google Account:
              </p>
              <div className="flex justify-center">
                <GoogleAuthButton onLoginSuccess={(user) => setCurrentUser(user)} />
              </div>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-white px-2 text-[#68697F]">Demo Testing Shortcut</span>
                </div>
              </div>

              <button
                onClick={handleSimulateAdminLogin}
                className="w-full py-2.5 px-4 bg-[#0770E3] hover:bg-[#084EB2] text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition"
              >
                <KeyRound className="w-4 h-4" />
                Sign In as shauryarazor25@gmail.com
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // AUTHORIZED ADMIN VIEW
  return (
    <div className="min-h-screen bg-[#F1F2F8] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-[#DDDDE5] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-[#111236]">Flight Operations & Admin Portal</h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <UserCheck className="w-3 h-3" />
                  Authorized: {REQUIRED_ADMIN_EMAIL}
                </span>
              </div>
              <p className="text-xs text-[#68697F]">
                Simulate flight delays and cancellations to test TinyFish autonomous browsing & TripSaathi refund claims.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3 py-1.5 border border-[#DDDDE5] text-xs font-semibold rounded hover:bg-gray-50 flex items-center gap-1.5 text-[#111236]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 border border-red-200 text-[#D1435B] bg-red-50 hover:bg-red-100 rounded text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Global notification if action taken */}
        {statusMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-md text-xs text-emerald-800 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-[#DDDDE5] gap-2">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'simulator'
                ? 'border-[#0770E3] text-[#0770E3] bg-white rounded-t-md'
                : 'border-transparent text-[#68697F] hover:text-[#111236]'
            }`}
          >
            <Radio className="w-4 h-4" />
            Flight Delay / Disruption Simulator ({flights.length})
          </button>

          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'bookings'
                ? 'border-[#0770E3] text-[#0770E3] bg-white rounded-t-md'
                : 'border-transparent text-[#68697F] hover:text-[#111236]'
            }`}
          >
            <Users className="w-4 h-4" />
            Bookings Manager ({bookings.length})
          </button>

          <button
            onClick={() => setActiveTab('add-flight')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'add-flight'
                ? 'border-[#0770E3] text-[#0770E3] bg-white rounded-t-md'
                : 'border-transparent text-[#68697F] hover:text-[#111236]'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Add New Flight / Aircraft
          </button>
        </div>

        {/* TAB 1: FLIGHT DELAY & CANCELLATION SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="space-y-4">
            {/* Simulation Explanatory Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-[#111236] space-y-1">
              <h4 className="font-bold flex items-center gap-1.5 text-[#0770E3]">
                <Clock className="w-4 h-4" />
                How the TripSaathi & TinyFish Testing Simulator Works:
              </h4>
              <p className="text-[#68697F] leading-relaxed">
                Click <strong>"Delay +2h 30m"</strong> or <strong>"Cancel by Airline"</strong> on any flight below. When
                a passenger (or TinyFish bot) visits the Manage Booking page or checks flight status, the system detects
                the operational disruption and triggers the <strong>100% DGCA Disruption Full Refund Waiver</strong>!
              </p>
            </div>

            <div className="bg-white rounded-lg border border-[#DDDDE5] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-[#DDDDE5] text-[#68697F] uppercase tracking-wider font-semibold text-[11px]">
                    <tr>
                      <th className="p-3.5">Flight</th>
                      <th className="p-3.5">Route</th>
                      <th className="p-3.5">Schedule</th>
                      <th className="p-3.5">Fare & Policy</th>
                      <th className="p-3.5">Current Status</th>
                      <th className="p-3.5 text-right">Simulate Disruption</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDDDE5]">
                    {flights.map((flight) => {
                      const id = flight._id || flight.id
                      const isDelayed = flight.status === 'DELAYED'
                      const isCancelled =
                        flight.status === 'CANCELLED' || flight.status === 'CANCELLED_BY_AIRLINE'

                      return (
                        <tr key={id} className="hover:bg-gray-50/50">
                          <td className="p-3.5">
                            <div className="font-bold text-[#111236]">{flight.airline}</div>
                            <span className="font-mono text-[#0770E3] font-semibold">{flight.flight_number}</span>
                            <div className="text-[10px] text-[#68697F]">{flight.aircraft || 'Airbus A320'}</div>
                          </td>

                          <td className="p-3.5">
                            <div className="font-semibold text-[#111236]">
                              {typeof flight.origin === 'object' ? (flight.origin?.code || 'DEL') : (flight.origin || 'DEL')} → {typeof flight.destination === 'object' ? (flight.destination?.code || 'BOM') : (flight.destination || 'BOM')}
                            </div>
                            <div className="text-[10px] text-[#68697F]">
                              {flight.origin_city || (typeof flight.origin === 'object' ? flight.origin?.city : flight.origin) || 'DEL'} to {flight.destination_city || (typeof flight.destination === 'object' ? flight.destination?.city : flight.destination) || 'BOM'}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="font-medium text-[#111236]">
                              {flight.departure_time?.includes('T') ? flight.departure_time.split('T')[1].substring(0, 5) : flight.departure_time} - {flight.arrival_time?.includes('T') ? flight.arrival_time.split('T')[1].substring(0, 5) : flight.arrival_time}
                            </div>
                            <div className="text-[10px] text-[#68697F]">{flight.duration}</div>
                          </td>

                          <td className="p-3.5">
                            <div className="font-bold font-mono text-[#111236]">
                              ₹{Number(flight.price || 4999).toLocaleString('en-IN')}
                            </div>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                flight.cancellation_policy === 'FREE_CANCELLATION'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {flight.cancellation_policy || 'FREE_CANCELLATION'}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-block ${
                                isCancelled
                                  ? 'bg-red-100 text-red-700'
                                  : isDelayed
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {flight.status || 'ON_TIME'}
                            </span>
                            {isDelayed && (
                              <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                                +{flight.delay_minutes || 45} mins
                              </div>
                            )}
                          </td>

                          <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => handleStatusChange(id, 'ON_TIME', 0)}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-[#111236] rounded text-[11px] font-medium"
                              title="Reset to On Time"
                            >
                              On Time
                            </button>

                            <button
                              onClick={() => handleStatusChange(id, 'DELAYED', 45)}
                              className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded text-[11px] font-medium"
                              title="Simulate 45m Delay"
                            >
                              +45m
                            </button>

                            <button
                              onClick={() => handleStatusChange(id, 'DELAYED', 150)}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[11px] font-bold"
                              title="Simulate 2.5 hr Delay (Triggers Full Refund Waiver)"
                            >
                              +2.5h (Waiver)
                            </button>

                            <button
                              onClick={() => handleStatusChange(id, 'CANCELLED_BY_AIRLINE', 0)}
                              className="px-2 py-1 bg-[#D1435B] hover:bg-red-700 text-white rounded text-[11px] font-bold"
                              title="Mark Cancelled by Airline"
                            >
                              Airline Cancel
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SYSTEM BOOKINGS */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-lg border border-[#DDDDE5] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-[#DDDDE5] text-[#68697F] uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="p-3.5">PNR</th>
                    <th className="p-3.5">Passenger</th>
                    <th className="p-3.5">Flight</th>
                    <th className="p-3.5">Paid</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Cancellation Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDDDE5]">
                  {bookings.map((b) => (
                    <tr key={b.pnr} className="hover:bg-gray-50/50">
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-[#0770E3] bg-blue-50 px-2 py-0.5 rounded">
                          {b.pnr}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-[#111236]">{b.passenger?.name || 'Traveler'}</div>
                        <div className="text-[10px] text-[#68697F]">{b.passenger?.email}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-medium text-[#111236]">
                          {b.flight_number} ({b.route || `${b.origin} → ${b.destination}`})
                        </div>
                        <div className="text-[10px] text-[#68697F]">{b.airline}</div>
                      </td>

                      <td className="p-3.5 font-mono font-bold text-[#111236]">
                        ₹{Number(b.total_paid || 4999).toLocaleString('en-IN')}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            b.status === 'CANCELLED'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>

                      <td className="p-3.5 text-[11px] text-[#68697F]">
                        {b.status === 'CANCELLED' ? (
                          <div>
                            <span className="font-semibold text-[#00A698]">
                              Refund: ₹{Number(b.cancellation?.refund_amount || 0).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[#D1435B] ml-2">
                              (Fee: ₹{Number(b.cancellation?.cancellation_fee || 0).toLocaleString('en-IN')})
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#68697F]">Active booking</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ADD NEW FLIGHT */}
        {activeTab === 'add-flight' && (
          <div className="bg-white rounded-lg border border-[#DDDDE5] p-6 shadow-xs max-w-2xl">
            <h3 className="text-base font-bold text-[#111236] mb-4">Add Custom Airline & Flight</h3>
            <form onSubmit={handleCreateFlight} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-[#111236] block mb-1">Airline Name</label>
                  <input
                    type="text"
                    value={newFlight.airline}
                    onChange={(e) => setNewFlight({ ...newFlight, airline: e.target.value })}
                    required
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#111236] block mb-1">Flight Number</label>
                  <input
                    type="text"
                    value={newFlight.flight_number}
                    onChange={(e) => setNewFlight({ ...newFlight, flight_number: e.target.value.toUpperCase() })}
                    required
                    className="w-full px-3 py-2 border rounded font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-[#111236] block mb-1">Origin Code (e.g. DEL)</label>
                  <input
                    type="text"
                    value={newFlight.origin}
                    onChange={(e) => setNewFlight({ ...newFlight, origin: e.target.value.toUpperCase() })}
                    required
                    className="w-full px-3 py-2 border rounded font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#111236] block mb-1">Destination Code (e.g. BOM)</label>
                  <input
                    type="text"
                    value={newFlight.destination}
                    onChange={(e) => setNewFlight({ ...newFlight, destination: e.target.value.toUpperCase() })}
                    required
                    className="w-full px-3 py-2 border rounded font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-[#111236] block mb-1">Departure Time</label>
                  <input
                    type="text"
                    value={newFlight.departure_time}
                    onChange={(e) => setNewFlight({ ...newFlight, departure_time: e.target.value })}
                    required
                    className="w-full px-3 py-2 border rounded font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#111236] block mb-1">Arrival Time</label>
                  <input
                    type="text"
                    value={newFlight.arrival_time}
                    onChange={(e) => setNewFlight({ ...newFlight, arrival_time: e.target.value })}
                    required
                    className="w-full px-3 py-2 border rounded font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#111236] block mb-1">Price (₹ INR)</label>
                  <input
                    type="number"
                    value={newFlight.price}
                    onChange={(e) => setNewFlight({ ...newFlight, price: Number(e.target.value) })}
                    required
                    className="w-full px-3 py-2 border rounded font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-[#111236] block mb-1">Aircraft Model</label>
                  <input
                    type="text"
                    value={newFlight.aircraft}
                    onChange={(e) => setNewFlight({ ...newFlight, aircraft: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#111236] block mb-1">Cancellation Policy</label>
                  <select
                    value={newFlight.cancellation_policy}
                    onChange={(e) => setNewFlight({ ...newFlight, cancellation_policy: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="FREE_CANCELLATION">Free 24h Cancellation</option>
                    <option value="PARTIAL_REFUND">Partial Refund (₹2,500 fee)</option>
                    <option value="NON_REFUNDABLE">Non-Refundable Ticket</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0770E3] hover:bg-[#084EB2] text-white font-bold rounded shadow-xs"
                >
                  Create Flight Schedule
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
