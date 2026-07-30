import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { hazardApi } from '../services/api'
import type { User, Hazard, HazardStats } from '../types'
import Map from '../components/Map'
import { computeReportedToday, computeReportedByYou } from './homeStats'
import '../styles/Home.css'

export default function Home({ user }: {user: User}) {
  const [hazards, setHazards] = useState<Hazard[]>([])
  const [stats, setStats] = useState<HazardStats | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')

  // runs two requests in parallel (sethazards, setStates), runs once at beginning. 
  useEffect(() => {
    Promise.all([hazardApi.list(), hazardApi.stats()])
      .then(([list, statsData]) => {
        setHazards(list)
        setStats(statsData)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Something went wrong'))
      .finally(() => setBusy(false))
  }, [])

  if (busy) return <div className="page">Loading...</div>
  if (error) return <div className="page">{error}</div>

  // see the figma draft but these can be used eventually in the jsx/tsx
  const reportedToday = computeReportedToday(hazards)
  const reportedByYou = computeReportedByYou(hazards, user.user_id)
  const topCategory = stats?.categories[0] // { category, count } or undefined

  return (
    <div className="page home-page">
      <header className="home-header">
        <h1>BikeSafe</h1>
        <p>
          Current user: <strong>{user.name}</strong>
        </p>
      </header>

      <div className="home-map">
        <Map hazards={hazards} />
      </div>

      <div className="home-actions">
        <Link to="/hazards/new" className="button primary home-action">
          Report a Hazard
        </Link>

        <Link to="/reviews" className="button secondary home-action">
          Route Logs &amp; Reviews
        </Link>
      </div>
    </div>
)
  
}
