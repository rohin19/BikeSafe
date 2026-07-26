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

    
}