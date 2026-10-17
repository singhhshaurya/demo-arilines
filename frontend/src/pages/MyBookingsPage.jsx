import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMyBookings } from '../lib/api'
import { getUser } from '../lib/auth'
import { Plane, Calendar, Clock, Ticket, ShieldCheck, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react'

export default function MyBookingsPage() {
  const user = getUser()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const data = await getMyBookings()
      setBookings(data)
    } catch (err) {
      console.error('Failed to load user bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  return (
    <div className="min-h-screen bg-[#F1F2F8] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-[#0770E3]">Dashboard</span>
            <h1 className="text-2xl font-extrabold text-[#111236]">My Flight Reservations</h1>
            <p className="text-xs text-[#68697F]">
              {user ? `Showing bookings for ${user.name} (${user.email})` : 'Showing current and cached demo bookings'}
            </p>
          </div>

          <Link
            to="/"
            className="px-4 py-2 bg-[#0770E3] hover:bg-[#084EB2] text-white text-xs font-semibold rounded-md shadow-xs transition inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plane className="w-4 h-4" />
            Book Another Flight
          </Link>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg border border-[#DDDDE5] p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#0770E3] animate-spin mx-auto" />
            <p className="text-xs font-medium text-[#111236]">Loading your flight bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-lg border border-[#DDDDE5] p-12 text-center space-y-3">
            <Ticket className="w-10 h-10 text-gray-300 mx-auto" />
            <h3 className="font-bold text-sm text-[#111236]">No Bookings Found</h3>
            <p className="text-xs text-[#68697F] max-w-sm mx-auto">
              You haven't made any flight bookings yet!
            </p>
            <Link
              to="/"
              className="inline-block mt-2 px-5 py-2 bg-[#0770E3] text-white text-xs font-semibold rounded hover:bg-[#084EB2]"
            >
              Search Flights
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const isCancelled = booking.status === 'CANCELLED'
              return (
                <div
                  key={booking.pnr || booking._id}
                  className="bg-white rounded-lg border border-[#DDDDE5] shadow-xs hover:shadow-md transition p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Flight Details */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-[#111236]">
                        {booking.airline || 'Air India'}
                      </span>
                      <span className="font-mono text-xs text-[#68697F] bg-gray-100 px-2 py-0.5 rounded">
                        {booking.flight_number}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isCancelled ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-semibold text-[#111236]">
                      <span>{typeof booking.origin === 'object' ? (booking.origin?.code || 'DEL') : (booking.origin || 'DEL')}</span>
                      <span className="text-[#68697F] font-normal">→</span>
                      <span>{typeof booking.destination === 'object' ? (booking.destination?.code || 'BOM') : (booking.destination || 'BOM')}</span>
                      <span className="text-[#68697F] font-normal font-mono text-[11px]">
                        ({booking.departure_time?.includes('T') ? booking.departure_time.split('T')[1].substring(0, 5) : (booking.departure_time || '08:00')} - {booking.arrival_time?.includes('T') ? booking.arrival_time.split('T')[1].substring(0, 5) : (booking.arrival_time || '10:15')})
                      </span>
                    </div>

                    <div className="text-[11px] text-[#68697F]">
                      Passenger: <strong className="text-[#111236]">{booking.passenger?.name || 'Traveler'}</strong> •
                      PNR: <strong className="font-mono text-[#0770E3]">{booking.pnr}</strong>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-[#DDDDE5]">
                    <div className="text-left md:text-right mr-2">
                      <span className="text-[11px] text-[#68697F] block">Total Fare</span>
                      <span className="text-base font-bold font-mono text-[#111236]">
                        ₹{Number(booking.total_paid || 4999).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <Link
                      to={`/confirmation/${booking.pnr}`}
                      className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-[#111236] rounded text-xs font-semibold transition"
                    >
                      View Ticket
                    </Link>

                    <Link
                      to={`/manage?pnr=${booking.pnr}`}
                      className="px-3.5 py-1.5 bg-[#0770E3] hover:bg-[#084EB2] text-white rounded text-xs font-semibold transition"
                    >
                      {isCancelled ? 'Refund Receipt' : 'Manage / Cancel'}
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
