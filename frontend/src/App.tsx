import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import AuthPanel from './components/AuthPanel'
import AppLayout from './components/AppLayout'
import Home from './pages/Home'
import Hazards from './pages/Hazards'
import ReportHazard from './pages/ReportHazard'
import RoutesPage from './pages/RoutesPage'
import BikeSharePage from './pages/BikeSharePage'
import ProfilePage from './pages/ProfilePage'
import { authApi } from './services/api'
import type { User } from './types'

import './App.css'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  // Check if the user have already been authenticated per refresh
  useEffect(() => {
    authApi
      .me()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setCheckingSession(false))
  }, [])

  if (checkingSession) {
    return <main className='app-shell'>Checking session...</main>
  }

  // guard clause here, not logged in? show the login/register panel
  if (!user) {
    return (
      <main className="app-shell">
        <AuthPanel user={user} onUserChange={setUser}/>
      </main>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout/>}>
          <Route path="/" element={<Home user={user} />}/>
          <Route path="/hazards" element={<Hazards user={user} />}/>
          <Route path="/hazards/new" element={<ReportHazard user={user} />}/>
          <Route path="/routes" element={<RoutesPage user={user} />}/>
          <Route path="/bikeshare" element={<BikeSharePage />}/>
          <Route path="/profile" element={<ProfilePage user={user} onUserChange={setUser}/>}/>
        </Route>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </BrowserRouter>
  )
}

// <Route path="*" element={<Navigate to="/" replace/>}/> is a fallback route, if the URL doens't match any of what was placed in the earlier Routes, it redirects them to Home

export default App
