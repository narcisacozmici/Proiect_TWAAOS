import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import api from "../services/api"
import { useAuth } from "../context/AuthContext"
import { Users, Calendar, CheckCircle, XCircle, BarChart2, TrendingUp, Download } from "lucide-react"

export default function AdminPage() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState("events")
  const [events, setEvents] = useState([])
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, published: 0, users: 0 })
  const [reports, setReports] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reportsLoading, setReportsLoading] = useState(false)

  useEffect(() => {
    if (!isAdmin) { navigate("/"); return }
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
          const [evRes, usRes] = await Promise.all([
            api.get("/events/", { params: { status: "pending", limit: 100 } }),
            api.get("/users/"),
          ])
          setEvents(evRes.data)
          setUsers(usRes.data)
          setStats({
            total: usRes.data.length,
            pending: evRes.data.length,
            published: 0,
            users: usRes.data.length
          })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchReports = async () => {
    if (reports) return
    setReportsLoading(true)
    try {
      const { data } = await api.get("/reports/stats")
      setReports(data)
    } catch (err) {
      console.error(err)
    } finally {
      setReportsLoading(false)
    }
  }

  const handleTabChange = (t) => {
    setTab(t)
    if (t === "reports") fetchReports()
  }

  const handleApprove = async (id) => { await api.post("/events/" + id + "/approve"); fetchData() }
  const handleReject = async (id) => { await api.post("/events/" + id + "/reject"); fetchData() }
  const handleToggleUser = async (id) => { await api.put("/users/" + id + "/toggle-active"); fetchData() }
  const handleChangeRole = async (id, role) => { await api.put("/users/" + id + "/role", null, { params: { role } }); fetchData() }

  if (!isAdmin) return null

  const tabClass = (t) => "px-5 py-2 rounded-xl font-medium text-sm transition-colors " +
    (tab === t ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50")

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Panou Administrator</h1>

      {/* Statistici generale */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total evenimente", value: stats.total, color: "text-blue-600" },
          { label: "În așteptare", value: stats.pending, color: "text-yellow-500" },
          { label: "Publicate", value: stats.published, color: "text-green-600" },
          { label: "Utilizatori", value: stats.users, color: "text-purple-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => handleTabChange("events")} className={tabClass("events")}>
          <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />Evenimente în așteptare {stats.pending > 0 && <span className="bg-yellow-500 text-white text-xs rounded-full px-1.5">{stats.pending}</span>}</span>
        </button>
        <button onClick={() => handleTabChange("users")} className={tabClass("users")}>
          <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />Utilizatori</span>
        </button>
        <button onClick={() => handleTabChange("reports")} className={tabClass("reports")}>
          <span className="flex items-center gap-1.5"><BarChart2 className="h-4 w-4" />Rapoarte</span>
        </button>
      </div>

      {loading && tab !== "reports" ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      ) : tab === "events" ? (
        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-500">Nu există evenimente în așteptare</p>
            </div>
          ) : events.map(event => (
            <div key={event.id} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-1 rounded-full">În așteptare</span>
                    {event.category && (
                      <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">{event.category.name}</span>
                    )}
                    {event.faculty && (
                      <span className="bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-1 rounded-full">{event.faculty}</span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">{event.title}</h3>
                  <p className="text-sm text-gray-500 mb-0.5">Organizator: {event.organizer?.full_name || event.organizer?.email}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(event.start_date).toLocaleDateString("ro-RO")}
                    {event.location ? " · " + event.location : ""}
                  </p>
                  {event.description && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{event.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(event.id)}
                    className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700">
                    <CheckCircle className="h-4 w-4" /> Aprobă
                  </button>
                  <button onClick={() => handleReject(event.id)}
                    className="flex items-center gap-1 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-700">
                    <XCircle className="h-4 w-4" /> Respinge
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : tab === "users" ? (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-sm font-medium text-gray-500 px-6 py-3">Utilizator</th>
                <th className="text-left text-sm font-medium text-gray-500 px-6 py-3">Rol</th>
                <th className="text-left text-sm font-medium text-gray-500 px-6 py-3">Status</th>
                <th className="text-left text-sm font-medium text-gray-500 px-6 py-3">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 text-sm font-semibold">{u.full_name?.[0] || u.email?.[0]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{u.full_name || "—"}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select value={u.role} onChange={e => handleChangeRole(u.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="student">Student</option>
                      <option value="organizer">Organizator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {u.is_active ? "Activ" : "Inactiv"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleToggleUser(u.id)}
                      className={`text-sm px-3 py-1 rounded-lg font-medium ${u.is_active ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-green-100 text-green-600 hover:bg-green-200"}`}>
                      {u.is_active ? "Dezactivează" : "Activează"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Tab Rapoarte */
        reportsLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : reports ? (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total evenimente", value: reports.total_events, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Total utilizatori", value: reports.total_users, color: "text-purple-600", bg: "bg-purple-50" },
                { label: "Participare medie", value: reports.average_participation, color: "text-green-600", bg: "bg-green-50" },
                { label: "Rating mediu", value: reports.average_rating > 0 ? `★ ${reports.average_rating}` : "—", color: "text-yellow-600", bg: "bg-yellow-50" },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-2xl p-5 text-center`}>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-sm text-gray-600 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Status evenimente */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" /> Evenimente pe status
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(reports.events_by_status || {}).map(([status, count]) => {
                  const colors = {
                    published: "bg-green-100 text-green-700",
                    pending: "bg-yellow-100 text-yellow-700",
                    cancelled: "bg-red-100 text-red-700",
                    finished: "bg-gray-100 text-gray-700",
                    draft: "bg-blue-100 text-blue-700",
                  }
                  const labels = { published: "Publicate", pending: "În așteptare", cancelled: "Respinse", finished: "Încheiate", draft: "Draft" }
                  return (
                    <div key={status} className={`rounded-xl p-3 text-center ${colors[status] || "bg-gray-100 text-gray-700"}`}>
                      <p className="text-xl font-bold">{count}</p>
                      <p className="text-xs font-medium">{labels[status] || status.replace('EventStatus.', '')}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Activitate lunară */}
            {reports.monthly_report && reports.monthly_report.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" /> Activitate lunară
                </h3>
                <div className="space-y-2">
                  {reports.monthly_report.slice(-12).map(row => {
                    const maxCount = Math.max(...reports.monthly_report.map(r => r.count), 1)
                    const pct = Math.round((row.count / maxCount) * 100)
                    return (
                      <div key={row.month} className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 w-20 flex-shrink-0">{row.month}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: pct + "%" }} />
                        </div>
                        <span className="text-sm font-medium text-gray-700 w-6 text-right">{row.count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Organizatori activi */}
            {reports.organizer_stats && reports.organizer_stats.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" /> Organizatori activi
                </h3>
                <div className="space-y-2">
                  {reports.organizer_stats.slice(0, 10).map((org, i) => (
                    <div key={org.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-indigo-600 text-xs font-semibold">{org.name?.[0]?.toUpperCase()}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-800">{org.name}</span>
                      </div>
                      <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                        {org.total_events} {org.total_events === 1 ? "eveniment" : "evenimente"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <BarChart2 className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">Nu s-au putut încărca rapoartele</p>
          </div>
        )
      )}
    </div>
  )
}
