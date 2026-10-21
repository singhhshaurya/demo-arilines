import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom'
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
  Copy,
  Check,
  Share2,
  Sparkles,
  Bot,
  FileText,
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

// =========================================================================
// Smart Autofill Parameter Resolvers (for TinyFish / TripSaathi Autonomous Web Agents)
// =========================================================================

function resolveParam(searchParams, keys, fallback = '') {
  for (const key of keys) {
    const val = searchParams.get(key)
    if (val && val.trim()) return val.trim()
  }
  return fallback
}

function resolveName(searchParams, defaultUser) {
  return resolveParam(
    searchParams,
    ['name', 'passenger_name', 'guest_name', 'traveler_name', 'full_name'],
    defaultUser?.name || ''
  )
}

function resolveEmail(searchParams, defaultUser) {
  return resolveParam(
    searchParams,
    ['email', 'passenger_email', 'guest_email', 'traveler_email'],
    defaultUser?.email || ''
  )
}

function resolvePhone(searchParams) {
  const raw = resolveParam(
    searchParams,
    ['phone', 'passenger_phone', 'guest_phone', 'contact', 'mobile', 'tel'],
    ''
  )
  if (!raw) return ''
  let cleaned = decodeURIComponent(raw).replace(/\s+/g, '')
  if (cleaned.startsWith('2B') || cleaned.startsWith('%2B')) {
    cleaned = '+' + cleaned.replace(/^(%2B|2B)/, '')
  }
  return cleaned
}

function resolveAge(searchParams) {
  const raw = resolveParam(searchParams, ['age', 'passenger_age', 'traveler_age'], '')
  const num = parseInt(raw, 10)
  return !isNaN(num) && num > 0 && num <= 120 ? String(num) : ''
}

function resolveGender(searchParams) {
  const raw = resolveParam(searchParams, ['gender', 'passenger_gender', 'sex'], '').toLowerCase()
  if (!raw) return 'Male'
  if (raw.startsWith('f') || raw === 'female' || raw === 'woman') return 'Female'
  if (raw.startsWith('o') || raw === 'other' || raw === 'nb') return 'Other'
  return 'Male'
}

function resolveCabinClass(searchParams, defaultClass = 'Economy') {
  const raw = resolveParam(
    searchParams,
    ['class', 'cabin', 'cabin_class', 'seat_class', 'tier'],
    ''
  ).toLowerCase()
  if (!raw) return defaultClass
  if (raw.includes('biz') || raw.includes('business') || raw.includes('prem') || raw.includes('first')) {
    return 'Business'
  }
  return 'Economy'
}

function resolveSpecialRequests(searchParams) {
  const custom = resolveParam(
    searchParams,
    ['special_requests', 'request', 'notes', 'disruption_note', 'comment'],
    ''
  )
  if (custom) return custom

  const flightDelay = resolveParam(
    searchParams,
    ['flight', 'flight_no', 'flight_number', 'flight_delay', 'disrupted_flight', 'delayed_flight', 'delay_flight'],
    ''
  )
  const arrival = resolveParam(
    searchParams,
    ['arrival', 'arrival_time', 'expected_arrival'],
    ''
  )

  if (flightDelay && arrival) {
    const arrivalText = arrival.toLowerCase().includes('late') ? 'arriving late' : `arriving at ${arrival}`
    return `Holding check-in due to flight delay ${flightDelay.toUpperCase()} ${arrivalText}`
  }

  if (flightDelay) {
    return `Holding check-in due to flight delay ${flightDelay.toUpperCase()} arriving late`
  }

  if (arrival) {
    const arrivalText = arrival.toLowerCase().includes('late') ? 'arriving late' : `arriving at ${arrival}`
    return `Holding check-in for passenger ${arrivalText}`
  }

  const reason = resolveParam(searchParams, ['reason', 'disruption'], '')
  if (reason && reason.toLowerCase() !== 'false') {
    return `Trip disruption recovery rebooking: ${reason}`
  }
  return ''
}

function resolveHold(searchParams) {
  const raw = resolveParam(searchParams, ['hold', 'late_hold', 'seat_hold', 'fare_lock', 'lock'], '')
  if (!raw) return true // Default true for disruption recovery
  const lower = raw.toLowerCase()
  return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on' || lower === 'required'
}

