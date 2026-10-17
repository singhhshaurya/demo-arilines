import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plane, Calendar, Users, ArrowRightLeft, Search, Hotel, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react'

const POPULAR_AIRPORTS = [
  { code: 'DEL', city: 'New Delhi', name: 'Indira Gandhi International', country: 'India' },
  { code: 'BOM', city: 'Mumbai', name: 'Chhatrapati Shivaji Maharaj International', country: 'India' },
  { code: 'BLR', city: 'Bangalore', name: 'Kempegowda International', country: 'India' },
  { code: 'GOI', city: 'Goa', name: 'Manohar International', country: 'India' },
  { code: 'HYD', city: 'Hyderabad', name: 'Rajiv Gandhi International', country: 'India' },
  { code: 'CCU', city: 'Kolkata', name: 'Netaji Subhas Chandra Bose International', country: 'India' },
]

const POPULAR_ROUTES = [
  {
    origin: 'DEL',
    originCity: 'New Delhi',
    destination: 'BOM',
    destinationCity: 'Mumbai',
    avgPrice: 4200,
    image: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=400&q=80',
    airline: 'Air India / IndiGo',
  },
  {
    origin: 'BOM',
    originCity: 'Mumbai',
    destination: 'GOI',
    destinationCity: 'Goa',
    avgPrice: 3100,
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400&q=80',
    airline: 'SpiceJet / Akasa',
  },
  {
    origin: 'DEL',
    originCity: 'New Delhi',
    destination: 'BLR',
    destinationCity: 'Bangalore',
    avgPrice: 5400,
    image: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=400&q=80',
    airline: 'Vistara / IndiGo',
  },
  {
    origin: 'BOM',
    originCity: 'Mumbai',
    destination: 'DEL',
    destinationCity: 'New Delhi',
    avgPrice: 4350,
    image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&q=80',
    airline: 'Air India / Vistara',
  },
]

