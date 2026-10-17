import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getUser, clearToken } from '../lib/auth'
import GoogleAuthButton from './GoogleAuthButton'
import { Plane, User, LogOut, ShieldAlert, BookOpen, Search } from 'lucide-react'

export default function Navbar() {
  const [user, setUser] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setUser(getUser())
  }, [location])

  const handleLoginSuccess = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    clearToken()
    setUser(null)
    setDropdownOpen(false)
    navigate('/')
  }

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true
    if (path !== '/' && location.pathname.startsWith(path)) return true
    return false
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#DDDDE5] h-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        {/* Left: Brand Logo & Navigation */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-[#0770E3] flex items-center justify-center text-white shadow-sm group-hover:bg-[#084EB2] transition">
              <Plane className="w-5 h-5 -rotate-45" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#0770E3] group-hover:text-[#084EB2] transition">
              SkyPulse
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-md transition ${
                isActive('/') && location.pathname === '/'
                  ? 'text-[#0770E3] bg-blue-50 font-semibold'
                  : 'text-[#68697F] hover:text-[#111236] hover:bg-gray-100'
              }`}
            >
              Flights
            </Link>
            <Link
              to="/manage"
              className={`px-3 py-1.5 rounded-md transition ${
                isActive('/manage')
                  ? 'text-[#0770E3] bg-blue-50 font-semibold'
                  : 'text-[#68697F] hover:text-[#111236] hover:bg-gray-100'
              }`}
            >
              Manage Booking
            </Link>
            <Link
              to="/my-bookings"
              className={`px-3 py-1.5 rounded-md transition ${
                isActive('/my-bookings')
                  ? 'text-[#0770E3] bg-blue-50 font-semibold'
                  : 'text-[#68697F] hover:text-[#111236] hover:bg-gray-100'
              }`}
            >
              My Bookings
            </Link>
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                  isActive('/admin')
                    ? 'text-amber-700 bg-amber-50 font-semibold'
                    : 'text-[#68697F] hover:text-amber-600 hover:bg-amber-50/50'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Admin Portal
              </Link>
            )}
          </nav>
        </div>

        {/* Right side: Auth & Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 p-1 rounded-full hover:bg-gray-100 transition focus:outline-none"
              >
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name || 'User'}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-[#0770E3]/20"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#0770E3]/10 text-[#0770E3] flex items-center justify-center font-semibold text-xs">
                    {(user.name || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:inline text-xs font-medium text-[#111236] max-w-[120px] truncate">
                  {user.name || user.email?.split('@')[0]}
                </span>
              </button>

              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-[#DDDDE5] py-1 text-sm z-50"
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-[#DDDDE5]">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-xs text-[#111236] truncate">{user.name || 'Traveler'}</p>
                      {user.role === 'admin' && (
                        <span className="text-[9px] font-bold uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#68697F] truncate">{user.email}</p>
                  </div>
                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-amber-700 hover:bg-amber-50 font-semibold"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      Admin Portal
                    </Link>
                  )}
                  <Link
                    to="/my-bookings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-[#111236] hover:bg-gray-50"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#68697F]" />
                    My Bookings
                  </Link>
                  <Link
                    to="/manage"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-[#111236] hover:bg-gray-50"
                  >
                    <Search className="w-3.5 h-3.5 text-[#68697F]" />
                    Manage by PNR
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-[#D1435B] hover:bg-red-50 text-left border-t border-[#DDDDE5]"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <GoogleAuthButton onLoginSuccess={handleLoginSuccess} />
          )}
        </div>
      </div>
    </header>
  )
}
