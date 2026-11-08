import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout, TextField, PasswordField, SubmitButton, FormError } from './AuthKit';
import { saveSession } from '../../lib/api';
import PublicLeaderboard from '../PublicLeaderboard';

const COPY = {
    resident: {
        title: 'Welcome back!',
        subtitle: 'Sign in to keep earning Eco-Points with your barangay.',
        forgot: '/forgot-password',
        signup: '/signup',
        home: '/dashboard',
    },
    admin: {
        title: 'Official sign in',
        subtitle: 'Manage events, residents and rewards for your barangay.',
        forgot: '/admin/forgot-password',
        signup: null,
        home: '/admin',
    },
};

export default function LoginForm({ portal }) {
    const copy = COPY[portal];
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, username: form.username.trim(), portal }),
            });
            const result = await response.json().catch(() => ({}));
            if (response.ok) {
                saveSession(result);
                navigate(copy.home);
            } else {
                setError(result.message || 'Login failed. Please try again.');
            }
        } catch (err) {
            setError(err.message?.includes('too long') ? err.message : 'Cannot connect to the server. Check your internet connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title={copy.title}
            subtitle={copy.subtitle}
            aside={portal === 'resident' ? <PublicLeaderboard /> : null}
            footer={copy.signup ? (
                <>
                    Don&apos;t have an account yet?{' '}
                    <Link to={copy.signup} className="eco-link">Sign up</Link>
                </>
            ) : (
                <span className="text-slate-500">Official accounts are created by the system administrator.<br />Need access? Contact your city or barangay IT office.</span>
            )}
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
                        <Link to={copy.forgot} className="text-sm font-medium text-slate-600 hover:text-brand-800">
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
