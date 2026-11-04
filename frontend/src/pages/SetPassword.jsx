import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { AuthLayout, PasswordField, SubmitButton, FormError, PasswordStrength } from '../components/auth/AuthKit';
import { passwordError } from '../components/auth/validation';
import { clearSession, readMessage } from '../lib/api';
import { toast } from '../lib/toast';

function storedUser() {
    try {
        return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
        return null;
    }
}

export default function SetPassword() {
    const navigate = useNavigate();
    const [user] = useState(storedUser);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const isOfficial = user && user.role !== 'resident';
    const loginPath = isOfficial ? '/login-Barangay' : '/login-Residence';

    useEffect(() => {
        if (!localStorage.getItem('token') || !user) navigate('/login-Barangay', { replace: true });
    }, [navigate, user]);

    const signOut = () => {
        clearSession();
        navigate(loginPath, { replace: true });
    };

    const submit = async (e) => {
        e.preventDefault();
        if (loading) return;
        const problem = passwordError(password)
            || (password.trim().toLowerCase() === (user?.username || '').toLowerCase() ? 'Your new password must be different from your username.' : '')
            || (password !== confirm ? 'Passwords do not match.' : '');
        if (problem) return setError(problem);
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ new_password: password }),
            });
            if (!res.ok) return setError(await readMessage(res, 'Could not update your password.'));
            const data = await res.json();
            localStorage.setItem('user', JSON.stringify(data.user));
            toast('Password updated. Welcome to EcoConnect!', 'success');
            navigate(isOfficial ? '/admin' : '/dashboard', { replace: true });
        } catch (err) {
            setError(err.message?.includes('too long') ? err.message : 'Cannot connect to the server. Check your internet connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Set a new password"
            subtitle={`Welcome${user?.username ? `, ${user.username}` : ''}! Your first password is temporary. Choose your own password to continue.`}
            back={
                <button type="button" onClick={signOut} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
                    <LogOut className="h-4 w-4" /> Sign out
                </button>
            }
        >
            <FormError message={error} />
            <form onSubmit={submit} className="space-y-5" noValidate>
                <div>
                    <PasswordField label="New password" autoComplete="new-password" placeholder="At least 8 characters"
                        value={password} onChange={(e) => setPassword(e.target.value)} />
                    <PasswordStrength password={password} />
                </div>
                <PasswordField label="Confirm new password" autoComplete="new-password" placeholder="Re-enter your password"
                    value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                <SubmitButton loading={loading} loadingText="Saving…" disabled={!password || !confirm}>
                    Save password and continue
                </SubmitButton>
            </form>
        </AuthLayout>
    );
}
