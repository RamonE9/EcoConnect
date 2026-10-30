import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
    AuthLayout, TextField, PasswordField, SubmitButton, FormError, FormNotice, PasswordStrength,
} from './AuthKit';
import { passwordError } from './validation';
import { toast } from '../../lib/toast';

const STEPS = {
    1: { title: 'Forgot password?', subtitle: 'Enter the mobile number or email on your account and we’ll send a 6-digit code.' },
    2: { title: 'Check your email', subtitle: 'Enter the 6-digit code we sent. It expires in 10 minutes.' },
    3: { title: 'Set a new password', subtitle: 'Choose a password you haven’t used before.' },
};

async function post(url, body) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
}

export default function ResetPasswordForm({ portal }) {
    const loginPath = portal === 'admin' ? '/login-Barangay' : '/login-Residence';
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [identifier, setIdentifier] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const run = async (action) => {
        if (loading) return;
        setLoading(true);
        setError('');
        try {
            await action();
        } catch (err) {
            setError(err.message?.includes('too long') ? err.message : 'Cannot connect to the server. Check your internet connection.');
        } finally {
            setLoading(false);
        }
    };

    const sendCode = (e) => {
        e?.preventDefault();
        run(async () => {
            const { ok, data } = await post('/api/auth/forgot-password', { identifier: identifier.trim() });
            if (!ok) return setError(data.message || 'Could not send the code.');
            setNotice(data.message);
            setOtp('');
            setStep(2);
        });
    };

    const verifyCode = (e) => {
        e.preventDefault();
        run(async () => {
            const { ok, data } = await post('/api/auth/verify-otp', { identifier: identifier.trim(), otp_code: otp });
            if (!ok) return setError(data.message || 'Invalid or expired code.');
            setNotice('');
            setStep(3);
        });
    };

    const resetPassword = (e) => {
        e.preventDefault();
        const problem = passwordError(password) || (password !== confirm ? 'Passwords do not match.' : '');
        if (problem) return setError(problem);
        run(async () => {
            const { ok, data } = await post('/api/auth/reset-password', {
                identifier: identifier.trim(), otp_code: otp, new_password: password,
            });
            if (!ok) return setError(data.message || 'Could not reset your password.');
            toast('Password updated. Please sign in with your new password.', 'success');
            navigate(loginPath);
        });
    };

    const back = step === 1 ? (
        <Link to={loginPath} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> Back to sign in
        </Link>
    ) : (
        <button type="button" onClick={() => { setError(''); setStep(step - 1); }} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> Back
        </button>
    );

    return (
        <AuthLayout
            title={STEPS[step].title}
            subtitle={STEPS[step].subtitle}
            back={back}
            footer={<>Remembered it? <Link to={loginPath} className="eco-link">Sign in</Link></>}
        >
            <FormNotice message={notice} />
            <FormError message={error} />

            {step === 1 && (
                <form onSubmit={sendCode} className="space-y-5" noValidate>
                    <TextField label="Mobile number or email" placeholder="09171234567 or example@gmail.com" autoComplete="username"
                        value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
                    <SubmitButton loading={loading} loadingText="Sending code…" disabled={identifier.trim().length < 5}>
                        Send code
                    </SubmitButton>
                </form>
            )}

            {step === 2 && (
                <form onSubmit={verifyCode} className="space-y-5" noValidate>
                    <TextField label="6-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000"
                        className="eco-input text-center font-mono text-lg tracking-[0.5em]"
                        value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
                    <SubmitButton loading={loading} loadingText="Checking…" disabled={otp.length !== 6}>
                        Verify code
                    </SubmitButton>
                    <p className="text-center text-sm text-slate-600">
                        Didn&apos;t get it?{' '}
                        <button type="button" onClick={sendCode} disabled={loading} className="eco-link disabled:opacity-50">Send a new code</button>
                    </p>
                </form>
            )}

            {step === 3 && (
                <form onSubmit={resetPassword} className="space-y-5" noValidate>
                    <div>
                        <PasswordField label="New password" autoComplete="new-password" placeholder="At least 8 characters"
                            value={password} onChange={(e) => setPassword(e.target.value)} />
                        <PasswordStrength password={password} />
                    </div>
                    <PasswordField label="Confirm new password" autoComplete="new-password" placeholder="Re-enter your password"
                        value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                    <SubmitButton loading={loading} loadingText="Updating…" disabled={!password || !confirm}>
                        Update password
                    </SubmitButton>
                </form>
            )}
        </AuthLayout>
    );
}
