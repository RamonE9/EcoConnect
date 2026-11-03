import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

/**
 * Shows a resident's valid ID. IDs are stored privately, so this asks the
 * server for a link that expires after a few minutes (only the resident and
 * their barangay's officials are allowed one).
 */
export default function IdImage({ userId, alt = 'Valid ID' }) {
    const [state, setState] = useState({ loading: true, url: null, error: '' });

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/auth/users/${userId}/id-image`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
            .then(async (res) => {
                const data = await res.json().catch(() => ({}));
                if (cancelled) return;
                if (res.ok) setState({ loading: false, url: data.url, error: data.url ? '' : 'No ID uploaded' });
                else setState({ loading: false, url: null, error: data.message || 'Could not load the ID' });
            })
            .catch(() => !cancelled && setState({ loading: false, url: null, error: 'Cannot connect to the server' }));
        return () => { cancelled = true; };
    }, [userId]);

    if (state.loading) {
        return <div className="grid aspect-[1.58/1] place-items-center rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-400">Loading ID…</div>;
    }
    if (!state.url) {
        return <div className="grid aspect-[1.58/1] place-items-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400">{state.error}</div>;
    }
    return (
        <div>
            <a href={state.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-slate-200">
                <img src={state.url} alt={alt} className="aspect-[1.58/1] w-full object-cover" />
            </a>
            <p className="mt-1.5 flex items-center gap-1 eco-meta">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-700" /> Private · this link expires in a few minutes
            </p>
        </div>
    );
}
