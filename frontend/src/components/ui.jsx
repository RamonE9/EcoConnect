import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Leaf, LogOut, Menu, ChevronDown, ArrowLeft } from 'lucide-react';
import ThemeToggle from './ThemeToggle';


const openModals = [];

export function Modal({ title, subtitle, onClose, children, footer, size = 'md' }) {
    const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };
    const modalId = useId();
    const [layer] = useState(() => openModals.length);

    useEffect(() => {
        openModals.push(modalId);
        return () => openModals.splice(openModals.indexOf(modalId), 1);
    }, [modalId]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape' && openModals[openModals.length - 1] === modalId) onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose, modalId]);

    return (
        <div
            className="fixed inset-0 flex items-end sm:items-center justify-center bg-slate-900/40 p-0 sm:p-4"
            style={{ zIndex: 1001 + layer }}
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div className={`flex w-full ${widths[size]} max-h-[92vh] flex-col overflow-hidden rounded-t-2xl sm:rounded-xl border border-slate-200 bg-white shadow-xl`}>
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>
                        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
                    </div>
                    <button type="button" onClick={onClose} className="eco-icon-btn -mr-2 shrink-0" aria-label="Close">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
                {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:px-6">{footer}</div>}
            </div>
        </div>
    );
}

export function StatCard({ icon, label, value, hint, alert = false }) {
    return (
        <div className={`eco-card h-full p-4 sm:p-5 ${alert ? 'border-red-200' : ''}`}>
            <div className="flex items-start justify-between gap-2">
                <p className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                    {alert && <span className="h-2 w-2 shrink-0 rounded-full bg-red-600" aria-label="Needs attention" />}
                    {label}
                </p>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 sm:h-9 sm:w-9">{icon}</span>
            </div>
            <p className={`mt-2 text-2xl font-bold tracking-tight sm:mt-3 sm:text-3xl ${alert ? 'text-red-600' : 'text-slate-900'}`}>{value}</p>
            {hint && <p className="mt-1 eco-meta">{hint}</p>}
        </div>
    );
}

export function EmptyState({ icon, title, text, action }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
            {icon && <span className="mb-3 grid h-11 w-11 place-items-center rounded-lg bg-white text-slate-400 border border-slate-200">{icon}</span>}
            <p className="text-sm font-semibold text-slate-800">{title}</p>
            {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

export function SectionHeader({ title, subtitle, action }) {
    return (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
                <h2 className="eco-section-title">{title}</h2>
                {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

export function Avatar({ src, name, size = 'md' }) {
    const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-16 w-16 text-lg', xl: 'h-24 w-24 text-2xl' };
    return (
        <span className={`${sizes[size]} inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-brand-50 font-semibold text-brand-800 border border-slate-200`}>
            {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : (name || '?').charAt(0).toUpperCase()}
        </span>
    );
}

export function Spinner({ label = 'Loading…' }) {
    return (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500" role="status">
            <span className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-brand-700 animate-spin" aria-hidden="true" />
            {label}
        </div>
    );
}


export function InputField({ label, hint, className = '', ...props }) {
    const id = useId();
    return (
        <div className={className}>
            {label && <label htmlFor={id} className="eco-label">{label}</label>}
            <input id={id} className="eco-input" {...props} />
            {hint && <p className="mt-1.5 eco-meta">{hint}</p>}
        </div>
    );
}

export function TextAreaField({ label, hint, className = '', ...props }) {
    const id = useId();
    return (
        <div className={className}>
            {label && <label htmlFor={id} className="eco-label">{label}</label>}
            <textarea id={id} className="eco-textarea" {...props} />
            {hint && <p className="mt-1.5 eco-meta">{hint}</p>}
        </div>
    );
}

export function SelectField({ label, hint, className = '', children, ...props }) {
    const id = useId();
    return (
        <div className={className}>
            {label && <label htmlFor={id} className="eco-label">{label}</label>}
            <div className="relative">
                <select id={id} className="eco-input appearance-none pr-10" {...props}>{children}</select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            </div>
            {hint && <p className="mt-1.5 eco-meta">{hint}</p>}
        </div>
    );
}


export function AppShell({ nav, user, roleLabel, onLogout, mobileOpen, setMobileOpen, title, subtitle, actions, children, photoSrc, homeTo = '/dashboard', showFooterLogout = true }) {
    const hasAlerts = nav.some((item) => item.badge > 0);
    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">
            {mobileOpen && <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setMobileOpen(false)} />}

            <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white lg:static ${mobileOpen ? 'flex' : 'hidden lg:flex'}`}>
                <div className="flex h-16 items-center justify-between px-5">
                    <Link to={homeTo} className="inline-flex items-center gap-2" aria-label="Go to my dashboard">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-700 text-white">
                            <Leaf className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="text-base font-bold tracking-tight text-slate-900">EcoConnect</span>
                    </Link>
                    <button className="eco-icon-btn lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3" aria-label="Main">
                    {nav.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => { item.onClick(); setMobileOpen(false); }}
                            aria-current={item.active ? 'page' : undefined}
                            className={`${item.desktopOnly ? 'hidden lg:flex' : 'flex'} w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${item.danger ? 'font-medium text-red-600 hover:bg-red-50' : item.active ? 'bg-brand-50 font-semibold text-brand-800' : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                        >
                            <span className={item.danger ? 'text-red-600' : item.active ? 'text-brand-700' : 'text-slate-400'}>{item.icon}</span>
                            <span className="flex-1 text-left">{item.label}</span>
                            {item.badge > 0 && (
                                <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white" aria-label={`${item.badge} need attention`}>
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="border-t border-slate-200 p-3">
                    <div className="flex items-center gap-3 rounded-lg px-2 py-2">
                        <Avatar src={photoSrc} name={user?.username} />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">{user?.username}</p>
                            <p className="truncate eco-meta">{roleLabel} · {user?.barangay}</p>
                        </div>
                        {showFooterLogout && (
                            <button onClick={onLogout} className="eco-icon-btn hover:text-red-600" aria-label="Sign out" title="Sign out">
                                <LogOut className="h-[18px] w-[18px]" />
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
                    <div className="flex min-w-0 items-center gap-2">
                        <button className="eco-icon-btn relative -ml-2 lg:hidden" onClick={() => setMobileOpen(true)} aria-label={hasAlerts ? 'Open menu (new notifications)' : 'Open menu'}>
                            <Menu className="h-5 w-5" />
                            {hasAlerts && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-white" aria-hidden="true" />}
                        </button>
                        <div className="min-w-0">
                            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">{title}</h1>
                            {subtitle && <p className="hidden truncate text-sm text-slate-500 sm:block">{subtitle}</p>}
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">{actions}<ThemeToggle /></div>
                </header>
                <main className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
                </main>
            </div>
        </div>
    );
}


function homeForStoredUser() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user || !localStorage.getItem('token')) return '/landing';
        return user.role === 'resident' ? '/dashboard' : '/admin';
    } catch {
        return '/landing';
    }
}

export function SimplePage({ title, subtitle, backTo, backLabel = 'Back', actions, width = 'max-w-3xl', children }) {
    return (
        <div className="min-h-screen bg-slate-50">
            <header className="border-b border-slate-200 bg-white">
                <div className={`mx-auto flex h-16 ${width} items-center justify-between px-4 sm:px-6`}>
                    <Link to={homeForStoredUser()} className="inline-flex items-center gap-2">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-700 text-white">
                            <Leaf className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="text-base font-bold tracking-tight text-slate-900">EcoConnect</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        {backTo && (
                            <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
                                <ArrowLeft className="h-4 w-4" /> {backLabel}
                            </Link>
                        )}
                        <ThemeToggle />
                    </div>
                </div>
            </header>
            <main className={`mx-auto ${width} px-4 py-8 sm:px-6`}>
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
                        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
                    </div>
                    {actions}
                </div>
                {children}
            </main>
        </div>
    );
}
