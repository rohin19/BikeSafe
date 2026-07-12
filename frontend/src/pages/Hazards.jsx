import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { hazardApi } from '../services/api'
import HazardCard from '../components/HazardCard'

export default function Hazards() {
  const [hazards, setHazards] = useState([])
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    hazardApi
    .list()
    .then(setHazards)
    .catch((err) => setError(err.message))
    .finally(() => setBusy(false))
  }, [])

  return (
    <div className="page">
      <h1>Reported Hazards</h1>
      {hazards.map((hazard) => (
        <HazardCard key={hazard.hazard_id} hazard={hazard} />
      ))}
      <Link to="/hazards/new" className="button primary">
        + Report a hazard
      </Link>
    </div>
  )
}


