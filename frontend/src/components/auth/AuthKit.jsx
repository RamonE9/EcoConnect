import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Eye, EyeOff, AlertCircle, Loader2, ChevronDown } from 'lucide-react';
import DataPrivacyModal from '../DataPrivacyModal';
import ThemeToggle from '../ThemeToggle';
import { URBAN_BARANGAYS, RURAL_BARANGAYS } from '../../data/barangays';
import { passwordScore } from './validation';


export function AuthLayout({ title, subtitle, children, footer, back, aside }) {
    const [showPrivacy, setShowPrivacy] = useState(false);

    return (
        <div className="min-h-screen bg-white flex flex-col">
            <header className="px-5 sm:px-8 pt-6 flex items-center justify-between">
                <Link to="/landing" className="inline-flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20">
                    <span className="grid place-items-center w-9 h-9 rounded-lg bg-brand-700 text-white">
                        <Leaf className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <span className="text-base font-bold tracking-tight text-slate-900">EcoConnect</span>
                </Link>
                <div className="flex items-center gap-3">
                    {back}
                    <ThemeToggle />
                </div>
            </header>

            <main className="flex-1 flex items-start sm:items-center justify-center px-5 py-10">
                <div className={aside ? 'grid w-full max-w-[400px] items-center gap-10 lg:max-w-[920px] lg:grid-cols-[400px_1fr] lg:gap-16' : 'w-full max-w-[400px]'}>
                <div className="w-full">
                    <div className="text-center mb-8">
                        <h1 className="text-[28px] sm:text-[32px] leading-tight font-bold tracking-tight text-slate-900">{title}</h1>
                        {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
                    </div>
                    {children}
                    {footer && <div className="mt-6 text-center text-sm text-slate-600">{footer}</div>}
                </div>
                {aside}
                </div>
            </main>

            <footer className="px-5 pb-8 text-center text-xs leading-relaxed text-slate-500">
                By continuing you agree to our{' '}
                <button type="button" onClick={() => setShowPrivacy(true)} className="eco-link font-medium">
                    Terms &amp; Data Privacy Policy
                </button>
                <br className="hidden sm:block" /> in line with the Data Privacy Act of 2012 (RA 10173).
            </footer>

            <DataPrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} onAccept={() => setShowPrivacy(false)} />
        </div>
    );
}

export function Divider({ label = 'OR' }) {
    return (
        <div className="flex items-center gap-3 my-6" role="separator">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-400">{label}</span>
            <span className="h-px flex-1 bg-slate-200" />
        </div>
    );
}

export function FormError({ message }) {
    if (!message) return null;
    return (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 mb-5">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{message}</span>
        </div>
    );
}

export function FormNotice({ message }) {
    if (!message) return null;
    return (
        <div role="status" className="rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-3 text-sm text-brand-800 mb-5">
            {message}
        </div>
    );
}

export function Field({ label, hint, error, aside, children, id }) {
    return (
        <div>
            <div className="flex items-baseline justify-between">
                <label htmlFor={id} className="eco-label">{label}</label>
                {aside}
            </div>
            {children}
            {error ? (
                <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
            ) : hint ? (
                <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
            ) : null}
        </div>
    );
}

export function TextField({ label, hint, error, aside, ...inputProps }) {
    const id = useId();
    return (
        <Field label={label} hint={hint} error={error} aside={aside} id={id}>
            <input id={id} className="eco-input" aria-invalid={error ? 'true' : undefined} {...inputProps} />
        </Field>
    );
}

export function PasswordField({ label = 'Password', hint, error, aside, ...inputProps }) {
    const id = useId();
    const [visible, setVisible] = useState(false);
    return (
        <Field label={label} hint={hint} error={error} aside={aside} id={id}>
            <div className="relative">
                <input
                    id={id}
                    type={visible ? 'text' : 'password'}
                    className="eco-input pr-11"
                    aria-invalid={error ? 'true' : undefined}
                    {...inputProps}
                />
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    className="absolute inset-y-0 right-0 w-11 grid place-items-center text-slate-400 hover:text-slate-700 rounded-r-lg focus:outline-none focus-visible:text-brand-700"
                    aria-label={visible ? 'Hide password' : 'Show password'}
                >
                    {visible ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
            </div>
        </Field>
    );
}

export function BarangaySelect({ label = 'Barangay', value, onChange, hint }) {
    const id = useId();
    return (
        <Field label={label} hint={hint} id={id}>
            <div className="relative">
                <select id={id} className="eco-input appearance-none pr-10" value={value} onChange={onChange}>
                    <optgroup label="Urban barangays">
                        {URBAN_BARANGAYS.map((b) => <option key={b} value={b}>{b}</option>)}
                    </optgroup>
                    <optgroup label="Rural barangays">
                        {RURAL_BARANGAYS.map((b) => <option key={b} value={b}>{b}</option>)}
                    </optgroup>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
            </div>
        </Field>
    );
}

export function SubmitButton({ loading, loadingText, children, disabled, ...props }) {
    return (
        <button type="submit" className="eco-btn-primary" {...props} disabled={loading || disabled} aria-busy={loading || undefined}>
            {loading ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    {loadingText}
                </>
            ) : children}
        </button>
    );
}

const STRENGTH = [
    { label: 'Too weak', color: 'bg-red-500', text: 'text-red-600' },
    { label: 'Weak', color: 'bg-red-500', text: 'text-red-600' },
    { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-600' },
    { label: 'Good', color: 'bg-brand-500', text: 'text-brand-700' },
    { label: 'Strong', color: 'bg-brand-700', text: 'text-brand-800' },
];

export function PasswordStrength({ password }) {
    if (!password) return null;
    const score = passwordScore(password);
    const level = STRENGTH[score];
    return (
        <div className="mt-2" aria-live="polite">
            <div className="flex gap-1" aria-hidden="true">
                {[1, 2, 3, 4].map((i) => (
                    <span key={i} className={`h-1 flex-1 rounded-full ${i <= score ? level.color : 'bg-slate-200'}`} />
                ))}
            </div>
            <p className={`mt-1 text-xs font-medium ${level.text}`}>Password strength: {level.label}</p>
        </div>
    );
}
