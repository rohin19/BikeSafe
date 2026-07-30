import { useState, type ChangeEvent, type FormEvent } from 'react'
import { authApi } from '../services/api'
import type { User, AuthPanelProps } from '../types'
import '../styles/AuthPanel.css'

const emptyForm = {
    name: '',
    email: '',
    password: '',
}

export default function AuthPanel({ user, onUserChange }: AuthPanelProps) {
    const [mode, setMode] = useState<'login' | 'register'>('login')
    const [form, setForm] = useState(emptyForm)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    function updateField(event: ChangeEvent<HTMLInputElement>) {
        const { name, value } = event.target

        setForm((current) => ({
            ...current,
            [name]: value,
        }))
    }

    function changeMode(newMode: 'login' | 'register') {
        setMode(newMode)
        setError('')
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
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
            setError(requestError instanceof Error ? requestError.message: 'Something went wrong!')
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
            setError(requestError instanceof Error ? requestError.message : 'Something went wrong')
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
        <section className="auth-page">
            <div className="auth-card">
                <header className="auth-header">
                    <h1 className="auth-title">BikeSafe</h1>
                    <h2>
                        {mode === 'login' ? 'Welcome back' : 'Create an account'}
                    </h2>
                    <p>
                        {mode === 'login'
                            ? 'Sign in to report and manage cycling hazards.'
                            : 'Register to begin reporting cycling hazards.'}
                    </p>
                </header>

                <form className="auth-form" onSubmit={submit}>
                    {mode === 'register' && (
                        <label className="auth-field">
                            Name
                            <input
                                name="name"
                                type="text"
                                autoComplete="name"
                                value={form.name}
                                onChange={updateField}
                                required
                            />
                        </label>
                    )}

                    <label className="auth-field">
                        Email
                        <input
                            name="email"
                            type="email"
                            autoComplete="email"
                            value={form.email}
                            onChange={updateField}
                            required
                        />
                    </label>

                    <label className="auth-field">
                        Password
                        <input
                            name="password"
                            type="password"
                            autoComplete={
                                mode === 'login'
                                    ? 'current-password'
                                    : 'new-password'
                            }
                            minLength={8}
                            value={form.password}
                            onChange={updateField}
                            required
                        />
                    </label>

                    {error && (
                    <p className="auth-error" role="alert">
                        {error}
                    </p>
                )}

                <button className="auth-submit" type="submit" disabled={busy}>
                    {busy
                        ? 'Please wait…'
                        : mode === 'login'
                            ? 'Log in'
                            : 'Create account'}
                </button>
            </form>

            <p className="auth-switch">
                {mode === 'login'
                    ? 'Don’t have an account?'
                    : 'Already have an account?'}

                <button
                    type="button"
                    className="auth-switch-button"
                    onClick={() =>
                        changeMode(mode === 'login' ? 'register' : 'login')
                    }
                >
                    {mode === 'login' ? 'Sign up' : 'Log in'}
                </button>
            </p>
        </div>
    </section>
)
}