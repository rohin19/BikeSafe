import { hazardApi } from '../services/api'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import HazardCard from '../components/HazardCard'
import type { Hazard, User, HazardStats } from '../types'
import Map from '../components/Map'
import '../styles/Hazards.css'

export default function Hazards({ user }: { user: User | null}) {
  const [hazards, setHazards] = useState<Hazard[]>([])
  const [stats, setStats] = useState<HazardStats | null>(null)
  const [busy, setBusy] = useState(true) //just tracks if the api request is in progress;
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null) // keeps track of hazard id up for deletion

  async function handleDelete(hazardId: number) {
    if (!window.confirm('Delete this hazard report? This cannot be undone. ')) {
      return
    }
    setDeletingId(hazardId)
    try {
      await hazardApi.remove(hazardId)
      setHazards((prev) => prev.filter((h) => h.hazard_id !== hazardId)) // creates a new hazards array without the targeted one for deletion
    } catch (err) {
      setError(err instanceof Error ? err.message: 'Something went wrong')
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    Promise.all([hazardApi.list(), hazardApi.stats()])
      .then(([hazardList, hazardStats]) => {
        setHazards(hazardList)
        setStats(hazardStats)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      })
      .finally(() => setBusy(false))
  }, [])

  if (busy) return <div className="page">Loading...</div>
  if (error) return <div className="page">{error}</div>

  // stats
  const now = Date.now()
  const oneDayAgo = now - 24 * 60 * 60 * 1000
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000

  const reportedToday = hazards.filter((h) => new Date(h.created_at).getTime() > oneDayAgo).length
  const reportedThisWeek = hazards.filter((h) => new Date(h.created_at).getTime() > oneWeekAgo).length
  const reportedByYou = hazards.filter((h) => h.user_id === user!.user_id).length
  const reportedAllTime = hazards.length
  const topCategory = stats?.categories[0]

  const averageSeverity = hazards.length > 0 ? (hazards.reduce((total, hazard) => 
    total + Number(hazard.severity), 0) / hazards.length).toFixed(1): '0.0'

  // const unresolvedHazards = hazards.filter((hazard) =>
  //    hazard.current_status !== 'resolved').length

  // const resolvedHazards = hazards.filter((hazard) =>
  //   hazard.current_status === 'resolved').length

  const recentHazards = [...hazards].sort(
    (a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime(),
  )

  return (
    <div className="hazards-page">
      <header className="hazards-header">
        <h1>Hazards</h1>
      </header>

      <div className="hazards-dashboard">
        <section className="recent-hazards-panel">
          <h2>Recent reports</h2>

          <div className="hazards-list">
            {recentHazards.length === 0 ? (
              <p className="hazards-empty">No hazards reported yet.</p>
            ) : (
              recentHazards.map((hazard) => (
                <HazardCard
                  key={hazard.hazard_id}
                  hazard={hazard}
                  isAdmin={user?.role === 'admin'}
                  onDelete={handleDelete}
                  deleting={deletingId === hazard.hazard_id}
                />
              ))
            )}
          </div>

          <Link
            to="/hazards/new"
            className="button primary hazards-report-button"
          >
            Report a hazard
          </Link>
        </section>

        <div className="hazards-overview">
          <section className="hazard-stats-grid">
            <article className="hazard-stat">
              <span>Reported Today</span>
              <strong>{reportedToday}</strong>
            </article>

            <article className="hazard-stat">
              <span>Reported This Week</span>
              <strong>{reportedThisWeek}</strong>
            </article>

            <article className="hazard-stat">
              <span>Reported All Time</span>
              <strong>{reportedAllTime}</strong>
            </article>

            <article className="hazard-stat">
              <span>Reported by You</span>
              <strong>{reportedByYou}</strong>
            </article>

            <article className="hazard-stat">
              <span>Average Severity</span>
              <strong>{averageSeverity} / 5</strong>
            </article>

            <article className="hazard-stat hazard-stat-category">
              <span>Most Reported</span>
              <strong>
                {topCategory ? topCategory.category : 'No reports'}
              </strong>

              {topCategory && (
                <small>{topCategory.count} reports</small>
              )}
            </article>
          </section>

          <section className="hazards-map-section">
            <h2>Hazard Map</h2>

            <div className="hazards-map">
              <Map hazards={hazards} />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}


