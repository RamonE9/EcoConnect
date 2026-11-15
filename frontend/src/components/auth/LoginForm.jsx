import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthLayout, TextField, PasswordField, SubmitButton, FormError } from './AuthKit';
import { clearSession, saveSession } from '../../lib/api';
import { ADMIN_SITE, homeFor, storedUser } from '../../lib/home';
import PublicLeaderboard from '../PublicLeaderboard';

export default function LoginForm() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [signedIn] = useState(storedUser);

    if (signedIn && homeFor(signedIn) !== ADMIN_SITE) {
        return <Navigate to={homeFor(signedIn)} replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: form.username.trim(), password: form.password }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                setError(result.message || 'Login failed. Please try again.');
                return;
            }
            const home = homeFor(result.user);
            if (home === ADMIN_SITE) {
                clearSession();
                window.location.assign(ADMIN_SITE);
                return;
            }
            saveSession(result);
            navigate(home, { replace: true });
        } catch (err) {
            setError(err.message?.includes('too long') ? err.message : 'Cannot connect to the server. Check your internet connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Welcome to EcoConnect"
            subtitle="Sign in to join cleanup drives, earn Eco-Points, and manage your barangay."
            aside={<PublicLeaderboard />}
            footer={
                <>
                    New resident?{' '}
                    <Link to="/signup" className="eco-link">Create an account</Link>
                    <span className="mt-2 block text-xs text-slate-500">Barangay official accounts are created by the system administrator.</span>
                </>
            }
        >
            <FormError message={error} />

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <TextField
                    label="Username"
                    name="username"
                    autoComplete="username"
                    placeholder="Enter your username"
                    required
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
                <PasswordField
                    label="Password"
                    name="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    aside={
                        <Link to="/forgot-password" className="text-sm font-medium text-slate-600 hover:text-brand-800">
                            Forgot password?
                        </Link>
                    }
                />
                <div className="pt-1">
                    <SubmitButton loading={loading} loadingText="Signing in…" disabled={!form.username || !form.password}>
                        Log in
                    </SubmitButton>
                </div>
            </form>
        </AuthLayout>
    );
}
