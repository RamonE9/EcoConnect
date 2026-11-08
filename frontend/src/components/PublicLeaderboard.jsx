import { useCallback, useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { Avatar } from './ui';
import { URBAN_BARANGAYS } from '../data/barangays';
import { mediaUrl } from '../lib/media';
import { displayName } from '../lib/names';
import { titleFor } from '../lib/titles';
import { useAutoRefresh } from '../lib/useAutoRefresh';

const MEDALS = ['🥇', '🥈', '🥉'];
const SHOWN = 5;

export default function PublicLeaderboard() {
    const [barangay, setBarangay] = useState(URBAN_BARANGAYS[0]);
    const [leaders, setLeaders] = useState(null);

    const load = useCallback(async () => {
        const res = await fetch(`/api/events/leaderboard?barangay=${encodeURIComponent(barangay)}`);
        const data = await res.json().catch(() => null);
        if (Array.isArray(data)) setLeaders(data.slice(0, SHOWN));
    }, [barangay]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/events/leaderboard?barangay=${encodeURIComponent(barangay)}`);
                const data = await res.json().catch(() => []);
                if (!cancelled) setLeaders(Array.isArray(data) ? data.slice(0, SHOWN) : []);
            } catch {
                if (!cancelled) setLeaders([]);
            }
        })();
        return () => { cancelled = true; };
    }, [barangay]);

    const pick = (name) => {
        if (name === barangay) return;
        setLeaders(null);
        setBarangay(name);
    };
    useAutoRefresh(load, 60000);

    return (
        <section aria-labelledby="public-leaderboard" className="rounded-2xl border border-slate-200 bg-white p-5 dark:bg-slate-900">
            <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-brand-700" aria-hidden="true" />
                <h2 id="public-leaderboard" className="text-base font-bold tracking-tight text-slate-900">Top eco-heroes</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">Residents with the most Eco-Points in each barangay.</p>

            <div className="mt-4 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Choose a barangay">
                {URBAN_BARANGAYS.map((name) => (
                    <button key={name} type="button" role="tab" aria-selected={barangay === name} onClick={() => pick(name)}
                        className={`h-8 flex-1 rounded-md px-2 text-xs font-semibold transition-colors ${barangay === name ? 'border border-slate-200 bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                        {name}
                    </button>
                ))}
            </div>

            <div className="mt-3 min-h-[200px]">
                {leaders === null ? (
                    <p className="py-16 text-center text-sm text-slate-500">Loading rankings…</p>
                ) : leaders.length === 0 ? (
                    <p className="py-16 text-center text-sm text-slate-500">No rankings yet in {barangay}. Join a cleanup drive and be the first!</p>
                ) : (
                    <ol className="divide-y divide-slate-100">
                        {leaders.map((leader, index) => (
                            <li key={leader.id} className="flex items-center gap-3 py-2.5">
                                <span className="w-7 shrink-0 text-center text-sm font-semibold text-slate-500">{MEDALS[index] || `#${index + 1}`}</span>
                                <Avatar src={mediaUrl(leader.profile_picture)} name={displayName(leader)} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-slate-900">{displayName(leader)}</p>
                                    <p className="truncate eco-meta">{leader.title || titleFor(leader.points) || 'No title yet'}</p>
                                </div>
                                <span className="text-sm font-bold text-brand-800">{leader.points} pts</span>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </section>
    );
}