function resolvePayment(searchParams) {
  const raw = resolveParam(searchParams, ['payment', 'payment_mode', 'pay', 'method'], '').toLowerCase()
  if (raw.includes('razorpay') || raw.includes('online') || raw.includes('card') || raw.includes('upi')) {
    return 'ONLINE_RAZORPAY'
  }
  return 'PAY_AT_PROPERTY' // Pay at Airport Counter / ₹0 upfront disruption voucher
}

function resolveStep(searchParams) {
  const raw = resolveParam(searchParams, ['step', 'auto_step', 'stage'], '').toLowerCase()
  if (raw === '2' || raw === 'payment' || raw === 'checkout' || raw === 'pay') {
    return 2
  }
  return 1
}

export default function BookingPage() {
  const { flightId } = useParams()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const loggedInUser = getUser()

  // Detect whether any autofill parameter was passed via query parameters
  const hasAutofillParams = useMemo(() => {
    return Boolean(
      searchParams.get('name') ||
      searchParams.get('passenger_name') ||
      searchParams.get('guest_name') ||
      searchParams.get('traveler_name') ||
      searchParams.get('email') ||
      searchParams.get('passenger_email') ||
      searchParams.get('guest_email') ||
      searchParams.get('phone') ||
      searchParams.get('passenger_phone') ||
      searchParams.get('guest_phone') ||
      searchParams.get('contact') ||
      searchParams.get('mobile') ||
      searchParams.get('age') ||
      searchParams.get('passenger_age') ||
      searchParams.get('gender') ||
      searchParams.get('passenger_gender') ||
      searchParams.get('class') ||
      searchParams.get('cabin') ||
      searchParams.get('cabin_class') ||
      searchParams.get('flight') ||
      searchParams.get('flight_no') ||
      searchParams.get('flight_number') ||
      searchParams.get('flight_delay') ||
      searchParams.get('disrupted_flight') ||
      searchParams.get('arrival') ||
      searchParams.get('arrival_time') ||
      searchParams.get('hold') ||
      searchParams.get('late_hold') ||
      searchParams.get('payment') ||
      searchParams.get('payment_mode') ||
      searchParams.get('step') ||
      searchParams.get('notes') ||
      searchParams.get('special_requests')
    )
  }, [searchParams])

  // Flight data from location state or loaded by ID
  const [flight, setFlight] = useState(location.state?.flight || null)
  const [loadingFlight, setLoadingFlight] = useState(!location.state?.flight)

  // Booking form state initialized with resolved autofill values
  const [step, setStep] = useState(() => resolveStep(searchParams))
  const [cabinClass, setCabinClass] = useState(() =>
    resolveCabinClass(searchParams, location.state?.class || 'Economy')
  )
  const [specialRequests, setSpecialRequests] = useState(() => resolveSpecialRequests(searchParams))
  const [seatHoldRequested, setSeatHoldRequested] = useState(() => resolveHold(searchParams))
  const [paymentMode, setPaymentMode] = useState(() => resolvePayment(searchParams))
  const [passenger, setPassenger] = useState(() => ({
    name: resolveName(searchParams, loggedInUser),
    email: resolveEmail(searchParams, loggedInUser),
    phone: resolvePhone(searchParams),
    age: resolveAge(searchParams),
    gender: resolveGender(searchParams),
  }))

  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [orderData, setOrderData] = useState(null)
  const [bookingError, setBookingError] = useState('')
  const [copied, setCopied] = useState(false)

  // Reactive state synchronization: updates inputs when query string changes dynamically
  useEffect(() => {
    if (hasAutofillParams) {
      setPassenger((prev) => ({
        name: resolveName(searchParams, loggedInUser) || prev.name,
        email: resolveEmail(searchParams, loggedInUser) || prev.email,
        phone: resolvePhone(searchParams) || prev.phone,
        age: resolveAge(searchParams) || prev.age,
        gender: resolveGender(searchParams),
      }))
      const resolvedClass = resolveCabinClass(searchParams, cabinClass)
      setCabinClass(resolvedClass)

      const resolvedNotes = resolveSpecialRequests(searchParams)
      if (resolvedNotes) {
        setSpecialRequests(resolvedNotes)
      }

      setSeatHoldRequested(resolveHold(searchParams))
      setPaymentMode(resolvePayment(searchParams))

      const resolvedStepVal = resolveStep(searchParams)
      if (resolvedStepVal === 2) {
        setStep(2)
      }
    }
  }, [searchParams, hasAutofillParams])

  // Load flight if not provided in route state
  useEffect(() => {
    if (!flight) {
      const fetchFlight = async () => {
        setLoadingFlight(true)
        try {
          const targetId =
            flightId ||
            searchParams.get('flight_id') ||
            '6ad11d23082e23d8abf828d0'
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
  }, [flightId, searchParams, flight])

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

  // Date resolution from query param (e.g. date=2026-10-22) or flight record
  const customDateParam = searchParams.get('date') || searchParams.get('flight_date') || searchParams.get('dep_date')
  const rawFlightDate = customDateParam || flight.date || flight.departure_date || '2026-10-18'
  const departureDateFormatted = formatFlightDate(rawFlightDate)
  const arrivalDateFormatted = formatArrivalDate(rawFlightDate, depTime, arrTime)

  const airlineName = flight.airline || 'SkyPulse Air'
  const flightNumber = flight.flight_number || flight.flight_id || 'SP-804'
  const aircraft = flight.aircraft || 'Airbus A320neo'
  const duration = flight.duration || '2h 15m'
  const stopsText = flight.stops === 0 ? 'Non-stop' : (flight.stops_text || `${flight.stops} Stop`)

  // Pricing calculations
  const classMultiplier = cabinClass === 'Business' ? 2.2 : 1
  const rawBaseFare = Math.round((flight.base_fare || (Number(flight.price || 4999) * 0.82)) * classMultiplier)
  const taxes = Math.round(rawBaseFare * 0.18)
  const convenienceFee = 299
  const totalAmount = rawBaseFare + taxes + convenienceFee

  // Generate current autofill URL using 24-character hex ID for TinyFish autonomous execution
  const generateAutofillUrl = () => {
    // Priority: Route flightId (preserves 24-character ObjectId) > flight._id > flight.id > default ObjectId
    const activeFlightId =
      flightId ||
      flight?._id ||
      flight?.id ||
      '6ad11d23082e23d8abf828d0'

    const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sky-airlines.vercel.app'
    const base = `${originUrl}/book/${encodeURIComponent(activeFlightId)}`
    const params = new URLSearchParams()
    if (passenger.name) params.set('name', passenger.name)
    if (passenger.email) params.set('email', passenger.email)
    if (passenger.phone) params.set('phone', passenger.phone)
    if (passenger.age) params.set('age', passenger.age)
    if (passenger.gender) params.set('gender', passenger.gender)
    if (cabinClass) params.set('class', cabinClass)
    if (customDateParam) params.set('date', customDateParam)

    const rawFlight = searchParams.get('flight') || searchParams.get('flight_no') || searchParams.get('flight_number') || searchParams.get('flight_delay')
    if (rawFlight) {
      params.set('flight', rawFlight)
    }
    const rawArrival = searchParams.get('arrival') || searchParams.get('arrival_time')
    if (rawArrival) {
      params.set('arrival', rawArrival)
    }
    if (specialRequests && !rawFlight) {
      params.set('notes', specialRequests)
    }
    if (seatHoldRequested) {
      params.set('hold', 'true')
    }
    if (paymentMode) {
      params.set('payment', paymentMode === 'ONLINE_RAZORPAY' ? 'online' : 'pay_at_property')
    }
    if (step === 2) {
      params.set('step', '2')
    }
    const queryString = params.toString()
    return queryString ? `${base}?${queryString}` : base
  }

  const handleCopyAutofillUrl = () => {
    const url = generateAutofillUrl()
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(url)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = url
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (err) {
      console.warn('Failed to copy autofill URL:', err)
    }
  }

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
    if (e && e.preventDefault) e.preventDefault()
    if (!validatePassenger()) return

    setIsLoading(true)
    setBookingError('')
    try {
      const activeFlightId = flightId || flight?._id || flight?.id || '6ad11d23082e23d8abf828d0'
      const order = await createPaymentOrder(activeFlightId, totalAmount)
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
      const activeFlightId = flightId || flight?._id || flight?.id || '6ad11d23082e23d8abf828d0'
      const payload = {
        flight_id: activeFlightId,
        flight: {
          ...flight,
          _id: activeFlightId,
          id: activeFlightId,
        },
        passenger: {
          name: passenger.name,
          email: passenger.email,
          phone: passenger.phone,
          age: Number(passenger.age) || 28,
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
          amount: paymentMode === 'PAY_AT_PROPERTY' ? 0 : totalAmount,
          method: paymentMode === 'PAY_AT_PROPERTY' ? 'PAY_AT_PROPERTY' : 'RAZORPAY',
        },
        cancellation_policy: flight.cancellation_policy || 'FREE_CANCELLATION',
        cancellation_policy_text:
          flight.cancellation_policy_text || 'Free cancellation up to 24h before departure',
        special_requests: specialRequests || undefined,
        notes: specialRequests || undefined,
        hold: seatHoldRequested,
      }
        flight: flight,
        passenger: {
          name: passenger.name,
          email: passenger.email,
          phone: passenger.phone,
          age: Number(passenger.age) || 28,
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
        special_requests: specialRequests || undefined,
        notes: specialRequests || undefined,
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
        {/* Navigation Breadcrumb & Share Actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link
            to="/search"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0770E3] hover:text-[#084EB2] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Flight Results
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="share-autofill-btn-header"
              onClick={handleCopyAutofillUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-gray-50 border border-[#DDDDE5] rounded-md text-xs font-semibold text-[#111236] transition shadow-2xs active:scale-95"
              title="Copy shareable link with current passenger details"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Share2 className="w-3.5 h-3.5 text-[#0770E3]" />
              )}
              <span>{copied ? 'Autofill URL Copied!' : 'Share / Copy Autofill Link'}</span>
            </button>

            <div className="flex items-center gap-2 text-xs text-[#68697F]">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-medium text-emerald-700 hidden sm:inline">
                Official SkyPulse Secure Checkout
              </span>
            </div>
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

        {/* Smart Autofill Active Visual Notification Banner */}
        {hasAutofillParams && (
          <div
            data-testid="autofill-banner"
            className="bg-gradient-to-r from-blue-50 via-indigo-50/70 to-emerald-50/60 border border-blue-200/80 rounded-xl p-4 shadow-xs space-y-3 animate-in fade-in duration-200"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0770E3] text-white text-[11px] font-bold tracking-wide shadow-xs">
                  <Bot className="w-3.5 h-3.5" />
                  TinyFish / TripSaathi Linked
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  Smart Autofill Active
                </span>
              </div>

              <button
                type="button"
                data-testid="copy-autofill-btn"
                onClick={handleCopyAutofillUrl}
                className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-blue-50 border border-blue-200 text-[#0770E3] rounded-md text-xs font-semibold shadow-2xs transition active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#0770E3]" />}
                <span>{copied ? 'Link Copied!' : 'Copy Autofill Link'}</span>
              </button>
            </div>

            <p className="text-xs text-[#111236] leading-relaxed">
              Passenger demographics, cabin class, and travel parameters were pre-populated automatically via your autonomous booking link. You can review and proceed with 1 click.
            </p>

            {/* Pre-filled parameters pill display */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
              {passenger.name && (
                <span className="bg-white/90 border border-blue-200 text-[#111236] px-2.5 py-1 rounded-md font-medium">
                  👤 Passenger: <strong>{passenger.name}</strong>
                </span>
              )}
              {passenger.email && (
                <span className="bg-white/90 border border-blue-200 text-[#111236] px-2.5 py-1 rounded-md font-medium">
                  ✉️ Email: <strong>{passenger.email}</strong>
                </span>
              )}
              {passenger.phone && (
                <span className="bg-white/90 border border-blue-200 text-[#111236] px-2.5 py-1 rounded-md font-medium">
                  📞 Phone: <strong>{passenger.phone}</strong>
                </span>
              )}
              {passenger.age && (
                <span className="bg-white/90 border border-blue-200 text-[#111236] px-2.5 py-1 rounded-md font-medium">
                  🎂 Age: <strong>{passenger.age}</strong> ({passenger.gender})
                </span>
              )}
              {cabinClass && (
                <span className="bg-white/90 border border-blue-200 text-[#0770E3] px-2.5 py-1 rounded-md font-bold">
                  💺 Class: {cabinClass}
                </span>
              )}
              {seatHoldRequested && (
                <span className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-2.5 py-1 rounded-md font-medium">
                  🛡️ Check-in Hold: <strong>Guaranteed</strong>
                </span>
              )}
              {paymentMode && (
                <span className="bg-white/90 border border-blue-200 text-[#111236] px-2.5 py-1 rounded-md font-medium">
                  💳 Payment: <strong>{paymentMode === 'ONLINE_RAZORPAY' ? 'Online Razorpay' : 'Pay at Desk (₹0 Today)'}</strong>
                </span>
              )}
              {specialRequests && (
                <span className="bg-amber-50 border border-amber-300 text-amber-900 px-2.5 py-1 rounded-md font-medium">
                  ⚠️ Disruption Note: {specialRequests}
                </span>
              )}
            </div>
          </div>
        )}

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
                      data-testid="cabin-class-economy-btn"
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
                      data-testid="cabin-class-business-btn"
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
                        data-alias-testid="guest-name-input"
                        name="passenger_name"
                        type="text"
                        value={passenger.name}
                        onChange={(e) => setPassenger({ ...passenger, name: e.target.value })}
                        placeholder="e.g. Rahul Sharma"
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
                        data-alias-testid="guest-email-input"
                        name="passenger_email"
                        type="email"
                        value={passenger.email}
                        onChange={(e) => setPassenger({ ...passenger, email: e.target.value })}
                        placeholder="e.g. rahul@example.com"
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
                        data-alias-testid="guest-phone-input"
                        name="passenger_phone"
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
                          name="passenger_age"
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
                          data-testid="passenger-gender-select"
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

                    {/* Guaranteed Check-in Hold until Departure (TripSaathi Disruption Protection) */}
                    <div className="sm:col-span-2 bg-emerald-50/70 border border-emerald-200/90 rounded-lg p-3.5 flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="seat-hold-checkbox"
                        data-testid="seat-hold-checkbox"
                        data-alias-testid="late-hold-checkbox"
                        checked={seatHoldRequested}
                        onChange={(e) => setSeatHoldRequested(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-[#0770E3] rounded border-gray-300 focus:ring-[#0770E3] cursor-pointer"
                      />
                      <label htmlFor="seat-hold-checkbox" className="text-xs text-[#111236] cursor-pointer">
                        <span className="font-bold text-emerald-900 block flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Request Guaranteed Disruption Check-in Hold until departure
                        </span>
                        <span className="text-[#68697F] text-[11px] block mt-0.5">
                          Protects slot reservation & locks fare even if transit or prior flight arrival is delayed.
                        </span>
                      </label>
                    </div>

                    {/* Trip Disruption Notice / Special Request */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-[#111236] mb-1.5 flex items-center justify-between">
                        <span>Trip Disruption Notice / Special Notes</span>
                        <span className="text-[10px] font-normal text-[#68697F]">(Optional • TripSaathi linked)</span>
                      </label>
                      <input
                        data-testid="special-requests-input"
                        type="text"
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        placeholder="e.g. Holding check-in due to flight delay AI-804 arriving late"
                        className="w-full px-3.5 py-2.5 text-xs border border-[#DDDDE5] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0770E3]"
                      />
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
                    data-action="continue-to-payment"
                    id="continue-booking-btn"
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
                    {seatHoldRequested && (
                      <div>
                        <span className="text-[#68697F]">Slot Hold: </span>
                        <strong className="text-emerald-700">Guaranteed until Departure</strong>
                      </div>
                    )}
                    {specialRequests && (
                      <div className="sm:col-span-2">
                        <span className="text-[#68697F]">Disruption Note: </span>
                        <span className="text-amber-800 font-medium">{specialRequests}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-3 pt-1">
                  <label className="block text-xs font-bold text-[#111236]">
                    Choose Payment Option
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      data-testid="payment-method-pay-at-property"
                      data-alias-testid="payment-method-sandbox"
                      onClick={() => setPaymentMode('PAY_AT_PROPERTY')}
                      className={`p-3.5 rounded-lg border text-left transition ${
                        paymentMode === 'PAY_AT_PROPERTY'
                          ? 'border-[#00A698] bg-teal-50/50 ring-2 ring-[#00A698]'
                          : 'border-[#DDDDE5] hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-[#111236]">Pay at Airport Desk</span>
                        <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded">₹0 Due Today</span>
                      </div>
                      <p className="text-[11px] text-[#68697F]">
                        Instant PNR issued. Disruption recovery voucher settled at airport desk or sandbox.
                      </p>
                    </button>

                    <button
                      type="button"
                      data-testid="payment-method-razorpay"
                      onClick={() => setPaymentMode('ONLINE_RAZORPAY')}
                      className={`p-3.5 rounded-lg border text-left transition ${
                        paymentMode === 'ONLINE_RAZORPAY'
                          ? 'border-[#0770E3] bg-blue-50/50 ring-2 ring-[#0770E3]'
                          : 'border-[#DDDDE5] hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-[#111236]">Online Razorpay Gateway</span>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">Instant Ticket</span>
                      </div>
                      <p className="text-[11px] text-[#68697F]">
                        Pay securely via UPI, Cards, Netbanking, or Wallets with Razorpay sandbox.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Payment Buttons */}
                <div className="space-y-3 pt-2">
                  <button
                    data-testid="confirm-booking-btn"
                    data-fallback-testid="pay-sandbox-button"
                    id="confirm-booking-btn"
                    onClick={() => {
                      if (paymentMode === 'ONLINE_RAZORPAY') {
                        handleRazorpayPayment()
                      } else {
                        handleCompleteBooking({ razorpay_payment_id: `pay_counter_voucher_${Date.now()}` })
                      }
                    }}
                    disabled={isLoading}
                    className="w-full py-3.5 bg-[#00A698] hover:bg-[#008276] text-white rounded-lg font-bold text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-[0.99]"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    {isLoading
                      ? 'Issuing PNR...'
                      : paymentMode === 'PAY_AT_PROPERTY'
                      ? 'Confirm Reservation (₹0 Due Today)'
                      : `Confirm & Pay ₹${totalAmount.toLocaleString('en-IN')} Securely`}
                  </button>

                  {paymentMode !== 'PAY_AT_PROPERTY' && (
                    <button
                      onClick={handleRazorpayPayment}
                      disabled={isLoading}
                      className="w-full py-2.5 bg-[#0770E3] hover:bg-[#084EB2] text-white rounded-lg font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition"
                    >
                      <CreditCard className="w-4 h-4" />
                      {isLoading ? 'Launching Razorpay...' : 'Pay with Razorpay Test Gateway'}
                    </button>
                  )}
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

          {/* Right Column (1 Col): Sticky Price Breakdown Card & Agent Generator */}
          <div className="space-y-6 lg:sticky lg:top-20">
            {/* Fare Breakdown */}
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

            {/* TinyFish Autonomous Agent Hub Card */}
            <div className="bg-white rounded-lg border border-[#DDDDE5] shadow-xs p-5 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#DDDDE5]">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#0770E3]" />
                  <h4 className="text-xs font-bold text-[#111236] uppercase tracking-wide">
                    TinyFish Agent Autofill URL
                  </h4>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#0770E3] border border-blue-200">
                  Agent Ready
                </span>
              </div>

              <p className="text-[11px] text-[#68697F] leading-relaxed">
                Generate parameterized booking URLs that pre-fill this reservation form for TinyFish autonomous execution or quick passenger sharing.
              </p>

              {/* Live URL Preview box */}
              <div className="bg-gray-50 border border-[#DDDDE5] rounded p-2.5 font-mono text-[11px] text-[#111236] break-all select-all">
                {generateAutofillUrl()}
              </div>

              <button
                type="button"
                data-testid="copy-autofill-btn"
                onClick={handleCopyAutofillUrl}
                className="w-full py-2 bg-[#0770E3] hover:bg-[#084EB2] text-white rounded text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 text-white" />}
                {copied ? 'Autofill URL Copied to Clipboard!' : 'Copy Autofill URL for TinyFish'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
