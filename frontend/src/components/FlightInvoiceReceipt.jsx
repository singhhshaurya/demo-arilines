import React from 'react'

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

function parseLocalDate(dateStr) {
  if (!dateStr) return new Date(2026, 9, 18)
  if (typeof dateStr === 'string' && dateStr.includes('-')) {
    const parts = dateStr.split('T')[0].split('-')
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
    }
  }
  return new Date(dateStr)
}

function formatFlightDate(dateStr) {
  if (!dateStr) return '18/10/2026 (Sun, 18 Oct 2026)'
  try {
    const d = parseLocalDate(dateStr)
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
    const d = parseLocalDate(depDateStr)
    if (isNaN(d.getTime())) return depDateStr
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

function formatGeneratedTimestamp() {
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = now.getFullYear()
  const timeStr = now
    .toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
    .toLowerCase()
  return `${dd}/${mm}/${yyyy}, ${timeStr}`
}

export default function FlightInvoiceReceipt({ booking }) {
  if (!booking) return null

  const isCancelled = booking.status === 'CANCELLED'
  const liveFlight = booking.live_flight || booking.flight || {}

  const pnr = booking.pnr || 'SP-UNKNOWN'
  const flightNumber = liveFlight.flight_number || booking.flight_number || 'SP-804'
  const airline = liveFlight.airline || booking.airline || 'SkyPulse Air'
  const aircraft = liveFlight.aircraft || booking.aircraft || 'Airbus A320neo'
  const cabinClass = booking.class || 'Economy'

  // Route & Airport Info
  const originObj =
    typeof liveFlight.origin === 'object'
      ? liveFlight.origin
      : typeof booking.origin === 'object'
      ? booking.origin
      : {}
  const originCode =
    originObj.code ||
    (typeof liveFlight.origin === 'string'
      ? liveFlight.origin
      : typeof booking.origin === 'string'
      ? booking.origin
      : 'DEL')
  const originCity =
    liveFlight.origin_city ||
    originObj.city ||
    booking.origin_city ||
    (originCode === 'DEL'
      ? 'New Delhi'
      : originCode === 'BOM'
      ? 'Mumbai'
      : originCode === 'BLR'
      ? 'Bangalore'
      : originCode === 'GOI'
      ? 'Goa'
      : originCode === 'HYD'
      ? 'Hyderabad'
      : originCode === 'CCU'
      ? 'Kolkata'
      : originCode)
  const originTerminal =
    liveFlight.origin_terminal || originObj.terminal || booking.origin_terminal || 'T3'
  const originAirport = liveFlight.origin_airport || getAirportFullName(originCode, originCity)

  const destObj =
    typeof liveFlight.destination === 'object'
      ? liveFlight.destination
      : typeof booking.destination === 'object'
      ? booking.destination
      : {}
  const destCode =
    destObj.code ||
    (typeof liveFlight.destination === 'string'
      ? liveFlight.destination
      : typeof booking.destination === 'string'
      ? booking.destination
      : 'BOM')
  const destCity =
    liveFlight.destination_city ||
    destObj.city ||
    booking.destination_city ||
    (destCode === 'BOM'
      ? 'Mumbai'
      : destCode === 'DEL'
      ? 'New Delhi'
      : destCode === 'BLR'
      ? 'Bangalore'
      : destCode === 'GOI'
      ? 'Goa'
      : destCode === 'HYD'
      ? 'Hyderabad'
      : destCode === 'CCU'
      ? 'Kolkata'
      : destCode)
  const destTerminal =
    liveFlight.destination_terminal || destObj.terminal || booking.destination_terminal || 'T2'
  const destAirport = liveFlight.destination_airport || getAirportFullName(destCode, destCity)

  // Dates and Times
  const depTime = liveFlight.departure_time?.includes('T')
    ? liveFlight.departure_time.split('T')[1].substring(0, 5)
    : liveFlight.departure_time || booking.departure_time || '07:00'
  const arrTime = liveFlight.arrival_time?.includes('T')
    ? liveFlight.arrival_time.split('T')[1].substring(0, 5)
    : liveFlight.arrival_time || booking.arrival_time || '09:15'

  const rawDepDate =
    booking.departure_date || liveFlight.date || booking.flight_date || booking.date || '2026-10-18'
  const departureDateFormatted = formatFlightDate(rawDepDate)
  const arrivalDateFormatted = formatArrivalDate(rawDepDate, depTime, arrTime)

  const duration = liveFlight.duration || booking.duration || '2h 15m'
  const stops = liveFlight.stops ?? booking.stops ?? 0
  const stopsText = stops === 0 ? 'Non-stop' : liveFlight.stops_text || booking.stops_text || '1 Stop'

  // Passenger info
  const passengerName = booking.passenger?.name || booking.user_name || 'Arnesh Kumar Gupta'
  const passengerEmail =
    booking.passenger?.email || booking.user_email || booking.email || 'traveler@example.com'
  const passengerPhone = booking.passenger?.phone || '+91 9876543210'
  const passengerAge = booking.passenger?.age || 28
  const passengerGender = booking.passenger?.gender || 'Male'

  // Tariff & Taxes
  const totalAmount = Number(booking.total_paid || booking.fare?.total || 4999)
  const baseFare = Number(booking.fare?.base_fare || Math.round((totalAmount - 299) / 1.18))
  const taxes = Number(booking.fare?.taxes || Math.round(baseFare * 0.18))
  const cgst = Math.round(taxes / 2)
  const sgst = Math.round(taxes / 2)
  const convenienceFee = Number(booking.fare?.convenience_fee || 299)

  const generatedTimestamp = formatGeneratedTimestamp()

  const paymentStatusText = isCancelled
    ? 'REFUNDED'
    : booking.payment?.status === 'SUCCESS' || booking.payment?.payment_id
    ? 'PAID'
    : 'VERIFIED'

  return (
    <div className="bg-white text-[#111236] font-sans p-8 sm:p-10 max-w-2xl mx-auto shadow-sm rounded-lg border border-[#E5E7EB] print:border-none print:shadow-none print:p-0 print:max-w-none print:w-full leading-relaxed">
      {/* Brand Header */}
      <div className="mb-6">
        <h1 className="text-[26px] font-bold text-[#0770E3] tracking-tight">
          SkyPulse Airlines
        </h1>
        <p className="text-[13px] text-[#4B5563] mt-1 font-normal">
          Official Tax Invoice & Flight Reservation Receipt
        </p>
        <p className="text-[13px] text-[#4B5563] mt-0.5">
          Generated: {generatedTimestamp}
        </p>
      </div>

      {/* Booking Reference Box */}
      <div className="border border-[#E5E7EB] rounded-xl p-4 sm:p-5 bg-[#F8FAFC] mb-6 space-y-2">
        <div className="text-[14px] font-bold text-[#111236]">
          Booking Reference: <span className="font-mono tracking-wider">{pnr}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between text-[13px] text-[#111236] gap-2 pt-0.5">
          <div>
            <span className="text-[#4B5563]">Invoice Status:</span>{' '}
            <strong className={isCancelled ? 'text-red-600' : 'text-[#111236]'}>
              {isCancelled ? 'CANCELLED' : 'CONFIRMED'}
            </strong>
          </div>
          <div>
            <span className="text-[#4B5563]">Payment:</span>{' '}
            <strong className="text-[#111236]">Online Payment ({paymentStatusText})</strong>
          </div>
        </div>
      </div>

      {/* Flight & Journey Details */}
      <div className="mb-6 space-y-2 text-[13px] text-[#111236]">
        <h2 className="text-[15px] font-bold text-[#111236] mb-2">
          Flight & Journey Details
        </h2>
        <div>
          <span className="text-[#4B5563]">Flight:</span>{' '}
          <strong className="text-[#111236]">{airline} {flightNumber}</strong> ({aircraft})
        </div>
        <div>
          <span className="text-[#4B5563]">Airline:</span>{' '}
          <strong className="text-[#111236]">{airline}</strong>
        </div>
        <div>
          <span className="text-[#4B5563]">Route:</span>{' '}
          <strong className="text-[#111236]">{originCity} ({originCode}) to {destCity} ({destCode})</strong>
        </div>
        <div>
          <span className="text-[#4B5563]">Departure:</span>{' '}
          <strong className="text-[#111236]">{departureDateFormatted} at {depTime}</strong>{' '}
          <span className="text-[#4B5563]">({originTerminal ? `Terminal ${originTerminal}, ` : ''}{originAirport})</span>
        </div>
        <div>
          <span className="text-[#4B5563]">Arrival:</span>{' '}
          <strong className="text-[#111236]">{arrivalDateFormatted} at {arrTime}</strong>{' '}
          <span className="text-[#4B5563]">({destTerminal ? `Terminal ${destTerminal}, ` : ''}{destAirport})</span>
        </div>
        <div>
          <span className="text-[#4B5563]">Flight Duration:</span>{' '}
          <strong className="text-[#111236]">{duration} ({stopsText})</strong>
        </div>
        <div>
          <span className="text-[#4B5563]">Cabin Class:</span>{' '}
          <strong className="text-[#111236]">{cabinClass}</strong> (Confirmed Seat)
        </div>
      </div>

      {/* Passenger Details */}
      <div className="mb-6 space-y-2 text-[13px] text-[#111236]">
        <h2 className="text-[15px] font-bold text-[#111236] mb-2">
          Passenger Details
        </h2>
        <div>
          <span className="text-[#4B5563]">Primary Passenger:</span>{' '}
          <strong className="text-[#111236]">{passengerName}</strong>
        </div>
        <div>
          <span className="text-[#4B5563]">Email:</span> {passengerEmail}
        </div>
        <div>
          <span className="text-[#4B5563]">Phone:</span> {passengerPhone}
        </div>
        <div>
          <span className="text-[#4B5563]">Total Passengers:</span> 1 Passenger
        </div>
      </div>

      {/* Itemized Tariff Breakdown */}
      <div className="mb-6">
        <h2 className="text-[15px] font-bold text-[#111236] mb-2.5">
          Itemized Tariff Breakdown
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#E5E7EB] text-[#111236]">
                <th className="text-left pb-2 font-bold text-[#111236]">Description</th>
                <th className="text-center pb-2 font-bold text-[#111236]">Qty / Details</th>
                <th className="text-right pb-2 font-bold text-[#111236]">Amount (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              <tr>
                <td className="py-2.5 text-[#111236]">
                  Airfare Base Fare ({cabinClass})
                </td>
                <td className="py-2.5 text-center text-[#4B5563]">
                  1 Passenger
                </td>
                <td className="py-2.5 text-right font-mono text-[#111236]">
                  {baseFare.toLocaleString('en-IN')}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 text-[#111236]">
                  Central GST (CGST 9%)
                </td>
                <td className="py-2.5 text-center text-[#4B5563]">
                  9%
                </td>
                <td className="py-2.5 text-right font-mono text-[#111236]">
                  {cgst.toLocaleString('en-IN')}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 text-[#111236]">
                  State GST (SGST 9%)
                </td>
                <td className="py-2.5 text-center text-[#4B5563]">
                  9%
                </td>
                <td className="py-2.5 text-right font-mono text-[#111236]">
                  {sgst.toLocaleString('en-IN')}
                </td>
              </tr>
              {convenienceFee > 0 && (
                <tr>
                  <td className="py-2.5 text-[#111236]">
                    Aviation Convenience & Airport Passenger Fee
                  </td>
                  <td className="py-2.5 text-center text-[#4B5563]">
                    1
                  </td>
                  <td className="py-2.5 text-right font-mono text-[#111236]">
                    {convenienceFee.toLocaleString('en-IN')}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#E5E7EB]">
                <td className="pt-4 font-bold text-[14px] text-[#111236]" colSpan="2">
                  Total Amount Payable:
                </td>
                <td className="pt-4 text-right font-bold text-[14px] text-[#111236]">
                  INR {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Terms & Footer */}
      <div className="pt-6 border-t border-[#E5E7EB] text-[11px] text-[#6B7280] space-y-1 leading-relaxed">
        <p>
          Terms & Conditions: Standard check-in 2 hours before departure. Free cancellation up to 24h before departure.
        </p>
        <p>
          Late check-in hold protected under TripSaathi & TinyFish Autonomous Reservation Protocol.
        </p>
        <p>
          Thank you for choosing SkyPulse Airlines.
        </p>
      </div>
    </div>
  )
}
