import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

// Outlet component is react router's placeholder for whatever child route matched
// could be the components in the /pages directory (Home, Hazards, ReportHazards)
export default function AppLayout() {
    return(
        <div className="website-frame">
            <div className="page-outlet">
                <Outlet />
            </div>
            <BottomNav />
        </div>
    )
}