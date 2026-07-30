import { authApi } from '../services/api'
import type { ProfilePageProps } from '../types'
import '../styles/ProfilePage.css'

export default function ProfilePage({ user, onUserChange }: ProfilePageProps) {
    async function handleLogout() {
        try {
            await authApi.logout()
        } finally {
            onUserChange(null)
        }
    }

    return (
        <div className="profile-page">
            <header className="profile-header">
                <h1>Profile</h1>
            </header>
            <section className="profile-details">
                    <span>Username: <strong>{user.name}</strong></span>
                    <span>Email Address: <strong>{user.email}</strong></span>
            </section>
            <button type="button" className="button secondary profile-logout" onClick={handleLogout}>
                Log out
            </button>
        </div>
    )
}
