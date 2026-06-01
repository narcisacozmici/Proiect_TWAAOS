import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { useEffect } from "react"
import Navbar from "./components/Navbar"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import EventsPage from "./pages/EventsPage"
import EventDetailPage from "./pages/EventDetailPage"
import CreateEventPage from "./pages/CreateEventPage"
import AdminPage from "./pages/AdminPage"

const queryClient = new QueryClient()

function GoogleCallback() {
  const { login } = useAuth()
  const navigate = useNavigate()
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get("token")
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]))
        const userData = {
          id: parseInt(payload.sub),
          role: payload.role,
          email: payload.email || "",
          full_name: payload.full_name || "",
        }
        login(token, userData)
        navigate("/")
      } catch(e) {
        navigate("/login")
      }
    } else {
      navigate("/login")
    }
  }, [])
  return (
    <div className="flex justify-center items-center h-screen">
      <p className="text-gray-600">Se autentifica...</p>
    </div>
  )
}

function ProtectedRoute({ children, requireOrganizer, requireAdmin }) {
  const { isAuthenticated, isOrganizer, isAdmin, loading } = useAuth()
  if (loading) return <div className="flex justify-center items-center h-screen">Se incarca...</div>
  if (!isAuthenticated) return <Navigate to="/login" />
  if (requireAdmin && !isAdmin) return <Navigate to="/" />
  if (requireOrganizer && !isOrganizer) return <Navigate to="/" />
  return children
}

function HomePage() {
  const { user, isAuthenticated } = useAuth()
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Bun venit la USV Events!</h1>
        <p className="text-xl text-gray-500 mb-8">Platforma centralizata pentru evenimente universitare</p>
        {isAuthenticated ? (
          <p className="text-lg text-blue-600 font-medium">Salut, {user?.full_name || user?.email}!</p>
        ) : (
          <div className="flex justify-center gap-4">
            <a href="/login" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700">Autentificare</a>
            <a href="/events" className="border border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50">Vezi evenimente</a>
          </div>
        )}
      </div>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/auth/callback" element={<GoogleCallback />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/events/create" element={<ProtectedRoute requireOrganizer><CreateEventPage /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App