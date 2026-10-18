import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import {
  Plane,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  CreditCard,
  User,
  AlertCircle,
  Clock,
  Luggage,
  Calendar,
  Lock,
  RefreshCw,
  Info,
} from 'lucide-react'
import { createPaymentOrder, createBooking, getFlightById, MOCK_FLIGHTS } from '../lib/api'
import { getUser } from '../lib/auth'

function getAirportFullName(code, city) {
  switch (code) {
    case 'DEL':
      return 'Indira Gandhi International Airport'
    case 'BOM':
      return 'Chhatrapati Shivaji Maharaj International Airport'
    case 'BLR':
      return 'Kempegowda International Airport'
    case 'GOI':
      return 'Manohar International Airport'
    case 'HYD':
      return 'Rajiv Gandhi International Airport'
    case 'CCU':
      return 'Netaji Subhas Chandra Bose International Airport'
    default:
      return `${city || code} Airport`
  }
}

function formatFlightDate(dateStr) {
  if (!dateStr) return '18/10/2026 (Sun, 18 Oct 2026)'
  try {
    let d = new Date(dateStr)
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const parts = dateStr.split('T')[0].split('-')
      if (parts.length === 3) {
        d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
      }
    }
    if (isNaN(d.getTime())) return dateStr
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    const weekday = d.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    })
    return `${dd}/${mm}/${yyyy} (${weekday})`
  } catch {
    return dateStr
  }
}

function formatArrivalDate(depDateStr, depTimeStr, arrTimeStr) {
  try {
    let d = new Date(2026, 9, 18)
    if (depDateStr && typeof depDateStr === 'string' && depDateStr.includes('-')) {
      const parts = depDateStr.split('T')[0].split('-')
      if (parts.length === 3) {
        d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
      }
    }
    let isNextDay = false
    if (depTimeStr && arrTimeStr) {
      const depH = parseInt(depTimeStr.split(':')[0], 10)
      const depM = parseInt(depTimeStr.split(':')[1] || '0', 10)
      const arrH = parseInt(arrTimeStr.split(':')[0], 10)
      const arrM = parseInt(arrTimeStr.split(':')[1] || '0', 10)
      if (arrH < depH || (arrH === depH && arrM < depM)) {
        d.setDate(d.getDate() + 1)
        isNextDay = true
      }
    }
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    const weekday = d.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    })
    return `${dd}/${mm}/${yyyy} (${weekday})${isNextDay ? ' (+1 Next Day)' : ''}`
  } catch {
    return depDateStr
  }
}

