import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogOut, Calendar, User, Settings, PlusCircle } from 'lucide-react'

export default function Navbar() {
  const { user, logout, isAdmin, isOrganizer, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <Calendar className="h-7 w-7 text-blue-600" />
            <span className="font-bold text-xl text-gray-900">USV Events</span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/events" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
              Evenimente
            </Link>
            {isOrganizer && (
              <Link to="/events/create" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                Creare eveniment
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                Admin
              </Link>
            )}
          </div>

          {/* Auth buttons */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link to="/profile" className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {user?.full_name?.[0] || user?.email?.[0]}
                      </span>
                    </div>
                  )}
                  <span className="hidden md:block text-sm font-medium">
                    {user?.full_name || user?.email}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden md:block text-sm">Ieșire</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-blue-600 font-medium text-sm transition-colors"
                >
                  Autentificare
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Înregistrare
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}