import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { hazardApi } from '../services/api'
import HazardCard from '../components/HazardCard'

export default function Hazards({ user }) {
  const [hazards, setHazards] = useState([])
  const [busy, setBusy] = useState(true) //just tracks if the api request is in progress;
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null) // keeps track of hazard id up for deletion

  async function handleDelete(hazardId) {
    if (!window.confirm('Delete this hazard report? This cannot be undone. ')) {
      return
    }
    setDeletingId(hazardId)
    try {
      await hazardApi.remove(hazardId)
      setHazards((prev) => prev.filter((h) => h.hazard_id !== hazardId)) // creates a new hazards array without the targeted one for deletion
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    hazardApi
    .list()
    .then(setHazards)
    .catch((err) => setError(err.message))
    .finally(() => setBusy(false))
  }, [])

  if (busy) return <div className="page">Loading...</div>
  if (error) return <div className="page">{error}</div>

  return (
    <div className="page">
      <h1>Reported Hazards</h1>
      {hazards.map((hazard) => (
        <HazardCard key={hazard.hazard_id} hazard={hazard} 
          isAdmin={user?.role === 'admin'}
          onDelete={handleDelete}
          deleting={deletingId === hazard.hazard_id}/>
      ))}
      <Link to="/hazards/new" className="button primary">
        + Report a hazard
      </Link>
    </div>
  )
}


