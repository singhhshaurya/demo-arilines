import React, { useState, useEffect } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { searchFlights } from '../lib/api'
import FlightCard from '../components/FlightCard'
import { Filter, ArrowUpDown, Shield, SlidersHorizontal, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react'

export default function SearchPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const origin = searchParams.get('origin') || ''
  const destination = searchParams.get('destination') || ''
  const date = searchParams.get('date') || ''
  const passengers = parseInt(searchParams.get('passengers') || '1', 10)
  const classType = searchParams.get('class') || 'economy'

  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterStops, setFilterStops] = useState('all') // 'all', 'direct', '1stop'
  const [filterPolicy, setFilterPolicy] = useState('all') // 'all', 'free', 'refundable'
  const [selectedAirlines, setSelectedAirlines] = useState([])
  const [maxPrice, setMaxPrice] = useState(15000)
  const [sortBy, setSortBy] = useState('cheapest') // 'cheapest', 'fastest'

  useEffect(() => {
    let isMounted = true
    const fetchResults = async () => {
      setLoading(true)
      try {
        const results = await searchFlights(origin, destination, date, passengers, classType)
        if (isMounted) {
          setFlights(results)
        }
      } catch (err) {
        console.error('Failed to load flights:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchResults()
    return () => {
      isMounted = false
    }
  }, [origin, destination, date, passengers, classType])

  const flightList = Array.isArray(flights) ? flights : []

  // Extract unique airlines from results
  const allAirlines = Array.from(new Set(flightList.map((f) => f?.airline))).filter(Boolean)

  const handleAirlineToggle = (airline) => {
    if (selectedAirlines.includes(airline)) {
      setSelectedAirlines(selectedAirlines.filter((a) => a !== airline))
    } else {
      setSelectedAirlines([...selectedAirlines, airline])
    }
  }

  // Filter & Sort Logic
  const filteredFlights = flightList
    .filter((f) => {
      if (!f) return false

      // Stops filter
      const stops = Number(f.stops || 0)
      if (filterStops === 'direct' && stops > 0) return false
      if (filterStops === '1stop' && stops === 0) return false

      // Policy filter
      const policyUpper = (f.cancellation_policy || f.policy?.policy_id || '').toUpperCase()
      if (filterPolicy === 'free' && !policyUpper.includes('FREE')) return false
      if (filterPolicy === 'refundable' && policyUpper.includes('NON_REFUNDABLE')) return false

      // Airline filter
      if (selectedAirlines.length > 0 && !selectedAirlines.includes(f.airline)) return false

      // Price filter
      const price = Number(f.price || 4999)
      if (price > maxPrice) return false

      return true
    })
    .sort((a, b) => {
      const priceA = Number(a?.price || 4999)
      const priceB = Number(b?.price || 4999)
      if (sortBy === 'cheapest') return priceA - priceB
      if (sortBy === 'fastest') return (Number(a?.duration_minutes) || 135) - (Number(b?.duration_minutes) || 135)
      return 0
    })

  return (
    <div className="min-h-screen bg-[#F1F2F8] py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Search Summary Bar (Skyscanner style) */}
        <div className="bg-white rounded-lg border border-[#DDDDE5] p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 rounded-md hover:bg-gray-100 text-[#68697F] hover:text-[#111236] transition"
              title="Change search"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 font-bold text-lg text-[#111236]">
                <span>{origin || 'All Origins'}</span>
                <span className="text-[#68697F] font-normal">→</span>
                <span>{destination || 'All Destinations'}</span>
              </div>
              <p className="text-xs text-[#68697F]">
                {date ? `${date} • ` : ''}{passengers} Passenger{passengers > 1 ? 's' : ''} •{' '}
                <span className="capitalize">{classType}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[#68697F] hidden sm:inline">
              Found <strong className="text-[#111236]">{filteredFlights.length}</strong> flights
            </span>
            <div className="flex items-center gap-2 bg-[#F1F2F8] p-1 rounded-md text-xs font-medium">
              <button
                onClick={() => setSortBy('cheapest')}
                className={`px-3 py-1.5 rounded transition ${
                  sortBy === 'cheapest' ? 'bg-[#0770E3] text-white shadow-xs' : 'text-[#68697F] hover:text-[#111236]'
                }`}
              >
                Cheapest
              </button>
              <button
                onClick={() => setSortBy('fastest')}
                className={`px-3 py-1.5 rounded transition ${
                  sortBy === 'fastest' ? 'bg-[#0770E3] text-white shadow-xs' : 'text-[#68697F] hover:text-[#111236]'
                }`}
              >
                Fastest
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Layout: Sidebar Filters + Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Sidebar Filters */}
          <aside className="lg:col-span-1 space-y-5 bg-white p-5 rounded-lg border border-[#DDDDE5] shadow-xs h-fit">
            <div className="flex items-center justify-between border-b border-[#DDDDE5] pb-3">
              <h3 className="font-bold text-sm text-[#111236] flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#0770E3]" />
                Filters
              </h3>
              {(filterStops !== 'all' || filterPolicy !== 'all' || selectedAirlines.length > 0) && (
                <button
                  onClick={() => {
                    setFilterStops('all')
                    setFilterPolicy('all')
                    setSelectedAirlines([])
                    setMaxPrice(15000)
                  }}
                  className="text-xs text-[#0770E3] hover:underline"
                >
                  Reset all
                </button>
              )}
            </div>

            {/* Cancellation Policy Filter (Key feature for demo!) */}
            <div className="space-y-2 border-b border-[#DDDDE5] pb-4">
              <label className="text-xs font-bold text-[#111236] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#00A698]" />
                Cancellation & Refund
              </label>
              <div className="space-y-1.5 text-xs text-[#111236]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="policy"
                    checked={filterPolicy === 'all'}
                    onChange={() => setFilterPolicy('all')}
                    className="accent-[#0770E3]"
                  />
                  <span>All policies</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="policy"
                    checked={filterPolicy === 'free'}
                    onChange={() => setFilterPolicy('free')}
                    className="accent-[#0770E3]"
                  />
                  <span className="text-[#00A698] font-medium">Free cancellation only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="policy"
                    checked={filterPolicy === 'refundable'}
                    onChange={() => setFilterPolicy('refundable')}
                    className="accent-[#0770E3]"
                  />
                  <span>Refundable tickets</span>
                </label>
              </div>
            </div>

            {/* Stops */}
            <div className="space-y-2 border-b border-[#DDDDE5] pb-4">
              <label className="text-xs font-bold text-[#111236]">Stops</label>
              <div className="space-y-1.5 text-xs text-[#111236]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="stops"
                    checked={filterStops === 'all'}
                    onChange={() => setFilterStops('all')}
                    className="accent-[#0770E3]"
                  />
                  <span>Any stops</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="stops"
                    checked={filterStops === 'direct'}
                    onChange={() => setFilterStops('direct')}
                    className="accent-[#0770E3]"
                  />
                  <span>Direct only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="stops"
                    checked={filterStops === '1stop'}
                    onChange={() => setFilterStops('1stop')}
                    className="accent-[#0770E3]"
                  />
                  <span>1 Stop</span>
                </label>
              </div>
            </div>

            {/* Airlines */}
            {allAirlines.length > 0 && (
              <div className="space-y-2 border-b border-[#DDDDE5] pb-4">
                <label className="text-xs font-bold text-[#111236]">Airlines</label>
                <div className="space-y-1.5 text-xs text-[#111236]">
                  {allAirlines.map((airline) => (
                    <label key={airline} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAirlines.includes(airline)}
                        onChange={() => handleAirlineToggle(airline)}
                        className="rounded accent-[#0770E3]"
                      />
                      <span>{airline}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Max Price Range */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-[#111236]">Max Price</label>
                <span className="font-mono text-[#0770E3] font-bold">₹{maxPrice.toLocaleString('en-IN')}</span>
              </div>
              <input
                type="range"
                min="3000"
                max="15000"
                step="500"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-[#0770E3]"
              />
            </div>
          </aside>

          {/* Right: Flight Results List */}
          <main className="lg:col-span-3 space-y-4">
            {loading ? (
              <div className="bg-white rounded-lg border border-[#DDDDE5] p-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-[#0770E3] animate-spin mx-auto" />
                <p className="text-sm font-medium text-[#111236]">Searching SkyPulse live flights...</p>
                <p className="text-xs text-[#68697F]">Retrieving up-to-date fares, seat counts & cancellation policies</p>
              </div>
            ) : filteredFlights.length === 0 ? (
              <div className="bg-white rounded-lg border border-[#DDDDE5] p-12 text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                <h4 className="text-base font-bold text-[#111236]">No flights match your filters</h4>
                <p className="text-xs text-[#68697F] max-w-sm mx-auto">
                  Try relaxing your price, airline, or policy filters to view available options.
                </p>
                <button
                  onClick={() => {
                    setFilterStops('all')
                    setFilterPolicy('all')
                    setSelectedAirlines([])
                    setMaxPrice(15000)
                  }}
                  className="px-4 py-2 bg-[#0770E3] text-white text-xs font-semibold rounded shadow-xs hover:bg-[#084EB2]"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredFlights.map((flight) => (
                  <FlightCard
                    key={flight._id || flight.id || flight.flight_number}
                    flight={flight}
                    onBook={(selected) => {
                      navigate(`/book/${selected._id || selected.id || selected.flight_number}`, {
                        state: { flight: selected, class: classType },
                      })
                    }}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
