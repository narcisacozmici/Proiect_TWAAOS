import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function CreateEventPage() {
  const navigate = useNavigate()
  const { isOrganizer } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    faculty: '',
    participation_mode: 'fizic',
    start_date: '',
    end_date: '',
    category_id: '',
    registration_link: '',
    max_participants: '',
    requires_registration: false,
    is_free: true,
  })

  useEffect(() => {
    api.get('/categories/').then(({ data }) => setCategories(data))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        ...form,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        max_participants: form.max_participants ? parseInt(form.max_participants) : null,
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
      }
      const { data } = await api.post('/events/', payload)
      navigate(`/events/${data.id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Eroare la creare')
    } finally {
      setLoading(false)
    }
  }

  if (!isOrganizer) return (
    <div className="text-center py-12 text-gray-500">Nu ai permisiuni pentru aceasta pagina.</div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Creare eveniment</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Titlu *</label>
          <input type="text" required value={form.title}
            onChange={e => setForm({...form, title: e.target.value})}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Titlul evenimentului" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descriere</label>
          <textarea value={form.description}
            onChange={e => setForm({...form, description: e.target.value})}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4} placeholder="Descrierea evenimentului" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data start *</label>
            <input type="datetime-local" required value={form.start_date}
              onChange={e => setForm({...form, start_date: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data sfarsit *</label>
            <input type="datetime-local" required value={form.end_date}
              onChange={e => setForm({...form, end_date: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Locatie</label>
          <input type="text" value={form.location}
            onChange={e => setForm({...form, location: e.target.value})}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Aula USV, Online - Zoom" />
        </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Facultate / Departament</label>
            <input type="text" value={form.faculty}
              onChange={e => setForm({...form, faculty: e.target.value})}
              placeholder="ex. FIESC, FSE, Departamentul de Informatică..."
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mod participare</label>
            <select value={form.participation_mode}
              onChange={e => setForm({...form, participation_mode: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="fizic">Fizic</option>
              <option value="online">Online</option>
              <option value="hibrid">Hibrid</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categorie</label>
            <select value={form.category_id}
              onChange={e => setForm({...form, category_id: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Fara categorie</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Link inscriere extern</label>
          <input type="url" value={form.registration_link}
            onChange={e => setForm({...form, registration_link: e.target.value})}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://..." />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Numar maxim participanti</label>
          <input type="number" value={form.max_participants}
            onChange={e => setForm({...form, max_participants: e.target.value})}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Lasati gol pentru nelimitat" min="1" />
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_free}
              onChange={e => setForm({...form, is_free: e.target.checked})}
              className="w-4 h-4 rounded text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Intrare libera</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.requires_registration}
              onChange={e => setForm({...form, requires_registration: e.target.checked})}
              className="w-4 h-4 rounded text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Necesita inscriere</span>
          </label>
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {loading ? 'Se creeaza...' : 'Creeaza evenimentul'}
        </button>
      </form>
    </div>
  )
}