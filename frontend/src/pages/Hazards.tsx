import { hazardApi } from '../services/api'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import HazardCard from '../components/HazardCard'
import type { Hazard, User, HazardStats } from '../types'

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

  const unresolvedHazards = hazards.filter((hazard) =>
     hazard.current_status !== 'resolved').length

  const resolvedHazards = hazards.filter((hazard) =>
    hazard.current_status === 'resolved').length

  return (
    <div className="page">
      <h1>Reported Hazards</h1>
      {hazards.map((hazard) => (
        <HazardCard key={hazard.hazard_id} hazard={hazard} 
          isAdmin={user?.role === 'admin'}
          onDelete={handleDelete}
          deleting={deletingId === hazard.hazard_id}/>
      ))}
      <div className="stats">
        <h2>Hazard Statistics</h2>
        <p>Reported today: {reportedToday}</p>
        <p>Reported this week: {reportedThisWeek}</p>
        <p>Reported all time: {reportedAllTime}</p>
        <p>Reported by you: {reportedByYou}</p>
        <p>Average severity: {averageSeverity}/5</p>
        <p>Unresolved hazards: {unresolvedHazards}</p>
        <p>Resolved hazards: {resolvedHazards}</p>
        <p>Most reported category:{' '}
          {topCategory ? `${topCategory.category} (${topCategory.count} reports)`: 'No reports yet'}
        </p>
      </div>
      <Link to="/hazards/new" className="button primary">
        + Report a hazard
      </Link>
    </div>
  )
}


