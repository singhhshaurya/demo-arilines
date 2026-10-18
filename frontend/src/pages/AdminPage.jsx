import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  adminGetFlights,
  adminGetFlight,
  adminAddFlight,
  adminUpdateFlight,
  adminDeleteFlight,
  adminUpdateSchedule,
  adminDelayFlight,
  adminUpdateFlightStatus,
  adminGetBookings,
} from '../lib/api'
import { getUser, clearToken } from '../lib/auth'
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
  ArrowLeft,
  Eye,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  X,
  Save,
  Check,
} from 'lucide-react'

const REQUIRED_ADMIN_EMAIL = 'shauryarazor25@gmail.com'

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState(getUser())
  const [password, setPassword] = useState('admin123')
  const [activeTab, setActiveTab] = useState('flights') // 'flights', 'simulator', 'bookings'

  // Data states
  const [flights, setFlights] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  // Modals state
  const [viewFlightModal, setViewFlightModal] = useState(null)
  const [editFlightModal, setEditFlightModal] = useState(null)
  const [scheduleModal, setScheduleModal] = useState(null)
  const [delayModal, setDelayModal] = useState(null)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Create flight form state with auto-generated Flight ID
  const generateNewFlightId = () => `SP-${Math.floor(100 + Math.random() * 900)}`

  const [createForm, setCreateForm] = useState({
    airline: 'SkyPulse Air',
    airline_code: 'SP',
    flight_number: generateNewFlightId(),
    origin: 'DEL',
    origin_city: 'New Delhi',
    origin_terminal: 'T3',
    destination: 'BOM',
    destination_city: 'Mumbai',
    destination_terminal: 'T2',
    departure_time: '10:00',
    arrival_time: '12:15',
    duration: '2h 15m',
    date: new Date().toISOString().split('T')[0],
    price: 4999,
    aircraft: 'Airbus A320neo',
    total_seats: 180,
    seats_available: 180,
    cancellation_policy: 'FREE_CANCELLATION',
  })

  // Delay form state
  const [delayInput, setDelayInput] = useState({
    delayMinutes: 45,
    departureDelay: 45,
    arrivalDelay: 45,
    reason: 'Air Traffic Control Hold',
  })

  const isAdmin = currentUser?.role === 'admin' || currentUser?.email?.trim().toLowerCase() === REQUIRED_ADMIN_EMAIL

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

  const notify = (msg) => {
    setStatusMessage(msg)
    setTimeout(() => setStatusMessage(''), 4500)
  }

  // --- CRUD Operations ---
  const handleOpenCreateModal = () => {
    setCreateForm((prev) => ({
      ...prev,
      flight_number: generateNewFlightId(),
    }))
    setShowCreateModal(true)
  }

  const handleCreateFlightSubmit = async (e) => {
    e.preventDefault()
    try {
      await adminAddFlight(createForm, password)
      notify(`Flight ${createForm.flight_number} created successfully!`)
      setShowCreateModal(false)
      loadData()
    } catch (err) {
      alert('Failed to create flight.')
    }
  }

  const handleModifyFlightSubmit = async (e) => {
    e.preventDefault()
    if (!editFlightModal) return
    try {
      const id = editFlightModal._id || editFlightModal.id || editFlightModal.flight_number
      await adminUpdateFlight(id, editFlightModal, password)
      notify(`Flight ${editFlightModal.flight_number} modified successfully!`)
      setEditFlightModal(null)
      loadData()
    } catch (err) {
      alert('Failed to update flight.')
    }
  }

  const handleDeleteFlight = async (flight) => {
    if (!flight) return
    const id = flight._id || flight.id || flight.flight_number
    try {
      await adminDeleteFlight(id, password)
      notify(`Flight ${flight.flight_number} deleted successfully from schedule.`)
      setDeleteConfirmModal(null)
      loadData()
    } catch (err) {
      alert('Failed to delete flight.')
    }
  }

  // --- Schedule Maintenance ---
  const handleScheduleSubmit = async (e) => {
    e.preventDefault()
    if (!scheduleModal) return
    try {
      const id = scheduleModal._id || scheduleModal.id || scheduleModal.flight_number
      await adminUpdateSchedule(id, scheduleModal, password)
      notify(`Schedule for ${scheduleModal.flight_number} updated successfully!`)
      setScheduleModal(null)
      loadData()
    } catch (err) {
      alert('Failed to update flight schedule.')
    }
  }

  // --- Delay Operations ---
  const handleOpenDelayModal = (flight) => {
    setDelayModal(flight)
    const currentDelay = flight.delay_minutes || 45
    setDelayInput({
      delayMinutes: currentDelay,
      departureDelay: flight.departure_delay_minutes || currentDelay,
      arrivalDelay: flight.arrival_delay_minutes || currentDelay,
      reason: flight.disruption_note || 'Air Traffic Control Hold',
    })
  }

  const handleApplyDelay = async (e) => {
    e.preventDefault()
    if (!delayModal) return
    const id = delayModal._id || delayModal.id || delayModal.flight_number
    try {
      await adminDelayFlight(
        id,
        {
          delay_minutes: Number(delayInput.delayMinutes),
          departure_delay_minutes: Number(delayInput.departureDelay),
          arrival_delay_minutes: Number(delayInput.arrivalDelay),
          reason: delayInput.reason,
          status: Number(delayInput.delayMinutes) > 0 ? 'DELAYED' : 'ON_TIME',
        },
        password
      )
      notify(
        Number(delayInput.delayMinutes) > 0
          ? `Flight ${delayModal.flight_number} delayed by +${delayInput.departureDelay}m dep / +${delayInput.arrivalDelay}m arr!`
          : `Flight ${delayModal.flight_number} reset to ON TIME.`
      )
      setDelayModal(null)
      loadData()
    } catch (err) {
      alert('Failed to apply delay.')
    }
  }

  const handleQuickStatusChange = async (flightId, newStatus, delayMinutes = 0) => {
    try {
      await adminUpdateFlightStatus(flightId, newStatus, delayMinutes, password)
      notify(`Flight ${flightId} updated to ${newStatus} (${delayMinutes}m delay)`)
      loadData()
    } catch (err) {
      alert('Failed to update flight status')
    }
  }

  const handleLogout = () => {
    clearToken()
    setCurrentUser(null)
  }

  // ACCESS DENIED VIEW
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
              Access is strictly restricted to administrator accounts configured in MongoDB.
            </p>
          </div>

          {currentUser ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-xs text-amber-900 space-y-3">
              <div className="flex items-center justify-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-[#FF7110]" />
                Non-Admin Account
              </div>
              <p className="text-[11px] text-[#68697F]">
                Signed in as: <strong className="text-[#111236]">{currentUser.email}</strong> (role: {currentUser.role || 'user'})
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <Link
                  to="/"
                  className="px-3 py-1.5 bg-white border border-[#DDDDE5] rounded text-xs font-semibold text-[#111236] hover:bg-gray-50 flex items-center gap-1 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Flight Search
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-white border border-amber-300 rounded text-xs font-semibold text-amber-900 hover:bg-amber-100/50 flex items-center gap-1 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <p className="text-xs font-semibold text-[#111236]">
                Sign in with authorized administrator Google Account:
              </p>
              <div className="flex justify-center">
                <GoogleAuthButton onLoginSuccess={(user) => setCurrentUser(user)} />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // AUTHORIZED ADMIN PORTAL
  return (
    <div className="min-h-screen bg-[#F1F2F8] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="bg-white rounded-lg border border-[#DDDDE5] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-[#111236]">Flight Operations & Management Console</h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <UserCheck className="w-3 h-3" />
                  {REQUIRED_ADMIN_EMAIL}
                </span>
              </div>
              <p className="text-xs text-[#68697F]">
                Manage flights, maintain schedules, simulate arrival & departure delays, and monitor system bookings.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenCreateModal}
              className="px-3.5 py-1.5 bg-[#0770E3] hover:bg-[#084EB2] text-white rounded text-xs font-bold shadow-xs transition flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Create Flight
            </button>
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

        {/* Global notification */}
        {statusMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-md text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#DDDDE5] gap-2">
          <button
            onClick={() => setActiveTab('flights')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'flights'
                ? 'border-[#0770E3] text-[#0770E3] bg-white rounded-t-md'
                : 'border-transparent text-[#68697F] hover:text-[#111236]'
            }`}
          >
            <Plane className="w-4 h-4" />
            Flight & Schedule Manager ({flights.length})
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'simulator'
                ? 'border-[#0770E3] text-[#0770E3] bg-white rounded-t-md'
                : 'border-transparent text-[#68697F] hover:text-[#111236]'
            }`}
          >
            <Radio className="w-4 h-4" />
            Delay Simulator & TinyFish Sandbox
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
            System Bookings ({bookings.length})
          </button>
        </div>

        {/* TAB 1: FLIGHT & SCHEDULE MANAGER (Full CRUD, Schedule, Delays) */}
        {activeTab === 'flights' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-[#DDDDE5] shadow-xs overflow-hidden">
              <div className="p-4 bg-gray-50/50 border-b border-[#DDDDE5] flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#111236] uppercase tracking-wider">
                    All Active Airline Flights & Schedules
                  </h3>
                  <p className="text-[11px] text-[#68697F]">
                    Modify schedules, input custom delays, view specifications, or delete flights.
                  </p>
                </div>
                <button
                  onClick={handleOpenCreateModal}
                  className="px-3 py-1.5 bg-[#0770E3] hover:bg-[#084EB2] text-white text-xs font-bold rounded flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Add New Flight
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-[#DDDDE5] text-[#68697F] uppercase tracking-wider font-semibold text-[11px]">
                    <tr>
                      <th className="p-3.5">Flight ID / Aircraft</th>
                      <th className="p-3.5">Schedule (Place & Time)</th>
                      <th className="p-3.5">Fare & Seats</th>
                      <th className="p-3.5">Live Status & Delay</th>
                      <th className="p-3.5 text-right">Operations & Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDDDE5]">
                    {flights.map((flight) => {
                      const id = flight._id || flight.id || flight.flight_number
                      const isDelayed = flight.status === 'DELAYED' || flight.delay_minutes > 0
                      const isCancelled = flight.status === 'CANCELLED' || flight.status === 'CANCELLED_BY_AIRLINE'

                      const origCode = typeof flight.origin === 'object' ? flight.origin?.code : flight.origin || 'DEL'
                      const destCode = typeof flight.destination === 'object' ? flight.destination?.code : flight.destination || 'BOM'
                      const origCity = flight.origin_city || (typeof flight.origin === 'object' ? flight.origin?.city : origCode)
                      const destCity = flight.destination_city || (typeof flight.destination === 'object' ? flight.destination?.city : destCode)

                      return (
                        <tr key={id} className="hover:bg-gray-50/60 transition">
                          {/* Flight ID & Aircraft */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-[#0770E3] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                {flight.flight_number || flight.flight_id}
                              </span>
                              <span className="font-semibold text-xs text-[#111236]">{flight.airline}</span>
                            </div>
                            <div className="text-[10px] text-[#68697F] mt-1">{flight.aircraft || 'Airbus A320neo'}</div>
                          </td>

                          {/* Schedule (Place & Time) */}
                          <td className="p-3.5">
                            <div className="font-bold text-[#111236] flex items-center gap-1.5">
                              <span>{origCity} ({origCode})</span>
                              <span className="text-[#68697F]">→</span>
                              <span>{destCity} ({destCode})</span>
                            </div>
                            <div className="text-[11px] text-[#68697F] mt-0.5">
                              Dep: <strong>{flight.departure_time?.includes('T') ? flight.departure_time.split('T')[1].substring(0, 5) : flight.departure_time}</strong> (T{flight.origin_terminal || '3'})
                              {' • '}
                              Arr: <strong>{flight.arrival_time?.includes('T') ? flight.arrival_time.split('T')[1].substring(0, 5) : flight.arrival_time}</strong> (T{flight.destination_terminal || '2'})
                              {' • '}
                              <span>{flight.duration || '2h 15m'}</span>
                            </div>
                            {isDelayed && (
                              <div className="text-[10px] font-mono font-bold text-[#FF7110] mt-0.5">
                                Est. Dep: {flight.estimated_departure_time || 'Rescheduled'} | Est. Arr: {flight.estimated_arrival_time || 'Rescheduled'}
                              </div>
                            )}
                          </td>

                          {/* Fare & Seats */}
                          <td className="p-3.5">
                            <div className="font-mono font-bold text-[#111236]">
                              ₹{Number(flight.price || 4999).toLocaleString('en-IN')}
                            </div>
                            <div className="text-[10px] text-emerald-700 font-semibold">
                              {flight.seats_available || 30} / {flight.total_seats || 180} seats avail
                            </div>
                          </td>

                          {/* Live Status */}
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase inline-block ${
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
                              <div className="text-[10px] text-[#FF7110] font-bold mt-0.5">
                                +{flight.delay_minutes || 45} mins delay
                              </div>
                            )}
                          </td>

                          {/* Operations & Action Buttons */}
                          <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                            {/* View Flight Details */}
                            <button
                              onClick={() => setViewFlightModal(flight)}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-[#111236] rounded text-[11px] font-semibold inline-flex items-center gap-1"
                              title="View Flight Details"
                            >
                              <Eye className="w-3 h-3 text-[#0770E3]" />
                              View
                            </button>

                            {/* Maintain Schedule */}
                            <button
                              onClick={() => setScheduleModal({ ...flight })}
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-[#0770E3] rounded text-[11px] font-semibold inline-flex items-center gap-1"
                              title="Maintain Schedule (Places & Times)"
                            >
                              <Calendar className="w-3 h-3" />
                              Schedule
                            </button>

                            {/* Delay Manager */}
                            <button
                              onClick={() => handleOpenDelayModal(flight)}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded text-[11px] font-semibold inline-flex items-center gap-1"
                              title="Set Arrival / Departure Delay Input"
                            >
                              <Clock className="w-3 h-3 text-[#FF7110]" />
                              Delay
                            </button>

                            {/* Modify Flight */}
                            <button
                              onClick={() => setEditFlightModal({ ...flight })}
                              className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-[11px] font-semibold inline-flex items-center gap-1"
                              title="Modify Flight Specifications"
                            >
                              <Edit className="w-3 h-3" />
                              Edit
                            </button>

                            {/* Delete Flight */}
                            <button
                              onClick={() => setDeleteConfirmModal(flight)}
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-[#D1435B] rounded text-[11px] font-semibold inline-flex items-center gap-1"
                              title="Delete Flight"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
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

        {/* TAB 2: DELAY & DISRUPTION SIMULATOR (Quick Testing for TinyFish) */}
        {activeTab === 'simulator' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-[#111236] space-y-1">
              <h4 className="font-bold flex items-center gap-1.5 text-[#0770E3]">
                <Clock className="w-4 h-4" />
                Quick Flight Delay & Disruption Simulator:
              </h4>
              <p className="text-[#68697F] leading-relaxed">
                Use 1-click buttons below or click <strong>"Custom Delay"</strong> to set arrival and departure delays.
                Passengers visiting the public <strong>View Flight Status</strong> page or <strong>Manage Booking</strong> page will immediately see the delay in real time!
              </p>
            </div>

            <div className="bg-white rounded-lg border border-[#DDDDE5] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-[#DDDDE5] text-[#68697F] uppercase tracking-wider font-semibold text-[11px]">
                    <tr>
                      <th className="p-3.5">Flight</th>
                      <th className="p-3.5">Route</th>
                      <th className="p-3.5">Scheduled Times</th>
                      <th className="p-3.5">Status & Disruption</th>
                      <th className="p-3.5 text-right">Quick Simulation Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDDDE5]">
                    {flights.map((flight) => {
                      const id = flight._id || flight.id || flight.flight_number
                      const isDelayed = flight.status === 'DELAYED' || flight.delay_minutes > 0
                      const isCancelled = flight.status === 'CANCELLED' || flight.status === 'CANCELLED_BY_AIRLINE'

                      return (
                        <tr key={id} className="hover:bg-gray-50/50">
                          <td className="p-3.5">
                            <span className="font-mono font-bold text-[#0770E3]">{flight.flight_number}</span>
                            <div className="text-[10px] text-[#68697F]">{flight.airline}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-[#111236]">
                              {flight.origin_city || flight.origin} → {flight.destination_city || flight.destination}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div>{flight.departure_time} - {flight.arrival_time}</div>
                            {isDelayed && (
                              <div className="text-[10px] font-bold text-[#FF7110]">
                                Est: {flight.estimated_departure_time} - {flight.estimated_arrival_time}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isCancelled
                                  ? 'bg-red-100 text-red-700'
                                  : isDelayed
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {flight.status || 'ON_TIME'} {isDelayed && `(+${flight.delay_minutes}m)`}
                            </span>
                            {flight.disruption_note && (
                              <div className="text-[10px] text-[#68697F] truncate max-w-xs mt-0.5">
                                {flight.disruption_note}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => handleQuickStatusChange(id, 'ON_TIME', 0)}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-[#111236] rounded text-[11px] font-medium"
                            >
                              On Time
                            </button>
                            <button
                              onClick={() => handleOpenDelayModal(flight)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[11px] font-bold"
                            >
                              Input Custom Delay
                            </button>
                            <button
                              onClick={() => handleQuickStatusChange(id, 'DELAYED', 150)}
                              className="px-2 py-1 bg-[#FF7110] hover:bg-orange-600 text-white rounded text-[11px] font-bold"
                              title="+2.5hr Delay (Triggers Full Refund Waiver)"
                            >
                              +2.5h (Waiver)
                            </button>
                            <button
                              onClick={() => handleQuickStatusChange(id, 'CANCELLED_BY_AIRLINE', 0)}
                              className="px-2 py-1 bg-[#D1435B] hover:bg-red-700 text-white rounded text-[11px] font-bold"
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

        {/* TAB 3: SYSTEM BOOKINGS */}
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
                      <td className="p-3.5 text-[10px]">
                        {b.cancellation ? (
                          <div className="text-[#68697F]">
                            <div>Refund: <strong className="text-emerald-700">₹{b.cancellation.refund_amount}</strong></div>
                            <div>Fee: ₹{b.cancellation.cancellation_fee}</div>
                            <div>Receipt: {b.cancellation.receipt_id}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Active</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ----------------- MODAL: CREATE FLIGHT ----------------- */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-[#DDDDE5] space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#DDDDE5] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0770E3] flex items-center justify-center">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#111236]">Create New Flight</h3>
                    <p className="text-[11px] text-[#68697F]">A new unique Flight ID is auto-generated upon creation.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateFlightSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-[#111236] block mb-1">Flight ID / Number</label>
                    <input
                      type="text"
                      value={createForm.flight_number}
                      onChange={(e) => setCreateForm({ ...createForm, flight_number: e.target.value.toUpperCase() })}
                      required
                      className="w-full px-3 py-2 border border-[#DDDDE5] rounded font-mono font-bold text-sm text-[#0770E3] focus:ring-2 focus:ring-[#0770E3]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#111236] block mb-1">Airline Name</label>
                    <input
                      type="text"
                      value={createForm.airline}
                      onChange={(e) => setCreateForm({ ...createForm, airline: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-[#DDDDE5] rounded focus:ring-2 focus:ring-[#0770E3]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#111236] block mb-1">Aircraft</label>
                    <input
                      type="text"
                      value={createForm.aircraft}
                      onChange={(e) => setCreateForm({ ...createForm, aircraft: e.target.value })}
                      className="w-full px-3 py-2 border border-[#DDDDE5] rounded focus:ring-2 focus:ring-[#0770E3]"
                    />
                  </div>
                </div>

                {/* Origin Place */}
                <div className="p-3 bg-gray-50 rounded-lg border border-[#DDDDE5] space-y-2">
                  <span className="font-bold text-[#0770E3] uppercase text-[10px] tracking-wider block">
                    Departure Place & Terminal
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-[#68697F] block">Airport Code (e.g. DEL)</label>
                      <input
                        type="text"
                        value={createForm.origin}
                        onChange={(e) => setCreateForm({ ...createForm, origin: e.target.value.toUpperCase() })}
                        required
                        className="w-full px-3 py-1.5 border border-[#DDDDE5] rounded font-bold uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#68697F] block">City Name</label>
                      <input
                        type="text"
                        value={createForm.origin_city}
                        onChange={(e) => setCreateForm({ ...createForm, origin_city: e.target.value })}
                        className="w-full px-3 py-1.5 border border-[#DDDDE5] rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#68697F] block">Terminal</label>
                      <input
                        type="text"
                        value={createForm.origin_terminal}
                        onChange={(e) => setCreateForm({ ...createForm, origin_terminal: e.target.value })}
                        className="w-full px-3 py-1.5 border border-[#DDDDE5] rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* Destination Place */}
                <div className="p-3 bg-gray-50 rounded-lg border border-[#DDDDE5] space-y-2">
                  <span className="font-bold text-emerald-700 uppercase text-[10px] tracking-wider block">
                    Arrival Destination & Terminal
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-[#68697F] block">Airport Code (e.g. BOM)</label>
                      <input
                        type="text"
                        value={createForm.destination}
                        onChange={(e) => setCreateForm({ ...createForm, destination: e.target.value.toUpperCase() })}
                        required
                        className="w-full px-3 py-1.5 border border-[#DDDDE5] rounded font-bold uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#68697F] block">City Name</label>
                      <input
                        type="text"
                        value={createForm.destination_city}
                        onChange={(e) => setCreateForm({ ...createForm, destination_city: e.target.value })}
                        className="w-full px-3 py-1.5 border border-[#DDDDE5] rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#68697F] block">Terminal</label>
                      <input
                        type="text"
                        value={createForm.destination_terminal}
                        onChange={(e) => setCreateForm({ ...createForm, destination_terminal: e.target.value })}
                        className="w-full px-3 py-1.5 border border-[#DDDDE5] rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* Schedule Times */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-[#111236] block mb-1">Departure Time</label>
                    <input
                      type="text"
                      value={createForm.departure_time}
                      onChange={(e) => setCreateForm({ ...createForm, departure_time: e.target.value })}
                      placeholder="e.g. 10:30"
                      required
                      className="w-full px-3 py-2 border border-[#DDDDE5] rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#111236] block mb-1">Arrival Time</label>
                    <input
                      type="text"
                      value={createForm.arrival_time}
                      onChange={(e) => setCreateForm({ ...createForm, arrival_time: e.target.value })}
                      placeholder="e.g. 12:45"
                      required
                      className="w-full px-3 py-2 border border-[#DDDDE5] rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#111236] block mb-1">Flight Duration</label>
                    <input
                      type="text"
                      value={createForm.duration}
                      onChange={(e) => setCreateForm({ ...createForm, duration: e.target.value })}
                      placeholder="2h 15m"
                      className="w-full px-3 py-2 border border-[#DDDDE5] rounded"
                    />
                  </div>
                </div>

                {/* Pricing, Seats, Policy */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-[#111236] block mb-1">Price (₹)</label>
                    <input
                      type="number"
                      value={createForm.price}
                      onChange={(e) => setCreateForm({ ...createForm, price: Number(e.target.value) })}
                      required
                      className="w-full px-3 py-2 border border-[#DDDDE5] rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#111236] block mb-1">Total Seats</label>
                    <input
                      type="number"
                      value={createForm.total_seats}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          total_seats: Number(e.target.value),
                          seats_available: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-[#DDDDE5] rounded"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#111236] block mb-1">Cancellation Policy</label>
                    <select
                      value={createForm.cancellation_policy}
                      onChange={(e) => setCreateForm({ ...createForm, cancellation_policy: e.target.value })}
                      className="w-full px-3 py-2 border border-[#DDDDE5] rounded"
                    >
                      <option value="FREE_CANCELLATION">FREE_CANCELLATION (100% Refund)</option>
                      <option value="PARTIAL_REFUND">PARTIAL_REFUND (Standard Deduction)</option>
                      <option value="NON_REFUNDABLE">NON_REFUNDABLE (₹0 Refund)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DDDDE5]">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-[#DDDDE5] rounded text-xs font-semibold text-[#68697F] hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#0770E3] hover:bg-[#084EB2] text-white rounded text-xs font-bold shadow-xs transition"
                  >
                    Create Flight
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ----------------- MODAL: VIEW FLIGHT DETAILS ----------------- */}
        {viewFlightModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-[#DDDDE5] space-y-4">
              <div className="flex items-center justify-between border-b border-[#DDDDE5] pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-[#0770E3]" />
                  <h3 className="font-bold text-base text-[#111236]">Flight Specifications</h3>
                </div>
                <button onClick={() => setViewFlightModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 flex items-center justify-between">
                  <div>
                    <span className="font-mono text-base font-black text-[#0770E3]">
                      {viewFlightModal.flight_number || viewFlightModal.flight_id}
                    </span>
                    <div className="font-semibold text-[#111236]">{viewFlightModal.airline}</div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                      viewFlightModal.status === 'CANCELLED'
                        ? 'bg-red-100 text-red-700'
                        : viewFlightModal.status === 'DELAYED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {viewFlightModal.status || 'ON_TIME'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-[#68697F] block">Departure</span>
                    <strong className="text-sm">{viewFlightModal.origin_city || viewFlightModal.origin} ({typeof viewFlightModal.origin === 'object' ? viewFlightModal.origin?.code : viewFlightModal.origin})</strong>
                    <div className="text-[#68697F]">Time: {viewFlightModal.departure_time} (T{viewFlightModal.origin_terminal || '3'})</div>
                  </div>
                  <div>
                    <span className="text-[#68697F] block">Arrival</span>
                    <strong className="text-sm">{viewFlightModal.destination_city || viewFlightModal.destination} ({typeof viewFlightModal.destination === 'object' ? viewFlightModal.destination?.code : viewFlightModal.destination})</strong>
                    <div className="text-[#68697F]">Time: {viewFlightModal.arrival_time} (T{viewFlightModal.destination_terminal || '2'})</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 border rounded">
                    <span className="text-[#68697F] block text-[10px]">Aircraft</span>
                    <strong>{viewFlightModal.aircraft || 'A320'}</strong>
                  </div>
                  <div className="p-2 border rounded">
                    <span className="text-[#68697F] block text-[10px]">Seats Available</span>
                    <strong className="text-emerald-700">{viewFlightModal.seats_available} / {viewFlightModal.total_seats || 180}</strong>
                  </div>
                  <div className="p-2 border rounded">
                    <span className="text-[#68697F] block text-[10px]">Base Fare</span>
                    <strong>₹{viewFlightModal.price}</strong>
                  </div>
                </div>

                {viewFlightModal.delay_minutes > 0 && (
                  <div className="p-3 bg-amber-50 rounded border border-amber-200 text-amber-900">
                    <strong>Delay:</strong> +{viewFlightModal.delay_minutes} mins
                    <div className="text-[11px] mt-0.5">Note: {viewFlightModal.disruption_note || 'Rescheduled'}</div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setViewFlightModal(null)}
                  className="px-4 py-2 bg-[#0770E3] text-white text-xs font-bold rounded"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- MODAL: MAINTAIN SCHEDULE ----------------- */}
        {scheduleModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-[#DDDDE5] space-y-4">
              <div className="flex items-center justify-between border-b border-[#DDDDE5] pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#0770E3]" />
                  <div>
                    <h3 className="font-bold text-base text-[#111236]">Maintain Flight Schedule</h3>
                    <p className="text-[11px] text-[#68697F]">Flight ID: {scheduleModal.flight_number}</p>
                  </div>
                </div>
                <button onClick={() => setScheduleModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs">
                {/* Departure Schedule */}
                <div className="p-3 bg-blue-50/40 rounded-lg border border-blue-200 space-y-2">
                  <span className="font-bold text-[#0770E3] uppercase text-[10px] block">Departure Place & Time</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] text-[#68697F] block">Airport Code</label>
                      <input
                        type="text"
                        value={scheduleModal.origin}
                        onChange={(e) => setScheduleModal({ ...scheduleModal, origin: e.target.value.toUpperCase() })}
                        required
                        className="w-full px-2 py-1.5 border rounded font-bold uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#68697F] block">City</label>
                      <input
                        type="text"
                        value={scheduleModal.origin_city || ''}
                        onChange={(e) => setScheduleModal({ ...scheduleModal, origin_city: e.target.value })}
                        className="w-full px-2 py-1.5 border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#68697F] block">Departure Time</label>
                      <input
                        type="text"
                        value={scheduleModal.departure_time}
                        onChange={(e) => setScheduleModal({ ...scheduleModal, departure_time: e.target.value })}
                        required
                        className="w-full px-2 py-1.5 border rounded font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Arrival Schedule */}
                <div className="p-3 bg-emerald-50/40 rounded-lg border border-emerald-200 space-y-2">
                  <span className="font-bold text-emerald-700 uppercase text-[10px] block">Arrival Destination & Time</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] text-[#68697F] block">Airport Code</label>
                      <input
                        type="text"
                        value={scheduleModal.destination}
                        onChange={(e) => setScheduleModal({ ...scheduleModal, destination: e.target.value.toUpperCase() })}
                        required
                        className="w-full px-2 py-1.5 border rounded font-bold uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#68697F] block">City</label>
                      <input
                        type="text"
                        value={scheduleModal.destination_city || ''}
                        onChange={(e) => setScheduleModal({ ...scheduleModal, destination_city: e.target.value })}
                        className="w-full px-2 py-1.5 border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#68697F] block">Arrival Time</label>
                      <input
                        type="text"
                        value={scheduleModal.arrival_time}
                        onChange={(e) => setScheduleModal({ ...scheduleModal, arrival_time: e.target.value })}
                        required
                        className="w-full px-2 py-1.5 border rounded font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#111236] block mb-1">Duration</label>
                  <input
                    type="text"
                    value={scheduleModal.duration || '2h 15m'}
                    onChange={(e) => setScheduleModal({ ...scheduleModal, duration: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setScheduleModal(null)}
                    className="px-4 py-2 border rounded text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#0770E3] hover:bg-[#084EB2] text-white rounded text-xs font-bold"
                  >
                    Save Schedule
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ----------------- MODAL: INPUT DELAY (Requirement 5) ----------------- */}
        {delayModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#DDDDE5] space-y-4">
              <div className="flex items-center justify-between border-b border-[#DDDDE5] pb-3">
                <div className="flex items-center gap-2 text-amber-700">
                  <Clock className="w-5 h-5 text-[#FF7110]" />
                  <div>
                    <h3 className="font-bold text-base text-[#111236]">Flight Delay Input</h3>
                    <p className="text-[11px] text-[#68697F]">
                      Flight ID: <strong>{delayModal.flight_number}</strong>
                    </p>
                  </div>
                </div>
                <button onClick={() => setDelayModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleApplyDelay} className="space-y-4 text-xs">
                {/* Delay Input */}
                <div>
                  <label className="font-bold text-[#111236] block mb-1">
                    Delay Duration (Minutes):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="600"
                    value={delayInput.delayMinutes}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      setDelayInput({
                        ...delayInput,
                        delayMinutes: val,
                        departureDelay: val,
                        arrivalDelay: val,
                      })
                    }}
                    required
                    className="w-full px-3 py-2 border border-[#DDDDE5] rounded font-mono font-bold text-lg text-[#FF7110]"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-[#68697F]">Presets:</span>
                  {[
                    { label: 'On Time (0m)', min: 0 },
                    { label: '+30m', min: 30 },
                    { label: '+45m', min: 45 },
                    { label: '+120m (Waiver)', min: 120 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() =>
                        setDelayInput({
                          ...delayInput,
                          delayMinutes: p.min,
                          departureDelay: p.min,
                          arrivalDelay: p.min,
                        })
                      }
                      className="px-2 py-1 bg-gray-100 hover:bg-amber-100 hover:text-amber-900 rounded border text-[10px] font-semibold"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Specific Departure / Arrival Delay breakdown */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-[10px] text-[#68697F] block">Departure Delay (mins)</label>
                    <input
                      type="number"
                      value={delayInput.departureDelay}
                      onChange={(e) => setDelayInput({ ...delayInput, departureDelay: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#68697F] block">Arrival Delay (mins)</label>
                    <input
                      type="number"
                      value={delayInput.arrivalDelay}
                      onChange={(e) => setDelayInput({ ...delayInput, arrivalDelay: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Disruption Reason / Note */}
                <div>
                  <label className="font-bold text-[#111236] block mb-1">
                    Disruption Reason / Notice (Visible to Users):
                  </label>
                  <input
                    type="text"
                    value={delayInput.reason}
                    onChange={(e) => setDelayInput({ ...delayInput, reason: e.target.value })}
                    placeholder="e.g. Air Traffic Control hold at departure airport"
                    className="w-full px-3 py-2 border border-[#DDDDE5] rounded text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDelayModal(null)}
                    className="px-4 py-2 border rounded text-xs font-semibold text-[#68697F]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#FF7110] hover:bg-orange-600 text-white rounded text-xs font-bold shadow-xs transition"
                  >
                    Broadcast Delay to Users
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ----------------- MODAL: DELETE CONFIRMATION ----------------- */}
        {deleteConfirmModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#DDDDE5] space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <AlertTriangle className="w-6 h-6 text-[#D1435B]" />
                <h3 className="font-bold text-base text-[#111236]">Confirm Flight Deletion</h3>
              </div>
              <p className="text-xs text-[#68697F]">
                Are you sure you want to permanently delete flight{' '}
                <strong className="text-[#111236]">{deleteConfirmModal.flight_number}</strong> ({deleteConfirmModal.origin} → {deleteConfirmModal.destination})? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirmModal(null)}
                  className="px-4 py-2 border rounded text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteFlight(deleteConfirmModal)}
                  className="px-5 py-2 bg-[#D1435B] hover:bg-red-700 text-white rounded text-xs font-bold"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- MODAL: MODIFY FLIGHT ----------------- */}
        {editFlightModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-[#DDDDE5] space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#DDDDE5] pb-3">
                <div className="flex items-center gap-2">
                  <Edit className="w-5 h-5 text-purple-700" />
                  <h3 className="font-bold text-base text-[#111236]">
                    Modify Flight: {editFlightModal.flight_number}
                  </h3>
                </div>
                <button onClick={() => setEditFlightModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleModifyFlightSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Airline</label>
                    <input
                      type="text"
                      value={editFlightModal.airline || ''}
                      onChange={(e) => setEditFlightModal({ ...editFlightModal, airline: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Aircraft</label>
                    <input
                      type="text"
                      value={editFlightModal.aircraft || ''}
                      onChange={(e) => setEditFlightModal({ ...editFlightModal, aircraft: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Fare (₹)</label>
                    <input
                      type="number"
                      value={editFlightModal.price || 4999}
                      onChange={(e) => setEditFlightModal({ ...editFlightModal, price: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 border rounded font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Available Seats</label>
                    <input
                      type="number"
                      value={editFlightModal.seats_available || 30}
                      onChange={(e) => setEditFlightModal({ ...editFlightModal, seats_available: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 border rounded"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Policy</label>
                    <select
                      value={editFlightModal.cancellation_policy || 'FREE_CANCELLATION'}
                      onChange={(e) => setEditFlightModal({ ...editFlightModal, cancellation_policy: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded"
                    >
                      <option value="FREE_CANCELLATION">FREE_CANCELLATION</option>
                      <option value="PARTIAL_REFUND">PARTIAL_REFUND</option>
                      <option value="NON_REFUNDABLE">NON_REFUNDABLE</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setEditFlightModal(null)}
                    className="px-4 py-2 border rounded font-semibold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded font-bold text-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