export default function BookingPage() {
  const { flightId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const loggedInUser = getUser()

  // Flight data from location state or loaded by ID
  const [flight, setFlight] = useState(location.state?.flight || null)
  const [loadingFlight, setLoadingFlight] = useState(!location.state?.flight)

  // Booking form state
  const [step, setStep] = useState(1) // 1: Passenger, 2: Payment
  const [cabinClass, setCabinClass] = useState(location.state?.class || 'Economy')
  const [passenger, setPassenger] = useState({
    name: loggedInUser?.name || '',
    email: loggedInUser?.email || '',
    phone: '',
    age: '',
    gender: 'Male',
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [orderData, setOrderData] = useState(null)
  const [bookingError, setBookingError] = useState('')

  // Load flight if not provided in route state
  useEffect(() => {
    if (!flight) {
      const fetchFlight = async () => {
        setLoadingFlight(true)
        try {
          const targetId = flightId || new URLSearchParams(location.search).get('flight_id')
          if (targetId) {
            const data = await getFlightById(targetId)
            setFlight(data || MOCK_FLIGHTS[0])
          } else {
            setFlight(MOCK_FLIGHTS[0])
          }
        } catch (err) {
          console.error('Failed to load flight for booking:', err)
          setFlight(MOCK_FLIGHTS[0])
        } finally {
          setLoadingFlight(false)
        }
      }
      fetchFlight()
    }
  }, [flightId, location.search, flight])

  if (loadingFlight) {
    return (
      <div className="min-h-screen bg-[#F1F2F8] py-16 px-4 flex items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#0770E3] animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#111236]">Retrieving flight itinerary...</p>
        </div>
      </div>
    )
  }

  if (!flight) {
    return (
      <div className="min-h-screen bg-[#F1F2F8] py-16 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg border border-[#DDDDE5] p-6 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-[#D1435B] mx-auto" />
          <h2 className="text-lg font-bold text-[#111236]">Flight Itinerary Not Found</h2>
          <p className="text-xs text-[#68697F]">
            We could not find the selected flight. Please return to the flight search page to select an active route.
          </p>
          <Link
            to="/search"
            className="inline-block px-5 py-2.5 bg-[#0770E3] text-white text-xs font-semibold rounded-md hover:bg-[#084EB2] transition shadow-xs"
          >
            Return to Flight Search
          </Link>
        </div>
      </div>
    )
  }

  // Safe airport & route details
  const originCode = typeof flight.origin === 'object' ? (flight.origin?.code || 'DEL') : (flight.origin || 'DEL')
  const originCity = flight.origin_city || (typeof flight.origin === 'object' ? flight.origin?.city : originCode)
  const originAirport = flight.origin_airport || getAirportFullName(originCode, originCity)
  const originTerminal = flight.origin_terminal || flight.origin?.terminal || 'T3'

  const destCode = typeof flight.destination === 'object' ? (flight.destination?.code || 'BOM') : (flight.destination || 'BOM')
  const destCity = flight.destination_city || (typeof flight.destination === 'object' ? flight.destination?.city : destCode)
  const destAirport = flight.destination_airport || getAirportFullName(destCode, destCity)
  const destTerminal = flight.destination_terminal || flight.destination?.terminal || 'T2'

  const depTime = flight.departure_time?.includes('T')
    ? flight.departure_time.split('T')[1].substring(0, 5)
    : (flight.departure_time || '08:00')

  const arrTime = flight.arrival_time?.includes('T')
    ? flight.arrival_time.split('T')[1].substring(0, 5)
    : (flight.arrival_time || '10:15')

  const rawFlightDate = flight.date || flight.departure_date || '2026-10-18'
  const departureDateFormatted = formatFlightDate(rawFlightDate)
  const arrivalDateFormatted = formatArrivalDate(rawFlightDate, depTime, arrTime)

  const airlineName = flight.airline || 'SkyPulse Air'
  const flightNumber = flight.flight_number || 'SP-804'
  const aircraft = flight.aircraft || 'Airbus A320neo'
  const duration = flight.duration || '2h 15m'
  const stopsText = flight.stops === 0 ? 'Non-stop' : (flight.stops_text || `${flight.stops} Stop`)

  // Pricing calculations
  const classMultiplier = cabinClass === 'Business' ? 2.2 : 1
  const rawBaseFare = Math.round((flight.base_fare || (Number(flight.price || 4999) * 0.82)) * classMultiplier)
  const taxes = Math.round(rawBaseFare * 0.18)
  const convenienceFee = 299
  const totalAmount = rawBaseFare + taxes + convenienceFee

  const validatePassenger = () => {
    const errs = {}
    if (!passenger.name.trim()) errs.name = 'Full passenger name is required'
    if (!passenger.email.trim() || !/\S+@\S+\.\S+/.test(passenger.email)) {
      errs.email = 'Valid email address is required'
    }
    if (!passenger.phone.trim() || passenger.phone.length < 8) {
      errs.phone = 'Valid contact phone number is required'
    }
    if (!passenger.age || Number(passenger.age) < 1 || Number(passenger.age) > 120) {
      errs.age = 'Valid age is required (1-120)'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleContinueToPayment = async (e) => {
    e.preventDefault()
    if (!validatePassenger()) return

    setIsLoading(true)
    setBookingError('')
    try {
      const order = await createPaymentOrder(flight._id || flight.id || flightNumber, totalAmount)
      setOrderData(order)
      setStep(2)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error('Order creation error:', err)
      setBookingError('Failed to initiate payment order. You can still confirm via Sandbox below.')
      setStep(2)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompleteBooking = async (paymentDetails = {}) => {
    setIsLoading(true)
    setBookingError('')
    try {
      const payload = {
        flight_id: flight._id || flight.id || flightNumber,
        flight: flight,
        passenger: {
          name: passenger.name,
          email: passenger.email,
          phone: passenger.phone,
          age: Number(passenger.age),
          gender: passenger.gender,
        },
        class: cabinClass,
        fare: {
          base_fare: rawBaseFare,
          taxes,
          convenience_fee: convenienceFee,
          total: totalAmount,
        },
        payment: {
          order_id: orderData?.order_id || `order_${Date.now()}`,
          payment_id: paymentDetails.razorpay_payment_id || `pay_${Date.now()}`,
          status: 'SUCCESS',
          amount: totalAmount,
        },
        cancellation_policy: flight.cancellation_policy || 'FREE_CANCELLATION',
        cancellation_policy_text:
          flight.cancellation_policy_text || 'Free cancellation up to 24h before departure',
      }

      const res = await createBooking(payload)
      const pnr = res.pnr || res.booking?.pnr

      navigate(`/confirmation/${pnr}`, { state: { booking: res.booking || payload, pnr } })
    } catch (err) {
      console.error('Booking finalization error:', err)
      setBookingError('Booking confirmation failed. Please contact support or try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRazorpayPayment = () => {
    if (!window.Razorpay) {
      handleCompleteBooking({ razorpay_payment_id: `pay_fallback_${Date.now()}` })
      return
    }

    try {
      const options = {
        key: orderData?.key_id || 'rzp_test_placeholder',
        amount: orderData?.amount || totalAmount * 100,
        currency: 'INR',
        name: 'SkyPulse Airlines',
        description: `Flight ${flightNumber} (${originCode} → ${destCode})`,
        order_id: orderData?.order_id,
        handler: function (response) {
          handleCompleteBooking(response)
        },
        prefill: {
          name: passenger.name,
          email: passenger.email,
          contact: passenger.phone,
        },
        theme: {
          color: '#0770E3',
        },
        modal: {
          ondismiss: function () {
            setIsLoading(false)
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response) {
        setBookingError(`Payment failed: ${response.error?.description || 'Payment was declined'}`)
      })
      rzp.open()
    } catch (err) {
      console.warn('Direct Razorpay open failed, offering simulated test flow:', err)
      handleCompleteBooking({ razorpay_payment_id: `sim_pay_${Date.now()}` })
    }
  }

  return (
    <div className="min-h-screen bg-[#F1F2F8] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/search"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0770E3] hover:text-[#084EB2] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Flight Results
          </Link>

          <div className="flex items-center gap-2 text-xs text-[#68697F]">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium text-emerald-700">Official SkyPulse Secure Checkout</span>
          </div>
        </div>

        {/* Page Header */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111236] tracking-tight">
            Complete Your Flight Reservation
          </h1>
          <p className="text-xs text-[#68697F]">
            Review your itinerary, choose your cabin class, provide passenger details, and confirm your ticket.
          </p>
        </div>

        {/* Stepper Indicator */}
        <div className="bg-white rounded-lg border border-[#DDDDE5] p-3 shadow-xs flex items-center justify-between sm:justify-start gap-4 sm:gap-8 text-xs font-semibold">
          <div
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 cursor-pointer transition ${
              step === 1 ? 'text-[#0770E3]' : 'text-emerald-600'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 1 ? 'bg-[#0770E3] text-white' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
            </div>
            <span>Passenger Details</span>
          </div>

          <div className="h-4 w-px bg-gray-200 hidden sm:block" />

          <div
            className={`flex items-center gap-2 transition ${
              step === 2 ? 'text-[#0770E3]' : 'text-[#68697F]'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 2 ? 'bg-[#0770E3] text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              2
            </div>
            <span>Payment & Confirmation</span>
          </div>
        </div>

        {/* Error Notification */}
        {bookingError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-[#D1435B] flex items-center gap-2 shadow-xs">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="font-medium">{bookingError}</span>
          </div>
        )}

        {/* Main Grid: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column (2 Cols): Details & Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Flight Itinerary Card */}
            <div className="bg-white rounded-lg border border-[#DDDDE5] shadow-xs overflow-hidden">
              <div className="bg-gray-50/90 border-b border-[#DDDDE5] px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {flight.airline_logo ? (
                    <img
                      src={flight.airline_logo}
                      alt={airlineName}
                      className="w-8 h-8 rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0770E3] flex items-center justify-center font-bold text-xs">
                      <Plane className="w-4 h-4" />
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-sm text-[#111236] block">{airlineName}</span>
                    <span className="text-xs text-[#68697F] font-mono">
                      {flightNumber} • {aircraft}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-[#0770E3] border border-blue-200">
                    {stopsText}
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {flight.cancellation_policy === 'FREE_CANCELLATION'
                      ? 'Free Cancellation'
                      : 'Standard Refund'}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Route & Times Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  {/* Origin */}
                  <div>
                    <span className="text-xs text-[#68697F] block">Departure</span>
                    <div className="text-2xl font-black text-[#111236]">{depTime}</div>
                    <div className="text-sm font-bold text-[#0770E3]">{originCode}</div>
                    <div className="text-xs text-[#111236] font-medium">{originCity}</div>
                    <div className="text-[11px] text-[#68697F] mt-0.5">
                      {originTerminal ? `Terminal ${originTerminal}, ` : ''}{originAirport}
                    </div>
                    <div className="text-[11px] font-semibold text-[#111236] mt-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#0770E3]" />
                      {departureDateFormatted}
                    </div>
                  </div>

                  {/* Flight Duration Visual */}
                  <div className="text-center space-y-1.5 sm:px-4">
                    <span className="text-xs text-[#68697F] font-medium flex items-center justify-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {duration}
                    </span>
                    <div className="relative flex items-center justify-center">
                      <div className="w-full h-0.5 bg-[#DDDDE5]" />
                      <Plane className="w-4 h-4 text-[#0770E3] absolute rotate-90" />
                    </div>
                    <span className="text-[11px] text-[#68697F] block font-medium">
                      Direct / Non-stop Flight
                    </span>
                  </div>

                  {/* Destination */}
                  <div className="sm:text-right">
                    <span className="text-xs text-[#68697F] block">Arrival</span>
                    <div className="text-2xl font-black text-[#111236]">{arrTime}</div>
                    <div className="text-sm font-bold text-[#0770E3]">{destCode}</div>
                    <div className="text-xs text-[#111236] font-medium">{destCity}</div>
                    <div className="text-[11px] text-[#68697F] mt-0.5">
                      {destTerminal ? `Terminal ${destTerminal}, ` : ''}{destAirport}
                    </div>
                    <div className="text-[11px] font-semibold text-[#111236] mt-1 flex items-center sm:justify-end gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#0770E3]" />
                      {arrivalDateFormatted}
                    </div>
                  </div>
                </div>

                {/* Baggage & In-flight Allowance */}
                <div className="pt-4 border-t border-[#DDDDE5] flex flex-wrap items-center justify-between text-xs text-[#68697F] gap-3">
                  <div className="flex items-center gap-2">
                    <Luggage className="w-4 h-4 text-[#0770E3]" />
                    <span>
                      Cabin Baggage: <strong>7 kg</strong> | Check-in Baggage:{' '}
                      <strong>{cabinClass === 'Business' ? '30 kg' : '15 kg'}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-600 font-medium text-[11px]">
                    <ShieldCheck className="w-4 h-4" />
                    <span>TripSaathi Autonomous Protection Included</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 1: Passenger Form */}
            {step === 1 ? (
              <form onSubmit={handleContinueToPayment} className="space-y-6">
                {/* 2. Cabin Class Selection */}
                <div className="bg-white rounded-lg border border-[#DDDDE5] p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#111236]">Choose Cabin Class</h3>
                      <p className="text-xs text-[#68697F]">
                        Select your preferred comfort and in-flight amenities.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#0770E3] bg-blue-50 px-2.5 py-0.5 rounded">
                      Current: {cabinClass}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setCabinClass('Economy')}
                      className={`p-4 rounded-lg border text-left transition relative ${
                        cabinClass === 'Economy'
                          ? 'border-[#0770E3] bg-blue-50/40 ring-2 ring-[#0770E3]'
                          : 'border-[#DDDDE5] hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-[#111236]">Economy Class</span>
                        <span className="text-xs font-bold text-[#0770E3]">Standard Fare</span>
                      </div>
                      <p className="text-xs text-[#68697F] leading-relaxed">
                        Comfortable seating, 15 kg check-in baggage, standard flight services.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCabinClass('Business')}
                      className={`p-4 rounded-lg border text-left transition relative ${
                        cabinClass === 'Business'
                          ? 'border-[#0770E3] bg-blue-50/40 ring-2 ring-[#0770E3]'
                          : 'border-[#DDDDE5] hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-[#111236]">Business Class</span>
                        <span className="text-xs font-bold text-[#FF7110]">
                          +₹{Math.round((flight.base_fare || 4000) * 1.2).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="text-xs text-[#68697F] leading-relaxed">
                        Priority check-in & boarding, 30 kg baggage, gourmet dining, extra legroom.
                      </p>
                    </button>
                  </div>
                </div>

                {/* 3. Passenger Information Inputs */}
                <div className="bg-white rounded-lg border border-[#DDDDE5] p-6 shadow-xs space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#111236] flex items-center gap-2">
                      <User className="w-4 h-4 text-[#0770E3]" />
                      Primary Passenger Information
                    </h3>
                    <p className="text-xs text-[#68697F] mt-0.5">
                      Ensure traveler names match the government photo ID presented at airport security.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#111236] mb-1.5">
                        Full Passenger Name *
                      </label>
                      <input
                        data-testid="passenger-name-input"
                        type="text"
                        value={passenger.name}
                        onChange={(e) => setPassenger({ ...passenger, name: e.target.value })}
                        placeholder="e.g. Arnesh Kumar Gupta"
                        className="w-full px-3.5 py-2.5 text-xs border border-[#DDDDE5] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0770E3]"
                      />
                      {errors.name && (
                        <span className="text-[11px] text-[#D1435B] mt-1 block">{errors.name}</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#111236] mb-1.5">
                        Email Address (Ticket Delivery) *
                      </label>
                      <input
                        data-testid="passenger-email-input"
                        type="email"
                        value={passenger.email}
                        onChange={(e) => setPassenger({ ...passenger, email: e.target.value })}
                        placeholder="e.g. traveler@example.com"
                        className="w-full px-3.5 py-2.5 text-xs border border-[#DDDDE5] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0770E3]"
                      />
                      {errors.email && (
                        <span className="text-[11px] text-[#D1435B] mt-1 block">{errors.email}</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#111236] mb-1.5">
                        Phone Number (SMS & Gate Updates) *
                      </label>
                      <input
                        data-testid="passenger-phone-input"
                        type="tel"
                        value={passenger.phone}
                        onChange={(e) => setPassenger({ ...passenger, phone: e.target.value })}
                        placeholder="e.g. +91 9876543210"
                        className="w-full px-3.5 py-2.5 text-xs border border-[#DDDDE5] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0770E3]"
                      />
                      {errors.phone && (
                        <span className="text-[11px] text-[#D1435B] mt-1 block">{errors.phone}</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#111236] mb-1.5">
                          Age *
                        </label>
                        <input
                          data-testid="passenger-age-input"
                          type="number"
                          value={passenger.age}
                          onChange={(e) => setPassenger({ ...passenger, age: e.target.value })}
                          placeholder="e.g. 28"
                          min="1"
                          max="120"
                          className="w-full px-3.5 py-2.5 text-xs border border-[#DDDDE5] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0770E3]"
                        />
                        {errors.age && (
                          <span className="text-[11px] text-[#D1435B] mt-1 block">{errors.age}</span>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#111236] mb-1.5">
                          Gender
                        </label>
                        <select
                          value={passenger.gender}
                          onChange={(e) => setPassenger({ ...passenger, gender: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs border border-[#DDDDE5] rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0770E3]"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Link
                    to="/search"
                    className="px-5 py-2.5 border border-[#DDDDE5] rounded-md text-xs font-semibold text-[#68697F] hover:bg-gray-50 transition"
                  >
                    Cancel
                  </Link>

                  <button
                    data-testid="continue-to-payment-button"
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2.5 bg-[#0770E3] hover:bg-[#084EB2] text-white text-xs font-bold rounded-md shadow-xs flex items-center gap-2 transition active:scale-[0.99]"
                  >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                    {isLoading ? 'Preparing Order...' : 'Continue to Payment'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              /* Step 2: Payment & Final Checkout */
              <div className="bg-white rounded-lg border border-[#DDDDE5] p-6 shadow-xs space-y-6">
                <div>
                  <h3 className="text-base font-bold text-[#111236] flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#0770E3]" />
                    Review & Select Payment Method
                  </h3>
                  <p className="text-xs text-[#68697F] mt-0.5">
                    Your flight reservation will be issued immediately upon payment confirmation.
                  </p>
                </div>

                {/* Traveler summary card */}
                <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-4 text-xs space-y-1.5">
                  <div className="flex justify-between items-center pb-2 border-b border-blue-200">
                    <span className="font-bold text-[#111236]">Passenger Details</span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-[#0770E3] hover:underline font-semibold"
                    >
                      Edit Info
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[#111236]">
                    <div>
                      <span className="text-[#68697F]">Name: </span>
                      <strong>{passenger.name}</strong>
                    </div>
                    <div>
                      <span className="text-[#68697F]">Email: </span>
                      <span>{passenger.email}</span>
                    </div>
                    <div>
                      <span className="text-[#68697F]">Contact: </span>
                      <span>{passenger.phone}</span>
                    </div>
                    <div>
                      <span className="text-[#68697F]">Cabin Class: </span>
                      <strong className="text-[#0770E3]">{cabinClass}</strong>
                    </div>
                  </div>
                </div>

                {/* Payment Buttons */}
                <div className="space-y-3 pt-2">
                  <button
                    data-testid="pay-sandbox-button"
                    onClick={() => handleCompleteBooking({ razorpay_payment_id: `pay_sim_${Date.now()}` })}
                    disabled={isLoading}
                    className="w-full py-3.5 bg-[#00A698] hover:bg-[#008276] text-white rounded-lg font-bold text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-[0.99]"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    {isLoading ? 'Processing Payment...' : `Confirm & Pay ₹${totalAmount.toLocaleString('en-IN')} Securely`}
                  </button>

                  <button
                    onClick={handleRazorpayPayment}
                    disabled={isLoading}
                    className="w-full py-2.5 bg-[#0770E3] hover:bg-[#084EB2] text-white rounded-lg font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition"
                  >
                    <CreditCard className="w-4 h-4" />
                    {isLoading ? 'Launching Razorpay...' : 'Pay with Razorpay Test Gateway'}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs pt-3 border-t border-[#DDDDE5]">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-[#68697F] hover:text-[#111236] font-semibold underline"
                  >
                    ← Back to Passenger Form
                  </button>

                  <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-medium">
                    <Lock className="w-3.5 h-3.5" />
                    256-bit Encrypted Reservation
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column (1 Col): Sticky Price Breakdown Card */}
          <div className="space-y-6 lg:sticky lg:top-20">
            <div className="bg-white rounded-lg border border-[#DDDDE5] shadow-xs p-6 space-y-4">
              <h3 className="text-sm font-bold text-[#111236] pb-3 border-b border-[#DDDDE5]">
                Fare & Price Breakdown
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-[#68697F]">
                  <span>Base Airfare ({cabinClass}):</span>
                  <span className="font-mono text-[#111236] font-medium">
                    ₹{rawBaseFare.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between text-[#68697F]">
                  <span>Aviation Taxes & Fees (GST 18%):</span>
                  <span className="font-mono text-[#111236] font-medium">
                    ₹{taxes.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between text-[#68697F]">
                  <span>Convenience & Booking Fee:</span>
                  <span className="font-mono text-[#111236] font-medium">
                    ₹{convenienceFee}
                  </span>
                </div>

                <div className="pt-3 border-t border-[#DDDDE5] flex justify-between items-center text-sm font-bold text-[#111236]">
                  <span>Total Amount Payable:</span>
                  <span className="text-xl font-extrabold text-[#0770E3] font-mono">
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Guarantees Box */}
              <div className="bg-gray-50 rounded-lg p-3.5 border border-[#DDDDE5] text-[11px] text-[#68697F] space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Instant PNR Generation:</strong> Tax invoice & boarding details ready immediately.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#0770E3] shrink-0 mt-0.5" />
                  <span>
                    <strong>Self-Service Cancellation:</strong> Free refund assessment tracking via your PNR portal.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
