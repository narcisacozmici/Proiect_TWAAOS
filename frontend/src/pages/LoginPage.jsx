import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      login(data.access_token, data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Eroare')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">USV Events</h1>
        <a href="http://localhost:8000/api/v1/auth/google/login"
          className="block text-center border border-gray-300 rounded-xl py-3 mb-6 hover:bg-gray-50">
          Continua cu Google
        </a>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            required placeholder="email@usv.ro"
            className="w-full border border-gray-300 rounded-xl px-4 py-3" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            required placeholder="Parola"
            className="w-full border border-gray-300 rounded-xl px-4 py-3" />
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold">
            {loading ? 'Se incarca...' : 'Autentificare'}
          </button>
        </form>
        <p className="text-center text-sm mt-4">
          <Link to="/register" className="text-blue-600">Inregistreaza-te</Link>
        </p>
      </div>
    </div>
  )
}
