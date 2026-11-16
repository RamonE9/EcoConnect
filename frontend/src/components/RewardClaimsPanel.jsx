import { useEffect, useState } from 'react';
import { History, Search, X } from 'lucide-react';
import { EmptyState, Spinner } from './ui';
import { buildQuery } from '../lib/download';

const TABS = [
    ['Pending', 'Reserved'],
    ['Claimed', 'Released'],
    ['Rejected', 'Rejected'],
    ['', 'All'],
];
const BADGE = { Claimed: 'eco-badge-green', Rejected: 'eco-badge-red', Pending: 'eco-badge-amber' };
const LABEL = { Claimed: 'Released', Pending: 'Reserved', Rejected: 'Rejected' };

function useDebounced(value, delay = 350) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}

function day(value) {
    return value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
}

export default function RewardClaimsPanel({ refreshKey, busyId, onDecision }) {
    const [status, setStatus] = useState('Pending');
    const [text, setText] = useState('');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [claims, setClaims] = useState(null);
    const [error, setError] = useState('');
    const query = useDebounced(text);
    const rangeError = start && end && start > end ? 'The start date must be on or before the end date.' : '';

    useEffect(() => {
        if (rangeError) return undefined;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/finance/redemption/history${buildQuery({ status, q: query, start, end })}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                const data = await res.json().catch(() => null);
                if (cancelled) return;
                if (!res.ok) { setError(data?.message || 'Could not load claims.'); return; }
                setError('');
                setClaims(Array.isArray(data) ? data : []);
            } catch {
                if (!cancelled) setError('Cannot connect to the server.');
            }
        })();
        return () => { cancelled = true; };
    }, [status, query, start, end, refreshKey, rangeError]);

    const filtering = Boolean(text || start || end);
    const dateLabel = status === 'Claimed' ? 'Released' : 'Reserved';

    return (
        <div>
            <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
                {TABS.map(([key, label]) => (
                    <button key={label} type="button" onClick={() => setStatus(key)} aria-pressed={status === key}
                        className={`eco-btn eco-btn-sm ${status === key ? 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-brand-700 dark:hover:bg-brand-800' : 'eco-btn-outline'}`}>
                        {label}
                    </button>
                ))}
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
                <label className="relative block">
                    <span className="sr-only">Search by resident or reward</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input type="search" className="eco-input h-10 pl-9" placeholder="Search resident or reward"
                        value={text} onChange={(e) => setText(e.target.value)} />
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="shrink-0">{dateLabel} from</span>
                    <input type="date" className="eco-input h-10" value={start} max={end || undefined} onChange={(e) => setStart(e.target.value)} />
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="shrink-0">to</span>
                    <input type="date" className="eco-input h-10" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} />
                </label>
            </div>
            {filtering && (
                <button type="button" onClick={() => { setText(''); setStart(''); setEnd(''); }} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900">
                    <X className="h-3.5 w-3.5" /> Clear search
                </button>
            )}

            {rangeError || error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{rangeError || error}</p>
            ) : claims === null ? <Spinner /> : claims.length === 0 ? (
                <EmptyState icon={<History className="h-5 w-5" />}
                    title={filtering ? 'No claims match your search' : `No ${(LABEL[status] || 'claims').toLowerCase()} claims`} />
            ) : (
                <>
                    <p className="mb-2 eco-meta">{claims.length} {claims.length === 1 ? 'claim' : 'claims'}{claims.length >= 200 ? ' (showing the latest 200; narrow the search to see more)' : ''}</p>
                    <ul className="eco-card divide-y divide-slate-100">
                        {claims.map((r) => (
                            <li key={r.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900">{(r.quantity || 1) > 1 ? `${r.quantity} × ` : ''}{r.item_name}</p>
                                    <p className="eco-meta">{r.full_name || r.username} · {r.points_spent} pts{r.claim_code ? ` · ${r.claim_code}` : ''}</p>
                                    <p className="eco-meta">
                                        Reserved {day(r.timestamp)}
                                        {r.status === 'Claimed' && ` · Released ${day(r.claimed_at)}${r.claimed_by_name ? ` by ${r.claimed_by_name}` : ''}`}
                                    </p>
                                </div>
                                {r.status === 'Pending' ? (
                                    <div className="flex items-center gap-2">
                                        <span className="eco-badge eco-badge-amber">Reserved</span>
                                        <button disabled={busyId === r.id} onClick={() => onDecision(r.id, 'reject')} className="eco-btn eco-btn-danger eco-btn-sm">Reject</button>
                                        <button disabled={busyId === r.id} onClick={() => onDecision(r.id, 'approve')} className="eco-btn eco-btn-green eco-btn-sm">Release</button>
                                    </div>
                                ) : (
                                    <span className={`eco-badge ${BADGE[r.status] || 'eco-badge-slate'}`}>{LABEL[r.status] || r.status}</span>
                                )}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}
