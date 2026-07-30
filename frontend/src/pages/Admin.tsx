import { useEffect, useState } from "react";
import { adminApi } from "../services/api";
import type { User } from '../types'
import '../styles/Admin.css'

export default function Admin({ user }: {user: User | null}) {
    const [users, setUsers] = useState<User[]>([])
    const [busy, setBusy] = useState(true)
    const [error, setError] = useState('')
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const [updatingId, setUpdatingId] = useState<number | null>(null)

    // if (user?.role !== 'admin') {
    //     return <div className="page"> 
    //         you do not have permission to view this page.
    //         </div>
    // }

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
        if (user?.role !== 'admin') {
            setBusy(false)
            return
        }

        adminApi
            .listUsers()
            .then(setUsers)
            .catch((err) => setError(err.message))
            .finally(() => setBusy(false))
    }, [user?.role])

    if (user?.role !== 'admin') {
      return (
          <div className="admin-status admin-error">
              You do not have permission to view this page.
          </div>
      )
    }
    if (busy) return <div className="page">Loading...</div>
    if (error) return <div className="page">{error}</div>

    return (
      <div className="admin-page">
          <header className="admin-header">
              <h1>Admin — User Management</h1>
              <p>{users.length} registered users</p>
          </header>

          <section className="admin-user-list">
              {users.map((listedUser) => (
                  <article
                      className={
                          listedUser.user_id === user.user_id
                              ? 'admin-user-card current-user'
                              : 'admin-user-card'
                      }
                      key={listedUser.user_id}
                  >
                      <div className="admin-user-information">
                          <div className="admin-user-name">
                              <strong>{listedUser.name}</strong>
                              {/* role badge */}
                              <span
                                  className={
                                      listedUser.role === 'admin'
                                          ? 'admin-role-badge admin'
                                          : 'admin-role-badge'
                                  }
                              >
                                  {listedUser.role ?? 'user'}
                              </span>
                          </div>

                          <p>{listedUser.email}</p>
                      </div>

                      {listedUser.user_id !== user.user_id ? (
                          <div className="admin-user-actions">
                              <button
                                  type="button"
                                  className="admin-action-button"
                                  disabled={updatingId === listedUser.user_id}
                                  onClick={() =>
                                      handleRoleChange(
                                          listedUser.user_id,
                                          listedUser.role === 'admin'
                                              ? 'user'
                                              : 'admin',
                                      )
                                  }
                              >
                                  {updatingId === listedUser.user_id
                                      ? 'Updating...'
                                      : listedUser.role === 'admin'
                                          ? 'Demote'
                                          : 'Make admin'}
                              </button>
                                    
                              <button
                                  type="button"
                                  className="admin-action-button delete"
                                  disabled={deletingId === listedUser.user_id}
                                  onClick={() =>
                                      handleDelete(listedUser.user_id)
                                  }
                              >
                                  {deletingId === listedUser.user_id
                                      ? 'Deleting...'
                                      : 'Delete'}
                              </button>
                          </div>
                      ) : (
                          <span className="admin-current-label">
                              Current account
                          </span>
                      )}
                  </article>
              ))}
          </section>
      </div>
  )
}