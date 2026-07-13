import { authApi } from '../services/api'
import type { ProfilePageProps } from '../types'

export default function ProfilePage({ user, onUserChange }: ProfilePageProps) {
    async function handleLogout() {
        try {
            await authApi.logout()
        } finally {
            onUserChange(null)
        }
    }

    return (
        <div className="page">
            <h1>Profile</h1>
            <p className="text-muted">{user.name}</p>
            <p className="text-muted">{user.email}</p>

            <button className="button secondary" onClick={handleLogout}>
                Log out
            </button>
        </div>
    )
}
