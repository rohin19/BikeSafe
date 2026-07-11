import { useState } from 'react'
import { authApi } from '../services/api'

const emptyForm = {
    name: '',
    email: '',
    password: '',
}

export default function AuthPanel({ user, onUserChange }) {
    const [mode, setMode] = useState('login')
    const [form, setForm] = useState(emptyForm)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    function updateField(event) {
        const { name, value } = event.target

        setForm((current) => ({
            ...current,
            [name]: value,
        }))
    }

    function changeMode(newMode) {
        setMode(newMode)
        setError('')
    }

    async function submit(event) {
        event.preventDefault()
        setBusy(true)
        setError('')

        try {
        const data =
            mode === 'login'
            ? await authApi.login({
                    email: form.email,
                    password: form.password,
                })
            : await authApi.register(form)

            onUserChange(data.user)
            setForm(emptyForm)
        } catch (requestError) {
            setError(requestError.message)
        } finally {
            setBusy(false)
        }
    }

    async function logout() {
        setBusy(true)
        setError('')

        try {
        await authApi.logout()
            onUserChange(null)
        } catch (requestError) {
            setError(requestError.message)
        } finally {
            setBusy(false)
        }
    }

    if (user) {
        return (
        <section className="panel account-card">
            <div>
                <p className="eyebrow">Signed in</p>
                <h2>{user.name}</h2>
                <p>{user.email}</p>

                <span className="badge">{user.role}</span>
            </div>

            <button
                className="button secondary"
                type="button"
                onClick={logout}
                disabled={busy}
            >
                {busy ? 'Logging out…' : 'Log out'}
            </button>

            {error && <p className="message error">{error}</p>}
        </section>
        )
    }

    return (
        <section className="panel auth-panel">
            <div className="segmented">
                <button
                    type="button"
                    className={mode === 'login' ? 'active' : ''}
                    onClick={() => changeMode('login')}
                >
                    Log in
                </button>

                <button
                    type="button"
                    className={mode === 'register' ? 'active' : ''}
                    onClick={() => changeMode('register')}
                >
                    Register
                </button>
            </div>

            <div className="auth-description">
                <p className="eyebrow">Account</p>

                <h2>
                    {mode === 'login' ? 'Welcome back' : 'Create an account'}
                </h2>

                <p>
                    {mode === 'login'
                        ? 'Sign in to report and manage hazards.'
                        : 'Create an account to begin reporting hazards.'}
                </p>
            </div>

            <form className="form-grid" onSubmit={submit}>
                {mode === 'register' && (
                    <label>
                        Name
                        <input
                            name="name"
                            value={form.name}
                            onChange={updateField}
                            required
                        />
                    </label>
                )}

                <label>
                    Email
                <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={updateField}
                    required
                />
                </label>

                <label>
                    Password
                    <input
                        name="password"
                        type="password"
                        minLength="8"
                        value={form.password}
                        onChange={updateField}
                        required
                    />
                </label>

                {error && <p className="message error">{error}</p>}

                <button
                    className="button primary"
                    type="submit"
                    disabled={busy}
                >
                    {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
                </button>
            </form>
        </section>
    )
}