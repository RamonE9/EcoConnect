import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { subscribeToToasts } from '../lib/toast';

/*
 * Lightweight toast notifications that replace blocking alert() popups.
 * Call `toast('Saved!')` (from lib/toast) anywhere; <Toaster /> is mounted once in App.
 */

const STYLES = {
    success: { icon: CheckCircle2, color: 'text-brand-700', bar: 'bg-brand-600' },
    error: { icon: AlertCircle, color: 'text-red-600', bar: 'bg-red-500' },
    info: { icon: Info, color: 'text-slate-600', bar: 'bg-slate-400' },
};

export function Toaster() {
    const [items, setItems] = useState([]);

    useEffect(() => {
        const add = (item) => {
            setItems((current) => [...current.slice(-3), item]);
            setTimeout(() => setItems((current) => current.filter((t) => t.id !== item.id)), 4500);
        };
        return subscribeToToasts(add);
    }, []);

    const dismiss = (id) => setItems((current) => current.filter((t) => t.id !== id));

    return (
        <div
            className="fixed top-4 inset-x-4 sm:inset-x-auto sm:right-4 z-[3000] flex flex-col gap-2 sm:w-96 pointer-events-none"
            role="status"
            aria-live="polite"
        >
            {items.map((item) => {
                const style = STYLES[item.kind] || STYLES.info;
                const Icon = style.icon;
                return (
                    <div
                        key={item.id}
                        className="eco-toast-in pointer-events-auto relative overflow-hidden flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg shadow-slate-900/5"
                    >
                        <span className={`absolute left-0 top-0 bottom-0 w-1 ${style.bar}`} aria-hidden="true" />
                        <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${style.color}`} aria-hidden="true" />
                        <p className="flex-1 text-sm font-medium text-slate-800 leading-snug">{item.text}</p>
                        <button
                            type="button"
                            onClick={() => dismiss(item.id)}
                            className="p-0.5 -mr-1 text-slate-400 hover:text-slate-700 rounded"
                            aria-label="Dismiss notification"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
