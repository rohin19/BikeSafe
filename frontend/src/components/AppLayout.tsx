import { Outlet } from 'react-router-dom'
import type { User } from '../types'
import Navbar from './Navbar'

// Outlet component is react router's placeholder for whatever child route matched
// could be the components in the /pages directory (Home, Hazards, ReportHazards)
export default function AppLayout({ user }: { user: User | null }) {
    return (
        <div className="website-frame">
            <Navbar user={user} />
            <main className="page-outlet">
                <Outlet />
            </main>
        </div>
    )
}