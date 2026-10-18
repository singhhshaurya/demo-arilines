import React, { Component } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import ConfirmationPage from './pages/ConfirmationPage'
import ManageBookingPage from './pages/ManageBookingPage'
import MyBookingsPage from './pages/MyBookingsPage'
import FlightStatusPage from './pages/FlightStatusPage'
import AdminPage from './pages/AdminPage'
import { Plane, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F1F2F8] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#DDDDE5] p-6 max-w-md w-full text-center space-y-4 shadow-sm">
            <AlertCircle className="w-12 h-12 text-[#D1435B] mx-auto" />
            <h2 className="text-lg font-bold text-[#111236]">Something went wrong</h2>
            <p className="text-xs text-[#68697F]">
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.href = '/'
              }}
              className="px-4 py-2 bg-[#0770E3] text-white text-xs font-semibold rounded hover:bg-[#084EB2]"
            >
              Return to Flight Search
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F1F2F8] text-[#111236]">
      <Navbar />

      <main className="flex-1">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/confirmation/:pnr" element={<ConfirmationPage />} />
            <Route path="/manage" element={<ManageBookingPage />} />
            <Route path="/manage-booking" element={<ManageBookingPage />} />
            <Route path="/my-bookings" element={<MyBookingsPage />} />
            <Route path="/flight-status" element={<FlightStatusPage />} />
            <Route path="/view-flight" element={<FlightStatusPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </ErrorBoundary>
      </main>

      <footer className="bg-[#05203C] text-gray-300 py-8 px-4 text-xs mt-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#0770E3] flex items-center justify-center text-white font-bold text-xs">
              <Plane className="w-3.5 h-3.5 -rotate-45" />
            </div>
            <span className="font-bold text-white text-sm">SkyPulse Airlines Demo Portal</span>
            <span className="text-[11px] text-gray-400">| TinyFish Crawler & Simulation Sandbox</span>
          </div>

          <div className="flex items-center gap-6 text-[11px]">
            <a
              href="http://localhost:9000/api/docs"
              target="_blank"
              rel="noreferrer"
              className="text-[#0770E3] hover:text-blue-300 flex items-center gap-1 font-semibold"
            >
              Swagger API Docs (/api/docs)
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-gray-500">•</span>
            <span>Razorpay Test Sandbox Enabled</span>
            <span className="text-gray-500">•</span>
            <span>Skyscanner UI Design Layout</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
