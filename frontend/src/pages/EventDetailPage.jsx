import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import api from "../services/api"
import { useAuth } from "../context/AuthContext"
import { Calendar, MapPin, Users, Download, Building2, FileText } from "lucide-react"
import { format } from "date-fns"
import { ro } from "date-fns/locale"

export default function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated, isAdmin } = useAuth()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [feedbacks, setFeedbacks] = useState([])
  const [feedback, setFeedback] = useState({ rating: 5, comment: "", is_anonymous: false })
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState("info")
  const [registered, setRegistered] = useState(false)
  const [myRegistrations, setMyRegistrations] = useState([])
  const [exportingCsv, setExportingCsv] = useState(false)

  useEffect(() => {
    fetchEvent()
    fetchFeedbacks()
    if (isAuthenticated) fetchMyRegistrations()
  }, [id])

  const fetchEvent = async () => {
    try {
      const { data } = await api.get("/events/" + id)
      setEvent(data)
    } catch { navigate("/events") }
    finally { setLoading(false) }
  }

  const fetchFeedbacks = async () => {
    try {
      const { data } = await api.get("/feedback/event/" + id)
      setFeedbacks(data)
    } catch {}
  }

  const fetchMyRegistrations = async () => {
    try {
      const { data } = await api.get("/registrations/my")
      setMyRegistrations(data)
      if (data.some(r => r.event?.id === parseInt(id) && r.status !== "cancelled")) {
        setRegistered(true)
      }
    } catch {}
  }

  const showMessage = (msg, type = "info") => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(""), 4000)
  }

  const handleRegister = async () => {
    if (!isAuthenticated) { navigate("/login"); return }
    try {
      await api.post("/registrations/", { event_id: parseInt(id) })
      setRegistered(true)
      showMessage("Te-ai înscris cu succes!", "success")
    } catch (err) {
      showMessage(err.response?.data?.detail || "Eroare la înscriere", "error")
    }
  }

  const handleFeedback = async (e) => {
    e.preventDefault()
    try {
      await api.post("/feedback/event/" + id, feedback)
      showMessage("Feedback trimis cu succes!", "success")
      fetchFeedbacks()
    } catch (err) {
      showMessage(err.response?.data?.detail || "Eroare la trimiterea feedback-ului", "error")
    }
  }

  const handleApprove = async () => {
    await api.post("/events/" + id + "/approve")
    fetchEvent()
    showMessage("Evenimentul a fost aprobat.", "success")
  }

  const handleReject = async () => {
    await api.post("/events/" + id + "/reject")
    fetchEvent()
    showMessage("Evenimentul a fost respins.", "error")
  }

  const handleDelete = async () => {
    if (!window.confirm("Ești sigur că vrei să ștergi evenimentul?")) return
    await api.delete("/events/" + id)
    navigate("/events")
  }

  // Adaugă în Google Calendar
  const addToGoogleCalendar = () => {
    if (!event) return
    const start = new Date(event.start_date).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    const end = new Date(event.end_date).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    const url = "https://calendar.google.com/calendar/render?action=TEMPLATE"
      + "&text=" + encodeURIComponent(event.title)
      + "&dates=" + start + "/" + end
      + "&details=" + encodeURIComponent(event.description || "")
      + "&location=" + encodeURIComponent(event.location || "")
    window.open(url, "_blank")
  }

  // Export .ics
  const exportIcs = async () => {
    try {
      const response = await api.get(`/events/${id}/export-ics`, { responseType: "blob" })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const a = document.createElement("a")
      a.href = url
      a.download = `eveniment_${id}.ics`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      showMessage("Eroare la exportul fișierului .ics", "error")
    }
  }

  // Export CSV participanți (organizator/admin)
  const exportParticipantsCsv = async () => {
    setExportingCsv(true)
    try {
      const response = await api.get(`/reports/events/${id}/participants/export`, { responseType: "blob" })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const a = document.createElement("a")
      a.href = url
      a.download = `participanti_eveniment_${id}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      showMessage("Eroare la exportul CSV", "error")
    } finally {
      setExportingCsv(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
    </div>
  )
  if (!event) return null

  const canEdit = isAdmin || (user && event.organizer?.id === user.id)
  const statusColors = {
    published: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    cancelled: "bg-red-100 text-red-700",
    finished: "bg-gray-100 text-gray-700",
  }
  const statusLabels = {
    published: "Publicat", pending: "În așteptare",
    cancelled: "Respins", finished: "Încheiat",
  }
  const messageColors = {
    success: "bg-green-50 border-green-200 text-green-700",
    error: "bg-red-50 border-red-200 text-red-700",
    info: "bg-blue-50 border-blue-200 text-blue-700",
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Banner */}
      {event.banner_path ? (
        <img src={`http://localhost:8000${event.banner_path}`} alt={event.title}
          className="w-full h-52 object-cover rounded-2xl mb-6" />
      ) : (
        <div className="w-full h-52 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl mb-6 flex items-center justify-center">
          <Calendar className="h-16 w-16 text-white opacity-40" />
        </div>
      )}

      {/* Titlu + acțiuni admin */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[event.status]}`}>
              {statusLabels[event.status]}
            </span>
            {event.category && (
              <span className="text-xs font-medium px-2 py-1 rounded-full"
                style={{ backgroundColor: event.category.color + "22", color: event.category.color }}>
                {event.category.name}
              </span>
            )}
            {event.is_free && <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">Gratuit</span>}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
        </div>
        {canEdit && (
          <div className="flex gap-2 flex-wrap">
            {isAdmin && event.status === "pending" && (
              <>
                <button onClick={handleApprove} className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700">Aprobă</button>
                <button onClick={handleReject} className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-700">Respinge</button>
              </>
            )}
            <button onClick={handleDelete} className="bg-red-100 text-red-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-200">Șterge</button>
          </div>
        )}
      </div>

      {/* Mesaj feedback */}
      {message && (
        <div className={`border rounded-xl px-4 py-3 mb-5 text-sm font-medium ${messageColors[messageType]}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coloana stângă */}
        <div className="lg:col-span-2 space-y-5">
          {event.description && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold mb-3">Descriere</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{event.description}</p>
            </div>
          )}

          {/* Materiale */}
          {event.materials && event.materials.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold mb-3">Materiale ({event.materials.length})</h2>
              <div className="space-y-2">
                {event.materials.map(mat => (
                  <a key={mat.id} href={`http://localhost:8000${mat.file_path}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors">
                    <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{mat.filename}</p>
                      {mat.file_size && <p className="text-xs text-gray-400">{(mat.file_size / 1024).toFixed(1)} KB</p>}
                    </div>
                    <Download className="h-4 w-4 text-gray-400" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Export participanți (organizator/admin) */}
          {canEdit && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold mb-3">Management participanți</h2>
              <button onClick={exportParticipantsCsv} disabled={exportingCsv}
                className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-60">
                <Download className="h-4 w-4" />
                {exportingCsv ? "Se exportă..." : "Export CSV participanți"}
              </button>
              <p className="text-xs text-gray-400 mt-2">Descarcă lista completă cu participanți, status și check-in.</p>
            </div>
          )}

          {/* Feedback */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold mb-4">
              Feedback
              {feedbacks.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({feedbacks.length} {feedbacks.length === 1 ? "recenzie" : "recenzii"})
                </span>
              )}
            </h2>
            {isAuthenticated ? (
              <form onSubmit={handleFeedback} className="mb-6 pb-6 border-b border-gray-100">
                <p className="text-sm text-gray-500 mb-2">Rating:</p>
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} type="button"
                      onClick={() => setFeedback({ ...feedback, rating: star })}
                      className={`text-2xl transition-transform hover:scale-110 ${star <= feedback.rating ? "text-yellow-400" : "text-gray-200"}`}>
                      ★
                    </button>
                  ))}
                </div>
                <textarea value={feedback.comment}
                  onChange={e => setFeedback({ ...feedback, comment: e.target.value })}
                  placeholder="Comentariu opțional..."
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3} />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={feedback.is_anonymous}
                      onChange={e => setFeedback({ ...feedback, is_anonymous: e.target.checked })}
                      className="rounded" />
                    Anonim
                  </label>
                  <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-blue-700">
                    Trimite feedback
                  </button>
                </div>
              </form>
            ) : (
              <div className="mb-4 text-sm text-gray-500 bg-gray-50 rounded-xl p-3">
                <Link to="/login" className="text-blue-600 font-medium hover:underline">Autentifică-te</Link> pentru a lăsa feedback.
              </div>
            )}
            <div className="space-y-4">
              {feedbacks.map(fb => (
                <div key={fb.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 text-sm font-semibold">
                      {fb.is_anonymous ? "?" : (fb.user?.full_name?.[0] || "?")}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{fb.is_anonymous ? "Anonim" : (fb.user?.full_name || "Utilizator")}</span>
                      <span className="text-yellow-400 text-sm">{"★".repeat(Math.round(fb.rating))}<span className="text-gray-200">{"★".repeat(5 - Math.round(fb.rating))}</span></span>
                    </div>
                    {fb.comment && <p className="text-gray-600 text-sm mt-0.5">{fb.comment}</p>}
                  </div>
                </div>
              ))}
              {feedbacks.length === 0 && <p className="text-gray-400 text-sm">Nu există feedback încă. Fii primul!</p>}
            </div>
          </div>
        </div>

        {/* Coloana dreaptă */}
        <div className="space-y-4">
          {/* Detalii eveniment */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Data și ora</p>
                <p className="text-sm font-medium">
                  {format(new Date(event.start_date), "dd MMMM yyyy", { locale: ro })}
                </p>
                <p className="text-sm text-gray-600">
                  {format(new Date(event.start_date), "HH:mm", { locale: ro })}
                  {" — "}
                  {format(new Date(event.end_date), "HH:mm", { locale: ro })}
                </p>
              </div>
            </div>
            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Locație</p>
                  <p className="text-sm font-medium">{event.location}</p>
                </div>
              </div>
            )}
            {event.faculty && (
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Facultate / Departament</p>
                  <p className="text-sm font-medium">{event.faculty}</p>
                </div>
              </div>
            )}
            {event.organizer && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Organizator</p>
                  <p className="text-sm font-medium">{event.organizer.full_name || event.organizer.email}</p>
                </div>
              </div>
            )}
            {event.max_participants && (
              <div className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2">
                Locuri disponibile: <span className="font-medium">{event.max_participants}</span>
              </div>
            )}
            {event.registration_deadline && (
              <div className="text-sm text-orange-600 bg-orange-50 rounded-xl px-3 py-2">
                Deadline înscriere: <span className="font-medium">
                  {format(new Date(event.registration_deadline), "dd MMM yyyy, HH:mm", { locale: ro })}
                </span>
              </div>
            )}
            {event.avg_rating > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <span className="text-yellow-400">★</span>
                <span className="font-medium">{event.avg_rating.toFixed(1)}</span>
                <span className="text-gray-400">({event.rating_count} recenzii)</span>
              </div>
            )}
          </div>

          {/* Cod QR */}
          {event.qr_code_path && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
              <h3 className="font-semibold text-sm mb-3 text-gray-700">Cod QR eveniment</h3>
              <img src={`http://localhost:8000${event.qr_code_path}`} alt="QR Code" className="w-36 h-36 mx-auto rounded-xl" />
            </div>
          )}

          {/* Acțiuni calendar + înscriere */}
          <div className="space-y-2">
            <button onClick={addToGoogleCalendar}
              className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-xl py-2.5 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors">
              <Calendar className="h-4 w-4" />
              Adaugă în Google Calendar
            </button>
            <button onClick={exportIcs}
              className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-xl py-2.5 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors">
              <Download className="h-4 w-4" />
              Export .ics (Outlook, Apple Calendar)
            </button>
            {event.requires_registration && event.status === "published" && !registered && (
              <button onClick={handleRegister}
                className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 transition-colors">
                Înscrie-te la eveniment
              </button>
            )}
            {registered && (
              <div className="w-full bg-green-50 border border-green-200 text-green-700 rounded-xl py-3 text-center text-sm font-medium">
                ✓ Ești înscris la acest eveniment
              </div>
            )}
            {event.registration_link && (
              <a href={event.registration_link} target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors">
                Link extern de înscriere
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