export default function HomePage() {
  const navigate = useNavigate()

  const [origin, setOrigin] = useState('DEL')
  const [destination, setDestination] = useState('BOM')
  const [date, setDate] = useState('2026-11-15')
  const [passengers, setPassengers] = useState(1)
  const [classType, setClassType] = useState('economy')

  const [fromDropdownOpen, setFromDropdownOpen] = useState(false)
  const [toDropdownOpen, setToDropdownOpen] = useState(false)

  const fromRef = useRef(null)
  const toRef = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (fromRef.current && !fromRef.current.contains(event.target)) {
        setFromDropdownOpen(false)
      }
      if (toRef.current && !toRef.current.contains(event.target)) {
        setToDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSwapAirports = () => {
    const temp = origin
    setOrigin(destination)
    setDestination(temp)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    navigate(
      `/search?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(
        destination
      )}&date=${encodeURIComponent(date)}&passengers=${passengers}&class=${encodeURIComponent(
        classType
      )}`
    )
  }

  const handleRouteClick = (route) => {
    setOrigin(route.origin)
    setDestination(route.destination)
    navigate(
      `/search?origin=${route.origin}&destination=${route.destination}&date=${date}&passengers=1&class=economy`
    )
  }

  return (
    <div className="min-h-screen bg-[#F1F2F8] flex flex-col justify-between">
      <div>

        {/* Hero Section */}
        <section className="relative bg-gradient-to-r from-[#0770E3] to-[#043A8A] text-white pt-12 pb-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center mb-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-medium tracking-wide backdrop-blur-xs mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Smart Travel Booking Engine
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-3">
              Millions of cheap flights. One simple search.
            </h1>
            <p className="text-base sm:text-lg text-blue-100 max-w-2xl mx-auto">
              Compare prices from 100+ airlines with instant refundable protection.
            </p>
          </div>

          {/* Search Widget Container */}
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-xl shadow-xl p-5 sm:p-6 text-[#111236] border border-[#DDDDE5]">
              {/* Category Tabs */}
              <div className="flex items-center gap-4 mb-5 border-b border-[#DDDDE5] pb-3 text-sm font-semibold">
                <button
                  type="button"
                  className="flex items-center gap-2 text-[#0770E3] pb-2 border-b-2 border-[#0770E3] font-bold"
                >
                  <Plane className="w-4 h-4 -rotate-45" />
                  Flights
                </button>
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-2 text-gray-400 cursor-not-allowed pb-2"
                  title="Hotels search coming soon"
                >
                  <Hotel className="w-4 h-4" />
                  Hotels (Soon)
                </button>
              </div>

              {/* Flight Search Form */}
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* From Airport */}
                  <div className="md:col-span-3 relative" ref={fromRef}>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68697F] mb-1">
                      From
                    </label>
                    <div
                      onClick={() => setFromDropdownOpen(true)}
                      className="border border-[#DDDDE5] rounded p-2.5 bg-gray-50/50 hover:bg-white cursor-pointer transition focus-within:ring-2 focus-within:ring-[#0770E3]"
                    >
                      <div className="text-lg font-bold text-[#111236] leading-none">
                        {origin}
                      </div>
                      <div className="text-xs text-[#68697F] truncate">
                        {POPULAR_AIRPORTS.find((a) => a.code === origin)?.city || 'Select Origin'}
                      </div>
                    </div>

                    {/* From Dropdown */}
                    {fromDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-xl border border-[#DDDDE5] py-2 z-50">
                        <div className="px-3 py-1 text-[11px] font-bold text-[#68697F] uppercase tracking-wider">
                          Popular Airports
                        </div>
                        {POPULAR_AIRPORTS.map((airport) => (
                          <div
                            key={airport.code}
                            onClick={() => {
                              setOrigin(airport.code)
                              setFromDropdownOpen(false)
                            }}
                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition"
                          >
                            <div>
                              <div className="font-semibold text-xs text-[#111236]">
                                {airport.city} ({airport.code})
                              </div>
                              <div className="text-[10px] text-[#68697F] truncate max-w-[180px]">
                                {airport.name}
                              </div>
                            </div>
                            <span className="font-mono text-xs font-bold text-[#0770E3]">
                              {airport.code}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Swap Button */}
                  <div className="md:col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={handleSwapAirports}
                      className="w-9 h-9 rounded-full border border-[#DDDDE5] bg-white hover:bg-gray-100 flex items-center justify-center text-[#0770E3] hover:rotate-180 transition-all shadow-xs"
                      title="Swap origins"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>
                  </div>

                  {/* To Airport */}
                  <div className="md:col-span-3 relative" ref={toRef}>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68697F] mb-1">
                      To
                    </label>
                    <div
                      onClick={() => setToDropdownOpen(true)}
                      className="border border-[#DDDDE5] rounded p-2.5 bg-gray-50/50 hover:bg-white cursor-pointer transition focus-within:ring-2 focus-within:ring-[#0770E3]"
                    >
                      <div className="text-lg font-bold text-[#111236] leading-none">
                        {destination}
                      </div>
                      <div className="text-xs text-[#68697F] truncate">
                        {POPULAR_AIRPORTS.find((a) => a.code === destination)?.city || 'Select Destination'}
                      </div>
                    </div>

                    {/* To Dropdown */}
                    {toDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-xl border border-[#DDDDE5] py-2 z-50">
                        <div className="px-3 py-1 text-[11px] font-bold text-[#68697F] uppercase tracking-wider">
                          Popular Airports
                        </div>
                        {POPULAR_AIRPORTS.map((airport) => (
                          <div
                            key={airport.code}
                            onClick={() => {
                              setDestination(airport.code)
                              setToDropdownOpen(false)
                            }}
                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition"
                          >
                            <div>
                              <div className="font-semibold text-xs text-[#111236]">
                                {airport.city} ({airport.code})
                              </div>
                              <div className="text-[10px] text-[#68697F] truncate max-w-[180px]">
                                {airport.name}
                              </div>
                            </div>
                            <span className="font-mono text-xs font-bold text-[#0770E3]">
                              {airport.code}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Date Picker */}
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68697F] mb-1">
                      Departure Date
                    </label>
                    <div className="border border-[#DDDDE5] rounded p-2 bg-gray-50/50 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#0770E3]" />
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full text-xs font-medium text-[#111236] bg-transparent border-none p-0 focus:ring-0"
                      />
                    </div>
                  </div>

                  {/* Passengers & Class */}
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#68697F] mb-1">
                      Cabin & Guests
                    </label>
                    <div className="border border-[#DDDDE5] rounded p-2 bg-gray-50/50 flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <select
                          value={passengers}
                          onChange={(e) => setPassengers(Number(e.target.value))}
                          className="text-xs font-semibold text-[#111236] bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                            <option key={n} value={n}>
                              {n} {n === 1 ? 'Adult' : 'Adults'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <select
                        value={classType}
                        onChange={(e) => setClassType(e.target.value)}
                        className="text-[11px] text-[#68697F] bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                      >
                        <option value="economy">Economy</option>
                        <option value="premium">Prem. Economy</option>
                        <option value="business">Business</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Submit Row */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="w-full md:w-auto px-8 py-3 bg-[#0770E3] hover:bg-[#084EB2] text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-2 transition active:scale-[0.98]"
                  >
                    <Search className="w-5 h-5" />
                    Search Flights
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* Popular Routes Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#111236]">
                Popular Flight Deals
              </h2>
              <p className="text-xs sm:text-sm text-[#68697F]">
                Trending routes booked by travelers this week
              </p>
            </div>
            <span className="text-xs font-semibold text-[#0770E3] cursor-pointer hover:underline">
              View all routes →
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {POPULAR_ROUTES.map((route, idx) => (
              <div
                key={idx}
                onClick={() => handleRouteClick(route)}
                className="bg-white rounded-lg border border-[#DDDDE5] shadow-xs hover:shadow-lg transition-all cursor-pointer overflow-hidden group flex flex-col justify-between"
              >
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={route.image}
                    alt={`${route.originCity} to ${route.destinationCity}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 text-white">
                    <span className="text-xs font-medium text-blue-200">
                      {route.originCity} →
                    </span>
                    <h3 className="text-lg font-bold leading-tight">
                      {route.destinationCity}
                    </h3>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[#68697F] block">Direct flights from</span>
                    <span className="text-lg font-extrabold text-[#111236]">
                      ₹{route.avgPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <span className="px-3 py-1 bg-blue-50 text-[#0770E3] rounded-full text-xs font-semibold group-hover:bg-[#0770E3] group-hover:text-white transition">
                    Book
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits & Trust Strip */}
        <section className="bg-white border-y border-[#DDDDE5] py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#0770E3] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#111236]">Guaranteed Instant Refund</h4>
                <p className="text-xs text-[#68697F] mt-0.5">
                  Full automatic refund preview and one-click cancellation tracking.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-50 text-[#00A698] flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#111236]">Real-time Airline Updates</h4>
                <p className="text-xs text-[#68697F] mt-0.5">
                  Synchronized schedule changes, delay warnings, and gate updates.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-[#FF7110] flex items-center justify-center shrink-0">
                <Plane className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#111236]">Simulated Agent Ready</h4>
                <p className="text-xs text-[#68697F] mt-0.5">
                  Engineered specifically for testing autonomous AI booking agents.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-[#DDDDE5] py-6 text-center text-xs text-[#68697F]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-[#0770E3] -rotate-45" />
            <span className="font-bold text-[#111236]">SkyPulse Demo</span>
            <span>© 2026 Skyscanner-inspired demo experience.</span>
          </div>
          <div className="flex gap-4">
            <span className="hover:underline cursor-pointer">Privacy Notice</span>
            <span className="hover:underline cursor-pointer">Terms of Service</span>
            <span className="hover:underline cursor-pointer">Cookie Policy</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
