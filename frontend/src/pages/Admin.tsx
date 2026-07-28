import { useEffect, useState } from "react";
import { adminApi } from "../services/api";
import type { User } from '../types'

export default function Admin({ user }: {user: User | null}) {
    const [users, setUsers] = useState<User[]>([])
    const [busy, setBusy] = useState(true)
    const [error, setError] = useState('')
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const [updatingId, setUpdatingId] = useState<number | null>(null)

    if (user?.role !== 'admin') {
        return <div className="page"> 
            you do not have permission to view this page.
            </div>
    }

    async function handleDelete(userID:number) {
        if (!window.confirm('Delete this user? This cannot be undone.')) return
        setDeletingId(userID)
        try {
            await adminApi.deleteUser(userID)
            setUsers((prev) => prev.filter((u) => u.user_id !== userID))
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setDeletingId(null)
        }
    }

    async function handleRoleChange(userId: number, newRole: string) {
        setUpdatingId(userId)
        try {
            const updated = await adminApi.updateRole(userId, newRole)
            setUsers((prev) => prev.map((u) => u.user_id === userId ? updated: u))
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setUpdatingId(null)
        }
    }

    useEffect(() => {
        adminApi
            .listUsers()
            .then(setUsers)
            .catch((err) => setError(err.message))
            .finally(() => setBusy(false))
    }, [])

    if (busy) return <div className="page">Loading...</div>
    if (error) return <div className="page">{error}</div>

    return (
        <div className="page">
      <h1>Admin — User Management</h1>
      <p className="text-muted">{users.length} registered users</p>

      {users.map((u) => (
        <div key={u.user_id} style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          gap: '12px'
        }}>
          {/* User info */}
          <div style={{ textAlign: 'left' }}>
            <strong>{u.name}</strong>
            <p className="text-muted" style={{ fontSize: '14px' }}>{u.email}</p>
          </div>

          {/* Role badge */}
          <span style={{
            padding: '2px 10px',
            borderRadius: '999px',
            fontSize: '13px',
            background: u.role === 'admin' ? 'var(--accent-bg)' : 'var(--code-bg)',
            color: u.role === 'admin' ? 'var(--accent)' : 'var(--text)',
            border: u.role === 'admin' ? '1px solid var(--accent-border)' : '1px solid var(--border)'
          }}>
            {u.role}
          </span>

          {/* Actions — don't show controls for yourself */}
          {u.user_id !== user.user_id && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleRoleChange(u.user_id, u.role === 'admin' ? 'user' : 'admin')}
                disabled={updatingId === u.user_id}
                className="button"
              >
                {updatingId === u.user_id
                  ? 'Updating...'
                  : u.role === 'admin' ? 'Demote' : 'Make Admin'}
              </button>

              <button
                onClick={() => handleDelete(u.user_id)}
                disabled={deletingId === u.user_id}
                className="button"
                style={{ color: 'red', borderColor: 'red' }}
              >
                {deletingId === u.user_id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
    )
}