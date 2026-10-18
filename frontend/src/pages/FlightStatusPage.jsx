import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { viewFlightStatus } from '../lib/api'
import {
  Search,
  Plane,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Calendar,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Info,
} from 'lucide-react'

export default function FlightStatusPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialFlightId = searchParams.get('flight_id') || searchParams.get('id') || ''
  const initialDate = searchParams.get('date') || ''
  const initialOrigin = searchParams.get('origin') || ''

  const [flightId, setFlightId] = useState(initialFlightId)
  const [date, setDate] = useState(initialDate)
  const [origin, setOrigin] = useState(initialOrigin)

  const [flight, setFlight] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Search on mount ONLY if flight_id was explicitly provided in URL query parameters
  useEffect(() => {
    if (initialFlightId.trim()) {
      handleSearch(initialFlightId, initialDate, initialOrigin)
    }
  }, [])

  const handleSearch = async (targetId = flightId, targetDate = date, targetOrigin = origin) => {
    if (!targetId.trim()) {
      setError('Please enter a valid Flight ID or Flight Number.')
      return
    }

    setLoading(true)
    setError('')
    try {
      // Public backend call - NO JWT REQUIRED
      const data = await viewFlightStatus(targetId.trim(), targetDate.trim(), targetOrigin.trim())
      setFlight(data)
      setSearchParams({
        flight_id: targetId.trim().toUpperCase(),
        date: targetDate,
        origin: targetOrigin.trim().toUpperCase(),
      })
    } catch (err) {
      console.error('Flight status lookup failed:', err)
      setError(`No live flight found matching Flight ID "${targetId.toUpperCase()}" departing from "${targetOrigin.toUpperCase()}".`)
      setFlight(null)
    } finally {
      setLoading(false)
    }
  }

  const isDelayed = flight?.status === 'DELAYED' || (flight?.delay_minutes && flight?.delay_minutes > 0)
  const isCancelled = flight?.status === 'CANCELLED' || flight?.status === 'CANCELLED_BY_AIRLINE'
  const isOnTime = !isDelayed && !isCancelled

  return (
    <div className="min-h-screen bg-[#F1F2F8] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs uppercase tracking-wider font-bold text-[#0770E3] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            Real-Time Flight Tracker
          </span>
          <h1 className="text-3xl font-extrabold text-[#111236] tracking-tight">
            View Live Flight Status
          </h1>
          <p className="text-xs text-[#68697F]">
            Check live departure, arrival, gate, and schedule updates without signing in.
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-white rounded-lg border border-[#DDDDE5] p-6 shadow-xs space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSearch()
            }}
            className="grid grid-cols-1 sm:grid-cols-7 gap-4 items-end"
          >
            {/* Flight ID input */}
            <div className="sm:col-span-3 space-y-1.5">
              <label className="text-xs font-bold text-[#111236] flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5 text-[#0770E3]" />
                Flight ID / Number
              </label>
              <input
                type="text"
                value={flightId}
                onChange={(e) => setFlightId(e.target.value.toUpperCase())}
                placeholder="e.g. SP-804, AI-805"
                required
                className="w-full px-3.5 py-2.5 border border-[#DDDDE5] rounded-md font-mono text-sm uppercase font-semibold focus:outline-none focus:ring-2 focus:ring-[#0770E3]"
              />
            </div>

            {/* Departure Date input */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-[#111236] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#0770E3]" />
                Departure Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#DDDDE5] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0770E3]"
              />
            </div>

            {/* Departure Place input */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-[#111236] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#0770E3]" />
                Departure Place
              </label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                placeholder="DEL or New Delhi"
                className="w-full px-3.5 py-2.5 border border-[#DDDDE5] rounded-md text-sm uppercase font-semibold focus:outline-none focus:ring-2 focus:ring-[#0770E3]"
              />
            </div>

            <div className="sm:col-span-7 flex flex-wrap items-center justify-between gap-3 pt-1">
              {/* Quick Preset Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#68697F]">
                <span>Sample Flights:</span>
                {['SP-804', 'DW-205', 'AU-112', 'AI-805'].map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setFlightId(code)
                      setOrigin('DEL')
                      handleSearch(code, date, 'DEL')
                    }}
                    className="px-2 py-0.5 bg-gray-100 hover:bg-blue-50 hover:text-[#0770E3] rounded border border-gray-200 font-mono transition"
                  >
                    {code} (DEL)
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-[#0770E3] hover:bg-[#084EB2] text-white rounded-md text-xs font-bold shadow-xs transition flex items-center gap-1.5"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Track Flight
              </button>
            </div>
          </form>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-md text-xs text-[#D1435B] font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Live Flight Result Board */}
        {flight && (
          <div className="bg-white rounded-lg border border-[#DDDDE5] shadow-xs overflow-hidden space-y-0">
            {/* Top Status Header Banner */}
            <div
              className={`p-4 px-6 flex flex-wrap items-center justify-between gap-4 border-b ${
                isCancelled
                  ? 'bg-red-50 border-red-200'
                  : isDelayed
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base text-[#111236]">
                    {flight.airline || 'SkyPulse Air'}
                  </span>
                  <span className="font-mono font-bold text-xs bg-white/80 px-2.5 py-1 rounded border border-black/10 text-[#0770E3]">
                    {flight.flight_number || flight.flight_id}
                  </span>
                </div>
                <span className="text-xs text-[#68697F]">
                  • Date: <strong>{flight.viewed_date || flight.date || date}</strong>
                </span>
              </div>

              {/* Status Pill Badge */}
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                    isCancelled
                      ? 'bg-[#D1435B] text-white shadow-xs'
                      : isDelayed
                      ? 'bg-[#FF7110] text-white shadow-xs'
                      : 'bg-emerald-600 text-white shadow-xs'
                  }`}
                >
                  {isCancelled && <ShieldAlert className="w-3.5 h-3.5" />}
                  {isDelayed && <Clock className="w-3.5 h-3.5" />}
                  {isOnTime && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {isCancelled ? 'CANCELLED' : isDelayed ? `DELAYED (+${flight.delay_minutes || 45}m)` : 'ON TIME'}
                </span>
              </div>
            </div>

            {/* Delay Notice Banner if delayed by Admin */}
            {isDelayed && (
              <div className="bg-amber-500/10 border-b border-amber-200 p-4 px-6 flex items-start gap-3 text-xs text-amber-950">
                <Clock className="w-5 h-5 text-[#FF7110] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-extrabold text-sm text-[#FF7110]">
                    Flight Delay Notice (+{flight.delay_minutes} Minutes)
                  </div>
                  <p className="leading-relaxed">
                    {flight.disruption_note ||
                      `Departure has been rescheduled due to operational adjustments. New estimated departure is ${flight.estimated_departure_time}.`}
                  </p>
                  {Number(flight.delay_minutes) >= 120 && (
                    <div className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-300 rounded px-2.5 py-1 mt-1 inline-block">
                      ★ DGCA Passenger Charter Protection: Flights delayed &gt; 2 hours qualify for 100% full refund with zero cancellation fee.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Itinerary Route Visual */}
            <div className="p-6 border-b border-[#DDDDE5]">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-6 items-center">
                {/* Departure Box */}
                <div className="md:col-span-3 text-left space-y-1">
                  <div className="text-xs uppercase font-bold text-[#68697F] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#0770E3]" />
                    Departure Airport
                  </div>
                  <div className="text-3xl font-black text-[#111236]">
                    {flight.origin_code || flight.origin?.code || flight.origin || 'DEL'}
                  </div>
                  <div className="font-bold text-sm text-[#111236]">
                    {flight.origin_city || flight.origin?.city || 'New Delhi'}
                  </div>
                  <div className="text-xs text-[#68697F]">
                    Terminal: <strong>{flight.origin_terminal || flight.origin?.terminal || 'T3'}</strong>
                  </div>

                  <div className="pt-2">
                    <div className="text-xs text-[#68697F]">Scheduled Departure:</div>
                    <div className="text-xl font-mono font-bold text-[#111236]">
                      {flight.departure_time?.includes('T') ? flight.departure_time.split('T')[1].substring(0, 5) : flight.departure_time}
                    </div>
                    {isDelayed && flight.estimated_departure_time && (
                      <div className="text-xs font-mono font-extrabold text-[#FF7110] mt-0.5">
                        Estimated: {flight.estimated_departure_time} (+{flight.departure_delay_minutes || flight.delay_minutes}m)
                      </div>
                    )}
                  </div>
                </div>

                {/* Center Route Line */}
                <div className="md:col-span-1 flex flex-col items-center justify-center space-y-2">
                  <span className="text-xs text-[#68697F] font-semibold">{flight.duration || '2h 15m'}</span>
                  <div className="w-full relative flex items-center justify-center">
                    <div className="w-full h-[2px] bg-[#DDDDE5]"></div>
                    <div className="absolute bg-white px-2">
                      <Plane className="w-5 h-5 text-[#0770E3] rotate-90" />
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                    {flight.stops_text || 'Non-stop'}
                  </span>
                </div>

                {/* Arrival Box */}
                <div className="md:col-span-3 text-right space-y-1">
                  <div className="text-xs uppercase font-bold text-[#68697F] flex items-center justify-end gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    Arrival Airport
                  </div>
                  <div className="text-3xl font-black text-[#111236]">
                    {flight.destination_code || flight.destination?.code || flight.destination || 'BOM'}
                  </div>
                  <div className="font-bold text-sm text-[#111236]">
                    {flight.destination_city || flight.destination?.city || 'Mumbai'}
                  </div>
                  <div className="text-xs text-[#68697F]">
                    Terminal: <strong>{flight.destination_terminal || flight.destination?.terminal || 'T2'}</strong>
                  </div>

                  <div className="pt-2">
                    <div className="text-xs text-[#68697F]">Scheduled Arrival:</div>
                    <div className="text-xl font-mono font-bold text-[#111236]">
                      {flight.arrival_time?.includes('T') ? flight.arrival_time.split('T')[1].substring(0, 5) : flight.arrival_time}
                    </div>
                    {isDelayed && flight.estimated_arrival_time && (
                      <div className="text-xs font-mono font-extrabold text-[#FF7110] mt-0.5">
                        Estimated: {flight.estimated_arrival_time} (+{flight.arrival_delay_minutes || flight.delay_minutes}m)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Flight Specs & Policies Grid */}
            <div className="p-6 bg-gray-50/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border-b border-[#DDDDE5]">
              <div>
                <span className="text-[#68697F] block">Aircraft</span>
                <span className="font-bold text-[#111236]">{flight.aircraft || 'Airbus A320neo'}</span>
              </div>
              <div>
                <span className="text-[#68697F] block">Available Seats</span>
                <span className="font-bold text-emerald-600 font-mono">
                  {flight.seats_available || 45} / {flight.total_seats || 180}
                </span>
              </div>
              <div>
                <span className="text-[#68697F] block">Fare from</span>
                <span className="font-bold font-mono text-sm text-[#111236]">
                  ₹{Number(flight.price || 4999).toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[#68697F] block">Cancellation Policy</span>
                <span className="font-semibold text-emerald-700">
                  {flight.cancellation_policy || 'FREE_CANCELLATION'}
                </span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="p-4 px-6 bg-white flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-[#68697F]">
                Have a booking reference? Check refund or change your ticket in{' '}
                <Link to="/manage-booking" className="text-[#0770E3] font-bold hover:underline">
                  Find Bookings
                </Link>
                
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to="/"
                  className="px-4 py-2 border border-[#DDDDE5] rounded text-xs font-semibold text-[#111236] hover:bg-gray-50 transition"
                >
                  Search Flights
                </Link>
                <Link
                  to={`/?origin=${flight.origin_code || flight.origin || 'DEL'}&destination=${flight.destination_code || flight.destination || 'BOM'}&date=${flight.date || date}`}
                  className="px-5 py-2 bg-[#0770E3] hover:bg-[#084EB2] text-white rounded text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  Book Flight
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
