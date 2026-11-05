import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ImagePlus, X } from 'lucide-react';
import {
    AuthLayout, TextField, PasswordField, BarangaySelect, SubmitButton, FormError, FormNotice,
    PasswordStrength,
} from './AuthKit';
import { phoneError, passwordError, imageFileError, MAX_UPLOAD_MB } from './validation';
import DataPrivacyModal from '../DataPrivacyModal';
import { toast } from '../../lib/toast';
import { URBAN_BARANGAYS } from '../../data/barangays';

const COPY = {
    title: 'Create account',
    subtitle: 'Join cleanup drives and earn Eco-Points for your community.',
    login: '/login-Residence',
};

const STEP_LABELS = { 1: 'Account details', 2: 'Enter your code', 3: 'Barangay & verification' };

async function postJson(url, body) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return { ok: response.ok, data: await response.json().catch(() => ({})) };
}

const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,30}$/;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function SignupForm() {
    const copy = COPY;
    const isResident = true;
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [form, setForm] = useState({
        username: '', email: '', phone_number: '', password: '', confirm: '', barangay: URBAN_BARANGAYS[0],
    });
    const [idImage, setIdImage] = useState(null);
    const [preview, setPreview] = useState('');
    const [consent, setConsent] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [touched, setTouched] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [otp, setOtp] = useState('');
    const [sentTo, setSentTo] = useState({ where: '' });
    const [codeSkipped, setCodeSkipped] = useState(false);

    useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
    const touch = (key) => () => setTouched({ ...touched, [key]: true });

    const errors = {
        username: USERNAME_PATTERN.test(form.username) ? '' : '3–30 characters: letters, numbers, dot, dash or underscore.',
        email: EMAIL_PATTERN.test(form.email) ? '' : 'Enter a valid email address.',
        phone_number: phoneError(form.phone_number),
        password: passwordError(form.password),
        confirm: form.confirm && form.confirm === form.password ? '' : 'Passwords do not match.',
    };
    const stepOneValid = !errors.username && !errors.email && !errors.phone_number && !errors.password && !errors.confirm;
    const show = (key) => (touched[key] ? errors[key] : '');

    const connectionError = (err) => setError(err.message?.includes('too long') ? err.message : 'Cannot connect to the server. Check your internet connection.');

    const sendCode = async (e) => {
        e?.preventDefault();
        setTouched({ username: true, email: true, phone_number: true, password: true, confirm: true });
        if (!stepOneValid || loading) return;
        setLoading(true);
        setError('');
        try {
            const { ok, data } = await postJson('/api/auth/register/send-code', {
                username: form.username.trim(),
                email: form.email.trim(),
                phone_number: form.phone_number.replace(/[\s-]/g, ''),
            });
            if (!ok) return setError(data.message || 'Could not send the code. Please try again.');
            if (data.verification_required === false) {
                setCodeSkipped(true);
                setNotice('');
                setStep(3);
                return;
            }
            setCodeSkipped(false);
            setNotice(data.message);
            setSentTo({ where: data.sent_to || '' });
            setOtp('');
            setStep(2);
        } catch (err) {
            connectionError(err);
        } finally {
            setLoading(false);
        }
    };

    const verifyCode = async (e) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setError('');
        try {
            const { ok, data } = await postJson('/api/auth/register/verify-code', { email: form.email.trim(), otp_code: otp });
            if (!ok) return setError(data.message || 'Invalid or expired code.');
            setNotice('');
            setStep(3);
        } catch (err) {
            connectionError(err);
        } finally {
            setLoading(false);
        }
    };

    const pickFile = (file) => {
        const problem = imageFileError(file);
        if (problem) {
            setError(problem);
            return;
        }
        setError('');
        if (preview) URL.revokeObjectURL(preview);
        setIdImage(file);
        setPreview(URL.createObjectURL(file));
    };

    const clearFile = () => {
        if (preview) URL.revokeObjectURL(preview);
        setIdImage(null);
        setPreview('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        if (isResident && imageFileError(idImage)) return setError(imageFileError(idImage));
        if (!consent) return setError('Please agree to the Data Privacy Policy to continue.');

        setLoading(true);
        setError('');
        const data = new FormData();
        data.append('username', form.username.trim());
        data.append('email', form.email.trim());
        data.append('phone_number', form.phone_number.replace(/[\s-]/g, ''));
        data.append('password', form.password);
        data.append('role', 'resident');
        data.append('barangay', form.barangay);
        data.append('otp_code', otp);
        if (idImage) data.append('id_image', idImage);

        try {
            const response = await fetch('/api/auth/register', { method: 'POST', body: data });
            const result = await response.json().catch(() => ({}));
            if (response.ok) {
                toast(isResident
                    ? 'Account created! You can sign in while your ID is being verified.'
                    : 'Official account created. You can now sign in.', 'success');
                navigate(copy.login);
            } else {
                const message = result.message || 'Registration failed. Please try again.';
                setError(message);
                if (/code/i.test(message)) setStep(2);
                else if (/username|email|phone|password/i.test(message)) setStep(1);
            }
        } catch (err) {
            connectionError(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title={copy.title}
            subtitle={copy.subtitle}
            back={step > 1 ? (
                <button type="button" onClick={() => { setError(''); setNotice(''); setStep(step === 3 && codeSkipped ? 1 : step - 1); }} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
            ) : null}
            footer={
                <>
                    Already have an account?{' '}
                    <Link to={copy.login} className="eco-link">Sign in</Link>
                </>
            }
        >

            <div className="flex items-center justify-between mb-5 text-xs font-medium text-slate-500">
                <span>Step {step} of 3 · {STEP_LABELS[step]}</span>
                <span className="flex gap-1" aria-hidden="true">
                    {[1, 2, 3].map((n) => (
                        <span key={n} className={`w-6 h-1 rounded-full ${step >= n ? 'bg-brand-700' : 'bg-slate-200'}`} />
                    ))}
                </span>
            </div>

            <FormNotice message={notice} />
            <FormError message={error} />

            {step === 1 ? (
                <form onSubmit={sendCode} className="space-y-5" noValidate>
                    <TextField label="Username" placeholder="e.g. juan.delacruz" autoComplete="username"
                        value={form.username} onChange={set('username')} onBlur={touch('username')} error={show('username')} maxLength={30} />
                    <TextField label="Email address" type="email" placeholder="example@gmail.com" autoComplete="email"
                        value={form.email} onChange={set('email')} onBlur={touch('email')} error={show('email')} maxLength={120}
                        hint="You can use it to find your account if you forget your password." />
                    <TextField label="Mobile number" type="tel" inputMode="tel" placeholder="09171234567" autoComplete="tel"
                        value={form.phone_number} onChange={set('phone_number')} onBlur={touch('phone_number')} error={show('phone_number')} maxLength={13}
                        hint="We'll text a 6-digit code to this number." />
                    <div>
                        <PasswordField label="Password" placeholder="At least 8 characters" autoComplete="new-password"
                            value={form.password} onChange={set('password')} onBlur={touch('password')} error={show('password')} />
                        <PasswordStrength password={form.password} />
                    </div>
                    <PasswordField label="Confirm password" placeholder="Re-enter your password" autoComplete="new-password"
                        value={form.confirm} onChange={set('confirm')} onBlur={touch('confirm')} error={show('confirm')} />
                    <div className="pt-1">
                        <SubmitButton loading={loading} loadingText="Sending code…">Continue</SubmitButton>
                    </div>
                </form>
            ) : step === 2 ? (
                <form onSubmit={verifyCode} className="space-y-5" noValidate>
                    <p className="text-sm text-slate-600">
                        Enter the 6-digit code we sent to <span className="font-semibold text-slate-900">{sentTo.where || 'your mobile number'}</span>. It expires in 10 minutes.
                    </p>
                    <TextField label="6-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000"
                        className="eco-input text-center font-mono text-lg tracking-[0.5em]"
                        value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
                    <SubmitButton loading={loading} loadingText="Checking…" disabled={otp.length !== 6}>
                        Verify code
                    </SubmitButton>
                    <p className="text-center text-sm text-slate-600">
                        Didn&apos;t get it? Wait a minute, then{' '}
                        <button type="button" onClick={sendCode} disabled={loading} className="eco-link disabled:opacity-50">send a new code</button>
                    </p>
                </form>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                    <BarangaySelect
                        label={isResident ? 'Your barangay' : 'Assigned barangay'}
                        value={form.barangay}
                        onChange={set('barangay')}
                        hint={isResident ? 'You will see events and rewards for this barangay.' : undefined}
                    />

                    {isResident && (
                        <div>
                            <span className="eco-label">Valid ID photo</span>
                            {idImage ? (
                                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <img src={preview} alt="Selected ID preview" className="w-14 h-14 rounded-md object-cover border border-slate-200" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-slate-800 truncate">{idImage.name}</p>
                                        <p className="text-xs text-slate-500">{(idImage.size / (1024 * 1024)).toFixed(1)} MB</p>
                                    </div>
                                    <button type="button" onClick={clearFile} className="p-2 text-slate-400 hover:text-red-600 rounded-md" aria-label="Remove photo">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center cursor-pointer hover:border-brand-600 hover:bg-brand-50/40 transition-colors focus-within:ring-4 focus-within:ring-brand-600/10">
                                    <ImagePlus className="w-6 h-6 text-slate-400" aria-hidden="true" />
                                    <span className="text-sm font-medium text-slate-700">Upload a clear photo of your ID</span>
                                    <span className="text-xs text-slate-500">JPG, PNG or WEBP · up to {MAX_UPLOAD_MB} MB</span>
                                    <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="sr-only"
                                        onChange={(e) => pickFile(e.target.files?.[0])} />
                                </label>
                            )}
                            <p className="mt-1.5 text-xs text-slate-500">Only your barangay officials can view this to verify your residency.</p>
                        </div>
                    )}

                    <label className="flex items-start gap-3 text-sm text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600/30" />
                        <span>
                            I agree to EcoConnect collecting my name, contact details{isResident ? ' and ID photo' : ''} under the{' '}
                            <button type="button" onClick={() => setShowPrivacy(true)} className="eco-link">Data Privacy Policy</button>.
                        </span>
                    </label>

                    <div className="pt-1">
                        <SubmitButton loading={loading} loadingText="Creating account…" disabled={!consent || (isResident && !idImage)}>
                            Create account
                        </SubmitButton>
                    </div>
                </form>
            )}

            <DataPrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)}
                onAccept={() => { setConsent(true); setShowPrivacy(false); }} />
        </AuthLayout>
    );
}
