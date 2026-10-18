import React, { useState, useEffect } from 'react'
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom'
import { getBookingByPNR, cancelBooking } from '../lib/api'
import { getUser } from '../lib/auth'
import {
  CheckCircle2,
  Plane,
  Calendar,
  Clock,
  User,
  Luggage,
  ShieldAlert,
  ArrowRight,
  AlertTriangle,
  FileText,
  Printer,
  ChevronRight,
  X,
} from 'lucide-react'
import FlightInvoiceReceipt from '../components/FlightInvoiceReceipt'

export default function ConfirmationPage() {
  const { pnr } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [booking, setBooking] = useState(location.state?.booking || null)
  const [loading, setLoading] = useState(!location.state?.booking)
  const [error, setError] = useState('')

  // Cancellation modal inside confirmation
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelResult, setCancelResult] = useState(null)

  useEffect(() => {
    let isMounted = true
    const fetchBooking = async () => {
      if (!pnr) return
      setLoading(true)
      try {
        const userEmail = getUser()?.email || ''
        const data = await getBookingByPNR(pnr, userEmail)
        if (isMounted) {
          setBooking(data.booking || data)
        }
      } catch (err) {
        if (isMounted) setError('Could not load booking details for this PNR.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    if (!booking) {
      fetchBooking()
    }
    return () => {
      isMounted = false
    }
  }, [pnr])

  const handleExecuteCancel = async () => {
    if (!pnr) return
    setIsCancelling(true)
    try {
      const email = booking?.passenger?.email || ''
      const res = await cancelBooking(pnr, email)
      setCancelResult(res)
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
    } catch (err) {
      alert('Cancellation failed. Please try from Find Bookings page.')
    } finally {
      setIsCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F2F8] flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-3 border-[#0770E3] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-[#111236]">Loading booking details...</p>
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#F1F2F8] py-12 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg border border-[#DDDDE5] p-6 text-center space-y-4 shadow-sm">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-[#111236]">Booking Not Found</h2>
          <p className="text-xs text-[#68697F]">
            We could not locate a booking with PNR <strong className="font-mono text-[#111236]">{pnr}</strong>.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              to="/manage"
              className="px-4 py-2 bg-[#0770E3] text-white text-xs font-semibold rounded hover:bg-[#084EB2]"
            >
              Lookup by PNR
            </Link>
            <Link
              to="/"
              className="px-4 py-2 border border-[#DDDDE5] text-xs font-semibold rounded hover:bg-gray-50 text-[#68697F]"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isCancelled = booking.status === 'CANCELLED'
  const isDelayed = booking.live_flight?.status === 'DELAYED'
  const isAirlineCancelled = booking.live_flight?.status === 'CANCELLED_BY_AIRLINE'

  return (
    <>
      {/* Official Tax Invoice & Flight Receipt (rendered ONLY in Print / Save PDF) */}
      <div className="hidden print:block w-full">
        <FlightInvoiceReceipt booking={booking} />
      </div>

      {/* Screen Interactive Page (completely hidden during print) */}
      <div className="print:hidden min-h-screen bg-[#F1F2F8] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
        {/* Success / Status Header */}
        <div
          className={`rounded-lg border p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
            isCancelled
              ? 'bg-[#D1435B] border-red-700'
              : 'bg-gradient-to-r from-[#0770E3] to-[#084EB2] border-blue-700'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              {isCancelled ? (
                <ShieldAlert className="w-7 h-7 text-white" />
              ) : (
                <CheckCircle2 className="w-7 h-7 text-white" />
              )}
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold opacity-90 block">
                {isCancelled ? 'Booking Cancelled' : 'Booking Confirmed'}
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight">
                {isCancelled ? 'Flight Booking Cancelled' : 'Ready for Takeoff!'}
              </h1>
              <p className="text-xs opacity-90 mt-0.5">
                Confirmation details sent to{' '}
                <strong className="underline">{booking.passenger?.email || booking.user_email}</strong>
              </p>
            </div>
          </div>

          {/* PNR Badge */}
          <div className="bg-white/15 backdrop-blur-xs px-4 py-2.5 rounded-lg border border-white/30 text-left sm:text-right shrink-0">
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-85 block">Booking Reference (PNR)</span>
            <span
              data-testid="confirmed-pnr-badge"
              className="text-2xl font-black font-mono tracking-wider text-yellow-300"
            >
              {booking.pnr || pnr}
            </span>
          </div>
        </div>

        {/* Airline Flight Disruption Alert (TripSaathi simulation notice) */}
        {isDelayed && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[#FF7110] shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-amber-900">Flight Schedule Alert: Delayed</h4>
                <p className="text-xs text-amber-800">
                  This flight is delayed by {booking.live_flight?.delay_minutes || 60} mins. Under SkyPulse policy, you
                  qualify for 100% full refund if you choose to cancel.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCancelModal(true)}
              className="shrink-0 px-3 py-1.5 bg-[#FF7110] text-white text-xs font-bold rounded hover:bg-[#D95300] transition"
            >
              Cancel with Waiver
            </button>
          </div>
        )}

        {isAirlineCancelled && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[#D1435B] shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-red-900">Flight Cancelled by Airline Operations</h4>
                <p className="text-xs text-red-800">
                  Full 100% refund is pre-approved and guaranteed to your original payment method.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCancelModal(true)}
              className="shrink-0 px-3 py-1.5 bg-[#D1435B] text-white text-xs font-bold rounded hover:bg-red-800 transition"
            >
              Claim 100% Refund
            </button>
          </div>
        )}

        {/* Flight Ticket Card */}
        <div className="bg-white rounded-lg border border-[#DDDDE5] shadow-xs overflow-hidden">
          {/* Card Top Strip */}
          <div className="bg-gray-50 border-b border-[#DDDDE5] px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-bold text-sm text-[#111236]">
                {booking.airline || 'Air India'}
              </span>
              <span className="font-mono text-xs text-[#68697F] bg-gray-200 px-2 py-0.5 rounded">
                {booking.flight_number}
              </span>
              <span className="text-xs text-[#68697F] hidden sm:inline">
                {booking.aircraft || 'Airbus A320neo'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  isCancelled
                    ? 'bg-red-100 text-red-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {booking.status}
              </span>
            </div>
          </div>

          {/* Ticket Flight Itinerary */}
          <div className="p-6 border-b border-[#DDDDE5]">
            <div className="flex items-center justify-between max-w-lg mx-auto">
              {/* Origin */}
              <div className="text-left">
                <div className="text-2xl font-black text-[#111236] leading-none">
                  {booking.departure_time?.includes('T') ? booking.departure_time.split('T')[1].substring(0, 5) : (booking.departure_time || '07:00')}
                </div>
                <div className="text-sm font-bold text-[#0770E3] mt-1">
                  {typeof booking.origin === 'object' ? (booking.origin?.code || 'DEL') : (booking.origin || 'DEL')}
                </div>
                <div className="text-xs text-[#68697F]">
                  {booking.origin_city || (typeof booking.origin === 'object' ? booking.origin?.city : booking.origin) || 'New Delhi'}
                </div>
                <div className="text-[11px] text-[#68697F]">Terminal T3</div>
              </div>

              {/* Flight Timeline */}
              <div className="flex-1 px-6 flex flex-col items-center">
                <span className="text-xs text-[#68697F] font-medium mb-1">
                  {booking.duration || '2h 15m'} • Non-stop
                </span>
                <div className="w-full relative flex items-center justify-center">
                  <div className="w-full h-[2px] bg-[#DDDDE5] rounded"></div>
                  <div className="absolute bg-white px-2">
                    <Plane className="w-4 h-4 text-[#0770E3] rotate-90" />
                  </div>
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold mt-1">Confirmed Seat</span>
              </div>

              {/* Destination */}
              <div className="text-right">
                <div className="text-2xl font-black text-[#111236] leading-none">
                  {booking.arrival_time?.includes('T') ? booking.arrival_time.split('T')[1].substring(0, 5) : (booking.arrival_time || '09:15')}
                </div>
                <div className="text-sm font-bold text-[#0770E3] mt-1">
                  {typeof booking.destination === 'object' ? (booking.destination?.code || 'BOM') : (booking.destination || 'BOM')}
                </div>
                <div className="text-xs text-[#68697F]">
                  {booking.destination_city || (typeof booking.destination === 'object' ? booking.destination?.city : booking.destination) || 'Mumbai'}
                </div>
                <div className="text-[11px] text-[#68697F]">Terminal T2</div>
              </div>
            </div>
          </div>

          {/* Passenger & Baggage Details */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-[#DDDDE5] text-xs">
            <div>
              <h4 className="font-bold text-[#111236] uppercase tracking-wider text-[11px] mb-3 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#0770E3]" />
                Passenger Information
              </h4>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 border border-[#DDDDE5]">
                <div className="flex justify-between">
                  <span className="text-[#68697F]">Name:</span>
                  <span className="font-bold text-[#111236]">{booking.passenger?.name || 'Traveler'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68697F]">Email:</span>
                  <span className="text-[#111236]">{booking.passenger?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68697F]">Phone:</span>
                  <span className="text-[#111236]">{booking.passenger?.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68697F]">Cabin Class:</span>
                  <span className="font-semibold text-[#0770E3]">{booking.class || 'Economy'}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-[#111236] uppercase tracking-wider text-[11px] mb-3 flex items-center gap-1.5">
                <Luggage className="w-3.5 h-3.5 text-[#0770E3]" />
                Baggage Allowance
              </h4>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 border border-[#DDDDE5]">
                <div className="flex justify-between">
                  <span className="text-[#68697F]">Cabin Baggage:</span>
                  <span className="font-bold text-[#111236]">7 kg per passenger</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68697F]">Check-in Baggage:</span>
                  <span className="font-bold text-[#111236]">15 kg (1 piece)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68697F]">Payment Mode:</span>
                  <span className="font-mono text-[#00A698] font-semibold">Razorpay  (Verified)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Fare Summary & Total Paid */}
          <div className="p-6 bg-gray-50/60 border-b border-[#DDDDE5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs space-y-1 text-[#68697F]">
              <span className="font-bold text-[#111236] block">Payment Breakdown</span>
              <div>Base Fare: ₹{(booking.fare?.base_fare || 4200).toLocaleString('en-IN')}</div>
              <div>Taxes & GST (18%): ₹{(booking.fare?.taxes || 750).toLocaleString('en-IN')}</div>
              <div>Convenience Fee: ₹{booking.fare?.convenience_fee || 299}</div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-[#68697F] block">Total Amount Paid</span>
              <span className="text-2xl font-black text-[#111236] font-mono tracking-tight">
                ₹{Number(booking.total_paid || booking.fare?.total || 5499).toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] text-emerald-600 block font-medium">✓ Payment Successful</span>
            </div>
          </div>

          {/* Cancellation Policy Strip */}
          <div className="p-6 bg-blue-50/40 space-y-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-[#0770E3] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-[#111236]">Cancellation Policy for this Flight</h4>
                <p className="text-xs text-[#68697F] mt-0.5 leading-relaxed">
                  {booking.cancellation_policy_text ||
                    'Free cancellation up to 24h prior. 100% refund in case of airline disruption (> 2h delay).'}
                </p>
              </div>
            </div>

            {/* If already cancelled, show cancellation receipt details */}
            {isCancelled && booking.cancellation && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs space-y-1 text-red-900 mt-2">
                <div className="font-bold">Cancellation Refund Receipt</div>
                <div>Refund Amount: ₹{Number(booking.cancellation.refund_amount || 0).toLocaleString('en-IN')}</div>
                <div>Deduction / Fee: ₹{Number(booking.cancellation.cancellation_fee || 0).toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-[#68697F]">Status: Refund credited to original payment source.</div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons: Cancel Flight & Print */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <Link
            to="/manage"
            className="text-xs text-[#0770E3] hover:underline flex items-center gap-1 font-medium"
          >
            ← View another booking in Manage Portal
          </Link>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-white border border-[#DDDDE5] rounded-md text-xs font-semibold text-[#111236] hover:bg-gray-50 flex items-center justify-center gap-2 shadow-xs transition"
            >
              <FileText className="w-4 h-4 text-[#0770E3]" />
              View Tax Invoice
            </button>

            <button
              onClick={() => window.print()}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#0770E3] hover:bg-[#084EB2] text-white rounded-md text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition"
            >
              <Printer className="w-4 h-4 text-white" />
              Print / Save PDF
            </button>

            {!isCancelled && (
              <button
                data-testid="cancel-flight-button"
                onClick={() => setShowCancelModal(true)}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#D1435B] hover:bg-red-700 text-white rounded-md text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98]"
              >
                <ShieldAlert className="w-4 h-4" />
                Cancel Flight
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && (
        <div className="print:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#DDDDE5] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-[#D1435B]" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#111236]">Confirm Flight Cancellation</h3>
                <p className="text-xs text-[#68697F]">PNR: {booking.pnr || pnr}</p>
              </div>
            </div>

            <p className="text-xs text-[#68697F] leading-relaxed">
              Are you sure you want to cancel your flight reservation? Your seat will be released and your refund will
              be processed according to the fare policy.
            </p>

            <div className="bg-gray-50 rounded-lg p-3.5 border border-[#DDDDE5] text-xs space-y-2">
              <div className="flex justify-between text-[#68697F]">
                <span>Original Ticket Price:</span>
                <span className="font-mono font-bold text-[#111236]">
                  ₹{Number(booking.total_paid || 4999).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-[#68697F]">
                <span>Cancellation Fee:</span>
                <span className="font-mono text-[#D1435B]">
                  {booking.cancellation_policy === 'FREE_CANCELLATION' || isDelayed || isAirlineCancelled
                    ? '₹0 (Free / Waiver)'
                    : '₹2,500'}
                </span>
              </div>
              <div className="pt-2 border-t border-[#DDDDE5] flex justify-between font-bold text-sm text-[#111236]">
                <span>Estimated Net Refund:</span>
                <span className="font-mono text-[#00A698] text-base">
                  ₹
                  {booking.cancellation_policy === 'FREE_CANCELLATION' || isDelayed || isAirlineCancelled
                    ? Number(booking.total_paid || 4999).toLocaleString('en-IN')
                    : Math.max(0, Number(booking.total_paid || 4999) - 2500).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="px-4 py-2 border border-[#DDDDE5] rounded text-xs font-semibold text-[#68697F] hover:bg-gray-50"
              >
                Keep Booking
              </button>
              <button
                type="button"
                data-testid="confirm-cancel-button"
                onClick={async () => {
                  await handleExecuteCancel()
                  setShowCancelModal(false)
                }}
                disabled={isCancelling}
                className="px-5 py-2 bg-[#D1435B] hover:bg-red-700 text-white rounded text-xs font-bold shadow transition flex items-center gap-1.5"
              >
                {isCancelling ? 'Processing Cancellation...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* On-screen Tax Invoice Preview Modal */}
      {showInvoiceModal && (
        <div className="print:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-[#DDDDE5] space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#DDDDE5]">
              <h3 className="font-bold text-sm text-[#111236]">Tax Invoice & Flight Reservation Receipt</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-[#0770E3] hover:bg-[#084EB2] text-white text-xs font-bold rounded flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save PDF
                </button>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="max-h-[75vh] overflow-y-auto pr-1">
              <FlightInvoiceReceipt booking={booking} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
