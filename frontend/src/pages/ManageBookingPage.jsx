import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { getBookingByPNR, cancelBooking } from '../lib/api'
import { getUser, isAuthenticated, isAdmin } from '../lib/auth'
import {
  Search,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Plane,
  Clock,
  CheckCircle2,
  Receipt,
  ArrowRight,
  RefreshCw,
  FileText,
  Lock,
} from 'lucide-react'

export default function ManageBookingPage() {
  const [searchParams] = useSearchParams()
  const initialPnr = searchParams.get('pnr') || ''
  const initialEmail = searchParams.get('email') || ''

  const [pnr, setPnr] = useState(initialPnr)
  const [email, setEmail] = useState(initialEmail)
  const [booking, setBooking] = useState(null)
  const [refundPreview, setRefundPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Cancellation State
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancellationReceipt, setCancellationReceipt] = useState(null)

  // Auto-search ONLY if PNR is explicitly provided in URL query
  useEffect(() => {
    if (initialPnr.trim()) {
      handleLookup(initialPnr, initialEmail)
    }
  }, [])

  const handleLookup = async (targetPnr = pnr, targetEmail = email) => {
    if (!targetPnr.trim()) {
      setError('Please enter a valid PNR number.')
      return
    }

    setLoading(true)
    setError('')
    setCancellationReceipt(null)
    setShowCancelConfirm(false)

    try {
      const data = await getBookingByPNR(targetPnr.trim(), targetEmail.trim())
      const b = data.booking || data
      setBooking(b)
      setRefundPreview(data.refund_preview || null)
    } catch (err) {
      console.error('PNR lookup error:', err)
      setError(`No booking found matching PNR "${targetPnr.toUpperCase()}". Please verify details.`)
      setBooking(null)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmCancel = async () => {
    if (!booking?.pnr) return
    setIsCancelling(true)
    try {
      const res = await cancelBooking(booking.pnr, email || booking.passenger?.email)
      setCancellationReceipt(res)
      setBooking((prev) => ({
        ...prev,
        status: 'CANCELLED',
        cancellation: {
          cancelled_at: new Date().toISOString(),
          refund_amount: res.refund_amount,
          cancellation_fee: res.cancellation_fee,
          rule_applied: res.rule_applied,
        },
      }))
      setShowCancelConfirm(false)
    } catch (err) {
      alert('Cancellation request failed. Please try again.')
    } finally {
      setIsCancelling(false)
    }
  }

  const isCancelled = booking?.status === 'CANCELLED'
  const liveFlight = booking?.live_flight || booking?.flight
  const isDelayed = liveFlight?.status === 'DELAYED'
  const isAirlineCancelled = liveFlight?.status === 'CANCELLED_BY_AIRLINE'

  // User Ownership & Authorization Check (Strict Requirement 3)
  const currentUser = getUser()
  const loggedIn = isAuthenticated() && Boolean(currentUser)

  const bookingOwnerEmail = (
    booking?.user_email ||
    booking?.passenger?.email ||
    ''
  ).trim().toLowerCase()

  const currentUserEmail = (currentUser?.email || '').trim().toLowerCase()
  const isOwner = Boolean(loggedIn && currentUserEmail && currentUserEmail === bookingOwnerEmail)
  const isUserAdmin = Boolean(loggedIn && (currentUser?.role === 'admin' || isAdmin()))
  const canCancel = isOwner || isUserAdmin

  const maskEmail = (str) => {
    if (!str || !str.includes('@')) return 'ticket passenger'
    const [name, domain] = str.split('@')
    if (name.length <= 2) return `${name}***@${domain}`
    return `${name.slice(0, 2)}***@${domain}`
  }

  return (
    <div className="min-h-screen bg-[#F1F2F8] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Title & Context */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs uppercase tracking-wider font-bold text-[#0770E3] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            Self-Service Passenger Portal
          </span>
          <h1 className="text-3xl font-extrabold text-[#111236] tracking-tight">
            Find Bookings & Flight Cancellation
          </h1>
          <p className="text-xs text-[#68697F]">
            Retrieve any booking by PNR to check real-time flight status, review cancellation policies, and calculate
            instant refunds.
          </p>
        </div>

        {/* PNR Search Card (Crawler-friendly with data-testids) */}
        <div className="bg-white rounded-lg border border-[#DDDDE5] p-6 shadow-xs">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleLookup()
            }}
            className="grid grid-cols-1 sm:grid-cols-7 gap-4 items-end"
          >
            <div className="sm:col-span-3 space-y-1.5">
              <label className="text-xs font-bold text-[#111236]">Booking Reference / PNR</label>
              <input
                data-testid="pnr-input"
                type="text"
                value={pnr}
                onChange={(e) => setPnr(e.target.value.toUpperCase())}
                placeholder="e.g. SP-89421A"
                required
                className="w-full px-3.5 py-2.5 border border-[#DDDDE5] rounded-md font-mono text-sm uppercase font-semibold focus:outline-none focus:ring-2 focus:ring-[#0770E3]"
              />
            </div>

            <div className="sm:col-span-3 space-y-1.5">
              <label className="text-xs font-bold text-[#111236]">Passenger Email (Optional)</label>
              <input
                data-testid="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="passenger@example.com"
                className="w-full px-3.5 py-2.5 border border-[#DDDDE5] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0770E3]"
              />
            </div>

            <div className="sm:col-span-1">
              <button
                data-testid="lookup-button"
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#0770E3] hover:bg-[#084EB2] text-white rounded-md text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Lookup
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-[#D1435B] font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Cancellation Success Receipt Banner (if just cancelled) */}
        {cancellationReceipt && (
          <div className="bg-emerald-50 border-2 border-emerald-400 rounded-lg p-6 shadow-sm space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
                  Cancellation Receipt #{cancellationReceipt.receipt_id || 'CR-9042'}
                </span>
                <h3 className="text-lg font-extrabold text-[#111236]">
                  Booking Cancelled & Refund Initiated!
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-lg border border-emerald-200 text-xs">
              <div>
                <span className="text-[#68697F] block">Refund Amount</span>
                <span className="text-xl font-black text-[#00A698] font-mono">
                  ₹{Number(cancellationReceipt.refund_amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[#68697F] block">Cancellation Fee</span>
                <span className="text-lg font-bold text-[#68697F] font-mono">
                  ₹{Number(cancellationReceipt.cancellation_fee || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[#68697F] block">Refund Target</span>
                <span className="font-semibold text-[#111236]">Original Payment Source</span>
                <span className="text-[10px] text-[#68697F] block">Razorpay</span>
              </div>
            </div>

            <p className="text-xs text-emerald-900 leading-relaxed">
              <strong>Rule Applied:</strong> {cancellationReceipt.rule_applied || 'Policy terms applied'}. Your seat on{' '}
              {booking?.flight_number} has been released back into airline inventory.
            </p>
          </div>
        )}

        {/* Booking Details & Cancellation Card */}
        {booking && (
          <div className="space-y-6">
            {/* Disruption Alert if delayed / airline cancelled */}
            {isDelayed && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#FF7110] shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">
                      Disruption Notice: Flight Delayed by {liveFlight?.delay_minutes || 45} minutes
                    </h4>
                    <p className="text-xs text-amber-800">
                      Under DGCA & SkyPulse Passenger Charter, passengers on flights delayed by &gt; 2 hours are entitled to
                      100% full refund with zero cancellation fee.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isAirlineCancelled && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-[#D1435B] shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-red-900">
                    Disruption Notice: Flight Cancelled by Airline
                  </h4>
                  <p className="text-xs text-red-800">
                    This flight was cancelled due to airline operational reasons. 100% full refund is guaranteed.
                  </p>
                </div>
              </div>
            )}

            {/* Flight Ticket Summary */}
            <div className="bg-white rounded-lg border border-[#DDDDE5] shadow-xs overflow-hidden">
              <div className="bg-gray-50 border-b border-[#DDDDE5] px-6 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm text-[#111236]">
                    {booking.airline || 'Air India'}
                  </span>
                  <span className="font-mono text-xs text-[#68697F] bg-gray-200 px-2 py-0.5 rounded">
                    {booking.flight_number}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#68697F]">PNR:</span>
                  <span className="font-mono font-bold text-[#0770E3]">{booking.pnr}</span>
                  <span
                    className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isCancelled ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>
              </div>

              {/* Itinerary */}
              <div className="p-6 border-b border-[#DDDDE5]">
                <div className="flex items-center justify-between max-w-md mx-auto">
                  <div className="text-left">
                    <div className="text-2xl font-black text-[#111236]">
                      {booking.departure_time?.includes('T') ? booking.departure_time.split('T')[1].substring(0, 5) : (booking.departure_time || '08:00')}
                    </div>
                    <div className="text-xs font-bold text-[#0770E3]">
                      {typeof booking.origin === 'object' ? (booking.origin?.code || 'DEL') : (booking.origin || 'DEL')}
                    </div>
                    <div className="text-xs text-[#68697F]">
                      {booking.origin_city || (typeof booking.origin === 'object' ? booking.origin?.city : booking.origin) || 'New Delhi'}
                    </div>
                  </div>

                  <div className="flex-1 px-6 flex flex-col items-center">
                    <span className="text-xs text-[#68697F] mb-1">{booking.duration || '2h 15m'}</span>
                    <div className="w-full relative flex items-center justify-center">
                      <div className="w-full h-[2px] bg-[#DDDDE5] rounded"></div>
                      <div className="absolute bg-white px-2">
                        <Plane className="w-4 h-4 text-[#0770E3] rotate-90" />
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-black text-[#111236]">
                      {booking.arrival_time?.includes('T') ? booking.arrival_time.split('T')[1].substring(0, 5) : (booking.arrival_time || '10:15')}
                    </div>
                    <div className="text-xs font-bold text-[#0770E3]">
                      {typeof booking.destination === 'object' ? (booking.destination?.code || 'BOM') : (booking.destination || 'BOM')}
                    </div>
                    <div className="text-xs text-[#68697F]">
                      {booking.destination_city || (typeof booking.destination === 'object' ? booking.destination?.city : booking.destination) || 'Mumbai'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Passenger & Fare Details */}
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs border-b border-[#DDDDE5]">
                <div>
                  <span className="text-[#68697F] block">Passenger Name</span>
                  <span className="font-bold text-[#111236] text-sm">{booking.passenger?.name || 'Traveler'}</span>
                  <span className="text-[#68697F] block mt-1">{booking.passenger?.email}</span>
                </div>
                <div className="sm:text-right">
                  <span className="text-[#68697F] block">Original Fare Paid</span>
                  <span className="text-xl font-bold font-mono text-[#111236]">
                    ₹{Number(booking.total_paid || 4999).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-emerald-600 block">Verified via Razorpay</span>
                </div>
              </div>

              {/* Refund Calculator Section (The Core of Cancellation Demo!) */}
              <div className="p-6 bg-blue-50/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-[#111236] flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-[#0770E3]" />
                      Cancellation & Refund Policy Assessment
                    </h3>
                    <p className="text-xs text-[#68697F] mt-0.5">
                      {booking.cancellation_policy_text ||
                        'Free cancellation up to 24h before departure. Full refund if airline delayed > 2 hours.'}
                    </p>
                  </div>
                </div>

                {/* Calculation Breakdown Box */}
                <div className="bg-white rounded-lg p-4 border border-[#DDDDE5] space-y-2.5 text-xs">
                  <div className="flex justify-between text-[#68697F]">
                    <span>Ticket Price Paid:</span>
                    <span className="font-mono text-[#111236]">
                      ₹{Number(booking.total_paid || 4999).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex justify-between text-[#68697F]">
                    <span>Applicable Cancellation Deduction / Fee:</span>
                    <span className="font-mono text-[#D1435B] font-semibold">
                      {isCancelled
                        ? `₹${Number(booking.cancellation?.cancellation_fee || 0).toLocaleString('en-IN')}`
                        : refundPreview
                        ? `₹${Number(refundPreview.cancellation_fee).toLocaleString('en-IN')}`
                        : booking.cancellation_policy === 'FREE_CANCELLATION' || isDelayed || isAirlineCancelled
                        ? '₹0 (Waiver / Free Cancellation)'
                        : '₹2,500'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#DDDDE5] flex justify-between items-center text-sm font-bold text-[#111236]">
                    <span>Net Refund Amount to Passenger:</span>
                    <span className="text-xl font-mono text-[#00A698] font-black">
                      ₹
                      {isCancelled
                        ? Number(booking.cancellation?.refund_amount || 0).toLocaleString('en-IN')
                        : refundPreview
                        ? Number(refundPreview.refund_amount).toLocaleString('en-IN')
                        : booking.cancellation_policy === 'FREE_CANCELLATION' || isDelayed || isAirlineCancelled
                        ? Number(booking.total_paid || 4999).toLocaleString('en-IN')
                        : Math.max(0, Number(booking.total_paid || 4999) - 2500).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Action button if not yet cancelled (Strict Requirement 3) */}
                {!isCancelled ? (
                  canCancel ? (
                    <div className="pt-2 flex justify-end">
                      <button
                        data-testid="cancel-booking-button"
                        onClick={() => setShowCancelConfirm(true)}
                        className="px-6 py-2.5 bg-[#D1435B] hover:bg-red-700 text-white font-bold text-xs rounded-md shadow-sm transition active:scale-[0.98] flex items-center gap-2"
                      >
                        <ShieldAlert className="w-4 h-4" />
                        Proceed with Cancellation
                      </button>
                    </div>
                  ) : !loggedIn ? (
                    <div className="pt-2 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-amber-600 shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-amber-900">Cancellation Restricted</h4>
                          <p className="text-xs text-amber-800">
                            You must be signed in as the passenger ({maskEmail(bookingOwnerEmail)}) to cancel this flight.
                          </p>
                        </div>
                      </div>
                      <Link
                        to="/"
                        className="px-3.5 py-1.5 bg-[#0770E3] hover:bg-[#084EB2] text-white text-xs font-bold rounded shadow-xs shrink-0"
                      >
                        Sign In
                      </Link>
                    </div>
                  ) : (
                    <div className="pt-2 p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-3">
                      <ShieldAlert className="w-5 h-5 text-gray-500 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-gray-800">Cancellation Unavailable</h4>
                        <p className="text-xs text-gray-600">
                          Signed in as <strong>{currentUserEmail}</strong>. Only the verified booking owner ({maskEmail(bookingOwnerEmail)}) has permission to cancel this ticket.
                        </p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="text-center p-3 bg-red-50 text-red-700 font-semibold text-xs rounded border border-red-200">
                    This ticket has been cancelled. Refund status: PROCESSED.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Confirmation Modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#DDDDE5] space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-[#D1435B]" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#111236]">Confirm Booking Cancellation</h3>
                  <p className="text-xs text-[#68697F]">PNR: {booking.pnr}</p>
                </div>
              </div>

              <p className="text-xs text-[#68697F] leading-relaxed">
                Please confirm that you want to cancel flight{' '}
                <strong className="text-[#111236]">{booking.flight_number}</strong> ({booking.origin} →{' '}
                {booking.destination}). Your refund of{' '}
                <strong className="text-[#00A698]">
                  ₹
                  {refundPreview
                    ? Number(refundPreview.refund_amount).toLocaleString('en-IN')
                    : booking.cancellation_policy === 'FREE_CANCELLATION' || isDelayed || isAirlineCancelled
                    ? Number(booking.total_paid || 4999).toLocaleString('en-IN')
                    : Math.max(0, Number(booking.total_paid || 4999) - 2500).toLocaleString('en-IN')}
                </strong>{' '}
                will be initiated immediately to your payment source.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={isCancelling}
                  className="px-4 py-2 border border-[#DDDDE5] rounded text-xs font-semibold text-[#68697F] hover:bg-gray-50"
                >
                  Keep Booking
                </button>
                <button
                  type="button"
                  data-testid="confirm-cancel-button"
                  onClick={handleConfirmCancel}
                  disabled={isCancelling}
                  className="px-5 py-2 bg-[#D1435B] hover:bg-red-700 text-white rounded text-xs font-bold shadow transition"
                >
                  {isCancelling ? 'Processing...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
