import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
    { to: '/', label: 'Home' },
    { to: '/hazards', label: 'Hazards' },
    { to: '/routes', label: 'Routes'},
    { to: '/bikeshare', label: 'BikeShare' },
    { to: '/profile', label: 'Profile' }
]

export default function BottomNav() {
    return (
        <nav className="bottom-nav">
            {NAV_ITEMS.map((item) => (
                <NavLink
                    // key is not navlink props, it's used by map as a stable unique ID to track which node to re-render
                    key={item.to}
                    // to is the (navlink path) destination path, renders a <a href="/component"> under hood
                    to={item.to}
                    // end controls if the link isActive if the URL matches exactly
                    end={item.to === '/'}
                    // isActive comes from react-router
                    className={({ isActive }) => (isActive ? 'nav-item active':'nav-item')}
                >
                    <span>{item.label}</span>
                </NavLink>
            ))}
        </nav>
    )
}
