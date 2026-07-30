import { NavLink } from 'react-router-dom'
import type { User } from '../types'
import {
    Bike,
    House,
    Menu,
    MessageSquareText,
    Route,
    TriangleAlert,
    UserRound,
    X,
} from 'lucide-react'
import { useState } from 'react'

const NAV_ITEMS = [
    { to: '/profile', label: 'Profile', icon: UserRound },
    { to: '/', label: 'Home', icon: House },
    { to: '/hazards', label: 'Hazards', icon: TriangleAlert },
    { to: '/routes', label: 'Routes', icon: Route },
    { to: '/reviews', label: 'Reviews', icon: MessageSquareText },
    { to: '/bikeshare', label: 'Bike Sharing', icon: Bike },
]

export default function Navbar({ user }: { user: User | null }) {
    const [isOpen, setIsOpen] = useState(false)
    function closeMenu() {
        setIsOpen(false)
    }

    return (
        <>
            <button
                type="button"
                className="nav-toggle"
                aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
                aria-expanded={isOpen}
                onClick={() => setIsOpen((current) => !current)}
            >
                {isOpen
                    ? <X aria-hidden="true" />
                    : <Menu aria-hidden="true" />}
            </button>

            {isOpen && (
                <button
                    type="button"
                    className="nav-backdrop"
                    aria-label="Close navigation"
                    onClick={closeMenu}
                />
            )}

            <nav className={isOpen ? 'side-nav open' : 'side-nav'}>
                {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        onClick={closeMenu}
                        className={({ isActive }) =>
                            isActive ? 'nav-item active' : 'nav-item'
                        }
                    >
                        <Icon className="nav-icon" aria-hidden="true" />
                        <span>{label}</span>
                    </NavLink>
                ))}

                {user?.role === 'admin' && (
                    <NavLink
                        to="/admin"
                        onClick={closeMenu}
                        className={({ isActive }) =>
                            isActive
                                ? 'nav-item admin-nav-item active'
                                : 'nav-item admin-nav-item'
                        }
                    >
                        <span>Admin</span>
                    </NavLink>
                )}
            </nav>
        </>
    )
}
