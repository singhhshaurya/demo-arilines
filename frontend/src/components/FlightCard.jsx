import React from 'react'
import { Plane, AlertTriangle, ShieldCheck, Clock } from 'lucide-react'

export default function FlightCard({ flight, onBook }) {
  if (!flight) return null

  // Safely extract origin and destination whether string or object
  const originCode = typeof flight.origin === 'object' ? (flight.origin?.code || 'DEL') : (flight.origin || 'DEL')
  const originCity = flight.origin_city || (typeof flight.origin === 'object' ? flight.origin?.city : originCode)

  const destCode = typeof flight.destination === 'object' ? (flight.destination?.code || 'BOM') : (flight.destination || 'BOM')
  const destCity = flight.destination_city || (typeof flight.destination === 'object' ? flight.destination?.city : destCode)

  // Safely format departure and arrival times
  const depTime = flight.departure_time?.includes('T')
    ? flight.departure_time.split('T')[1].substring(0, 5)
    : (flight.departure_time || '08:00')

  const arrTime = flight.arrival_time?.includes('T')
    ? flight.arrival_time.split('T')[1].substring(0, 5)
    : (flight.arrival_time || '10:15')

  // Format policy badge styling and text
  const getPolicyBadge = () => {
    const policy = (flight.cancellation_policy || flight.policy?.policy_id || '').toUpperCase()
    const text = flight.cancellation_policy_text || flight.policy?.policy_text || ''

    if (policy.includes('FREE') || policy === 'FREE_CANCELLATION') {
      return {
        bg: 'bg-emerald-50 text-[#00A698] border-emerald-200',
        dot: 'bg-[#00A698]',
        label: text || 'Free cancellation up to 24h before departure',
      }
    }
    if (policy.includes('PARTIAL') || policy === 'PARTIAL_REFUND') {
      return {
        bg: 'bg-amber-50 text-[#FF7110] border-amber-200',
        dot: 'bg-[#FF7110]',
        label: text || 'Partial refund (cancellation fee applies)',
      }
    }
    return {
      bg: 'bg-red-50 text-[#D1435B] border-red-200',
      dot: 'bg-[#D1435B]',
      label: text || 'Non-refundable ticket',
    }
  }

  const policyInfo = getPolicyBadge()

  // Status badge if disrupted
  const isDelayed = flight.status === 'DELAYED'
  const isCancelled = flight.status === 'CANCELLED' || flight.status === 'CANCELLED_BY_AIRLINE'

  return (
    <div
      data-testid="flight-card"
      className="bg-white rounded-lg border border-[#DDDDE5] shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
    >
      {/* Flight disruption banner if any */}
      {isDelayed && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 flex items-center gap-2 text-xs text-amber-800 font-medium">
          <AlertTriangle className="w-4 h-4 text-[#FF7110]" />
          <span>Flight Delayed by {flight.delay_minutes || 45} minutes</span>
        </div>
      )}
      {isCancelled && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-1.5 flex items-center gap-2 text-xs text-red-800 font-medium">
          <AlertTriangle className="w-4 h-4 text-[#D1435B]" />
          <span>Flight Cancelled by Airline</span>
        </div>
      )}

      {/* Main card body */}
      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Airline Logo & Details */}
        <div className="flex items-center gap-3 min-w-[170px]">
          {flight.airline_logo ? (
            <img
              src={flight.airline_logo}
              alt={flight.airline || 'Airline'}
              className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-xs"
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-50 text-[#0770E3] flex items-center justify-center font-bold text-xs border border-blue-100">
              ✈
            </div>
          )}
          <div>
            <h4 className="text-sm font-semibold text-[#111236] leading-tight">
              {flight.airline || 'Air India'}
            </h4>
            <span className="text-xs text-[#68697F] font-mono">
              {flight.flight_number}
            </span>
            <div className="text-[11px] text-[#68697F] hidden sm:block">
              {flight.aircraft || 'Airbus A320'}
            </div>
          </div>
        </div>

        {/* Center: Flight Timeline & Duration */}
        <div className="flex-1 flex items-center justify-between max-w-sm mx-auto w-full px-2 sm:px-4">
          {/* Departure */}
          <div className="text-left">
            <div className="text-xl font-bold text-[#111236] leading-tight">
              {depTime}
            </div>
            <div className="text-xs font-semibold text-[#68697F]">
              {originCode}
            </div>
            <div className="text-[11px] text-[#68697F] truncate max-w-[80px]">
              {originCity}
            </div>
          </div>

          {/* Timeline visualization */}
          <div className="flex-1 px-4 flex flex-col items-center">
            <span className="text-[11px] text-[#68697F] font-medium flex items-center gap-1 mb-1">
              <Clock className="w-3 h-3 text-[#68697F]" />
              {flight.duration || '2h 15m'}
            </span>
            <div className="w-full relative flex items-center justify-center">
              <div className="w-full h-[2px] bg-[#DDDDE5] rounded"></div>
              <div className="absolute bg-white px-1">
                <Plane className="w-4 h-4 text-[#0770E3] rotate-90" />
              </div>
            </div>
            <span
              className={`mt-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                flight.stops === 0 || !flight.stops
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-amber-700 bg-amber-50'
              }`}
            >
              {flight.stops === 0 || !flight.stops ? 'Direct' : flight.stops_text || '1 Stop'}
            </span>
          </div>

          {/* Arrival */}
          <div className="text-right">
            <div className="text-xl font-bold text-[#111236] leading-tight">
              {arrTime}
            </div>
            <div className="text-xs font-semibold text-[#68697F]">
              {destCode}
            </div>
            <div className="text-[11px] text-[#68697F] truncate max-w-[80px]">
              {destCity}
            </div>
          </div>
        </div>

        {/* Right: Pricing & CTA */}
        <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-[#DDDDE5] min-w-[150px]">
          <div className="text-left md:text-right">
            <span className="text-[11px] text-[#68697F] block">Starting from</span>
            <div
              data-testid="flight-price"
              className="text-2xl font-extrabold text-[#111236] tracking-tight"
            >
              ₹{Number(flight.price || 4999).toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-[#68697F]">per adult, taxes incl.</span>
          </div>

          <button
            data-testid="book-button"
            onClick={() => onBook(flight)}
            disabled={isCancelled}
            className={`mt-2 px-5 py-2 rounded-md font-semibold text-sm transition shadow-sm ${
              isCancelled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-[#0770E3] text-white hover:bg-[#084EB2] active:scale-[0.98]'
            }`}
          >
            {isCancelled ? 'Unavailable' : 'Book Now'}
          </button>
        </div>
      </div>

      {/* Bottom strip: Policy Badge */}
      <div
        data-testid="flight-policy"
        className="bg-gray-50/80 border-t border-[#DDDDE5] px-4 py-2 flex items-center justify-between text-xs"
      >
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${policyInfo.dot}`} />
          <span className="text-[#111236] font-medium text-[11px]">
            {policyInfo.label}
          </span>
        </div>
        <div className="text-[11px] text-[#68697F] flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00A698]" />
          <span>SkyPulse Protection Eligible</span>
        </div>
      </div>
    </div>
  )
}
