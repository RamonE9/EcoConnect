import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Shield, ArrowRight, CalendarCheck, Award, MapPin } from 'lucide-react';
import DataPrivacyModal from '../components/DataPrivacyModal';
import ThemeToggle from '../components/ThemeToggle';

function readAcknowledged() {
    try {
        return Boolean(localStorage.getItem('ecoconnect_privacy_acknowledged'));
    } catch {
        return true;
    }
}

const PORTALS = [
    {
        to: '/login-Residence',
        icon: Leaf,
        title: 'I’m a resident',
        text: 'Join cleanup drives, earn Eco-Points and redeem rewards.',
    },
    {
        to: '/login-Barangay',
        icon: Shield,
        title: 'I’m a barangay official',
        text: 'Create events, verify residents and manage rewards.',
    },
];

const FEATURES = [
    { icon: CalendarCheck, text: 'Community cleanup events' },
    { icon: Award, text: 'Points, titles and rewards' },
    { icon: MapPin, text: 'Event map for Puerto Princesa' },
];

export default function Landing() {
    const [showPrivacy, setShowPrivacy] = useState(() => !readAcknowledged());

    const acceptPrivacy = () => {
        try {
            localStorage.setItem('ecoconnect_privacy_acknowledged', 'true');
        } catch {
            /* storage unavailable: just close */
        }
        setShowPrivacy(false);
    };

    return (
        <div className="min-h-screen bg-white flex flex-col">
            <header className="px-5 sm:px-8 pt-6 flex items-center gap-2">
                <span className="grid place-items-center w-9 h-9 rounded-lg bg-brand-700 text-white">
                    <Leaf className="w-5 h-5" aria-hidden="true" />
                </span>
                <span className="text-base font-bold tracking-tight text-slate-900">EcoConnect</span>
                <ThemeToggle className="ml-auto" />
            </header>

            <main className="flex-1 flex items-start sm:items-center justify-center px-5 py-12">
                <div className="w-full max-w-[440px]">
                    <div className="text-center">
                        <h1 className="text-[30px] sm:text-[36px] leading-tight font-bold tracking-tight text-slate-900">
                            Clean, connect and earn together.
                        </h1>
                        <p className="mt-3 text-sm sm:text-base text-slate-500">
                            EcoConnect rewards Puerto Princesa residents for taking part in barangay cleanup drives.
                        </p>
                    </div>

                    <ul className="mt-8 space-y-3">
                        {PORTALS.map(({ to, icon, title, text }) => {
                            const Icon = icon;
                            return (
                            <li key={to}>
                                <Link
                                    to={to}
                                    className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-brand-600 hover:bg-brand-50/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20"
                                >
                                    <span className="grid place-items-center w-11 h-11 shrink-0 rounded-lg bg-brand-50 text-brand-700 group-hover:bg-brand-700 group-hover:text-white transition-colors">
                                        <Icon className="w-5 h-5" aria-hidden="true" />
                                    </span>
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-sm font-semibold text-slate-900">{title}</span>
                                        <span className="block text-sm text-slate-500">{text}</span>
                                    </span>
                                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-700 transition-colors" aria-hidden="true" />
                                </Link>
                            </li>
                            );
                        })}
                    </ul>

                    <div className="flex items-center gap-3 my-8" role="separator">
                        <span className="h-px flex-1 bg-slate-200" />
                        <span className="text-xs font-medium text-slate-400">WHAT YOU CAN DO</span>
                        <span className="h-px flex-1 bg-slate-200" />
                    </div>

                    <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {FEATURES.map(({ icon, text }) => {
                            const Icon = icon;
                            return (
                            <li key={text} className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
                                <Icon className="w-5 h-5 text-brand-700 shrink-0" aria-hidden="true" />
                                {text}
                            </li>
                            );
                        })}
                    </ul>

                    <p className="mt-8 text-center text-sm text-slate-600">
                        New here? <Link to="/signup" className="eco-link">Create a resident account</Link>
                    </p>
                </div>
            </main>

            <footer className="px-5 pb-8 text-center text-xs text-slate-500">
                <button type="button" onClick={() => setShowPrivacy(true)} className="eco-link font-medium">
                    Data Privacy Act (RA 10173) notice
                </button>
                <span className="mx-2 text-slate-300">·</span>
                Puerto Princesa City
            </footer>

            <DataPrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} onAccept={acceptPrivacy} />
        </div>
    );
}
