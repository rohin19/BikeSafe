import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { hazardApi } from '../services/api'

export default function Home({ user }) {
  const [hazards, setHazards] = useState([])
  const [stats, setStats] = useState(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')

  // runs two requests in parallel (sethazards, setStates), runs once at beginning. 
  useEffect(() => {
    Promise.all([hazardApi.list(), hazardApi.stats()])
      .then(([list, statsData]) => {
        setHazards(list)
        setStats(statsData)
      })
      .catch((err) => setError(err.message))
      .finally(() => setBusy(false))
  }, [])

  if (busy) return <div className="page">Loading...</div>
  if (error) return <div className="page">{error}</div>

  // see the figma draft but these can be used eventually in the jsx/tsx
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
  const reportedToday = hazards.filter((h) => new Date(h.created_at).getTime() > oneDayAgo).length
  const reportedByYou = hazards.filter((h) => h.user_id === user.user_id).length
  const topCategory = stats.categories[0] // { category, count } or undefined

  return (
    <div className="page">
      {/* TODO: welcome header, map-placeholder div, two stat cards to show stats: reportedToday / reported by you + report a hazard button */}
      <div>
        <p className="text-muted">Welcome back, </p>
        <h1>{user.name}</h1>
      </div>

      <div className="map-placeholder">map · nearby hazards</div>

      <Link to="/hazards/new" className="button primary">
      + Report a hazard
      </Link>
    </div>
  )
  
}
