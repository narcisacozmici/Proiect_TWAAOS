import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Calendar, MapPin, Users, Search, ChevronDown, ChevronUp, X } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'

function EventCard({ event }) {
  const modeLabels = { fizic: 'Fizic', online: 'Online', hibrid: 'Hibrid' }
  const modeColors = {
    fizic: 'bg-blue-100 text-blue-700',
    online: 'bg-purple-100 text-purple-700',
    hibrid: 'bg-orange-100 text-orange-700',
  }

  return (
    <Link to={`/events/${event.id}`} className="block group">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all duration-200">
        {event.banner_path ? (
          <img src={`http://localhost:8000${event.banner_path}`} alt={event.title} className="w-full h-44 object-cover" />
        ) : (
          <div className="w-full h-44 bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center">
            <Calendar className="h-14 w-14 text-white opacity-40" />
          </div>
        )}
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {event.category && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: event.category.color + '22', color: event.category.color }}>
                {event.category.name}
              </span>
            )}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${modeColors[event.participation_mode]}`}>
              {modeLabels[event.participation_mode]}
            </span>
            {event.is_free && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Gratuit</span>}
            {event.requires_registration && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Înscriere necesară</span>}
          </div>
          <h3 className="font-bold text-gray-900 text-base mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">{event.title}</h3>
          <div className="space-y-1.5 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{format(new Date(event.start_date), 'dd MMM yyyy, HH:mm', { locale: ro })}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
            {event.faculty && (
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate text-blue-600 font-medium">{event.faculty}</span>
              </div>
            )}
          </div>
          {event.avg_rating > 0 && (
            <div className="mt-3 flex items-center gap-1">
              <span className="text-yellow-400 text-sm">★</span>
              <span className="text-sm font-medium">{event.avg_rating.toFixed(1)}</span>
              <span className="text-xs text-gray-400">({event.rating_count})</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

const SORT_OPTIONS = [
  { value: 'start_date_asc', label: 'Dată (crescător)' },
  { value: 'start_date_desc', label: 'Dată (descrescător)' },
  { value: 'title_asc', label: 'Titlu (A-Z)' },
  { value: 'title_desc', label: 'Titlu (Z-A)' },
  { value: 'avg_rating_desc', label: 'Rating (cel mai bun)' },
]

export default function EventsPage() {
  const [events, setEvents] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Filtre de bază
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedMode, setSelectedMode] = useState('')

  // Filtre avansate
  const [faculty, setFaculty] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [isFree, setIsFree] = useState('')
  const [requiresReg, setRequiresReg] = useState('')
  const [hasQr, setHasQr] = useState('')
  const [sortValue, setSortValue] = useState('start_date_asc')

  const activeFiltersCount = [faculty, dateFrom, dateTo, isFree, requiresReg, hasQr]
    .filter(v => v !== '').length

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (selectedCategory) params.category_id = selectedCategory
      if (selectedMode) params.participation_mode = selectedMode
      if (faculty) params.faculty = faculty
      if (dateFrom) params.start_date_from = new Date(dateFrom).toISOString()
      if (dateTo) params.start_date_to = new Date(dateTo).toISOString()
      if (isFree !== '') params.is_free = isFree === 'true'
      if (requiresReg !== '') params.requires_registration = requiresReg === 'true'
      if (hasQr !== '') params.has_qr = hasQr === 'true'

      const parts = sortValue.split('_')
      const sortOrder = parts[parts.length - 1]
      const sortBy = parts.slice(0, -1).join('_')
      params.sort_by = sortBy
      params.sort_order = sortOrder

      const { data } = await api.get('/events/', { params })
      setEvents(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [search, selectedCategory, selectedMode, faculty, dateFrom, dateTo, isFree, requiresReg, hasQr, sortValue])

  useEffect(() => {
    api.get('/categories/').then(({ data }) => setCategories(data))
  }, [])

  useEffect(() => {
    const timer = setTimeout(fetchEvents, 300)
    return () => clearTimeout(timer)
  }, [fetchEvents])

  const resetFilters = () => {
    setSearch(''); setSelectedCategory(''); setSelectedMode('')
    setFaculty(''); setDateFrom(''); setDateTo('')
    setIsFree(''); setRequiresReg(''); setHasQr('')
    setSortValue('start_date_asc')
  }

  const selectClass = "border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Evenimente</h1>
        {events.length > 0 && (
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {events.length} {events.length === 1 ? 'eveniment' : 'evenimente'}
          </span>
        )}
      </div>

      {/* Filtru principal */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Caută după titlu, descriere, locație..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className={selectClass}>
            <option value="">Toate categoriile</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
          <select value={selectedMode} onChange={e => setSelectedMode(e.target.value)} className={selectClass}>
            <option value="">Toate modurile</option>
            <option value="fizic">Fizic</option>
            <option value="online">Online</option>
            <option value="hibrid">Hibrid</option>
          </select>
          <select value={sortValue} onChange={e => setSortValue(e.target.value)} className={selectClass}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Toggle filtre avansate */}
        <div className="flex items-center justify-between">
          <button onClick={() => setShowAdvanced(v => !v)}
            className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:text-blue-700">
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Filtre avansate
            {activeFiltersCount > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
          {(activeFiltersCount > 0 || search || selectedCategory || selectedMode) && (
            <button onClick={resetFilters} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <X className="h-3.5 w-3.5" /> Resetează filtrele
            </button>
          )}
        </div>

        {/* Filtre avansate */}
        {showAdvanced && (
          <div className="pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Facultate / Departament</label>
              <input type="text" placeholder="ex. FIESC, FSE..."
                value={faculty} onChange={e => setFaculty(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Dată de la</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Dată până la</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Acces</label>
              <select value={isFree} onChange={e => setIsFree(e.target.value)} className={`w-full ${selectClass}`}>
                <option value="">Toate</option>
                <option value="true">Intrare liberă</option>
                <option value="false">Cu plată</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Înscriere</label>
              <select value={requiresReg} onChange={e => setRequiresReg(e.target.value)} className={`w-full ${selectClass}`}>
                <option value="">Toate</option>
                <option value="true">Necesită înscriere</option>
                <option value="false">Fără înscriere</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Cod QR</label>
              <select value={hasQr} onChange={e => setHasQr(e.target.value)} className={`w-full ${selectClass}`}>
                <option value="">Toate</option>
                <option value="true">Are cod QR</option>
                <option value="false">Fără cod QR</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-3 text-gray-500">Se încarcă...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <Calendar className="h-14 w-14 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">Nu există evenimente</p>
          <p className="text-gray-400 text-sm mt-1">Încearcă să modifici filtrele</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map(event => <EventCard key={event.id} event={event} />)}
        </div>
      )}
    </div>
  )
}
