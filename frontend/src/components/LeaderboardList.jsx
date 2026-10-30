import { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import { Avatar, EmptyState, Spinner } from './ui';
import { titleFor } from '../lib/titles';
import { mediaUrl } from '../lib/media';

const MEDALS = ['🥇', '🥈', '🥉'];

/** Ranked residents for the viewer's barangay, or all barangays. */
export default function LeaderboardList({ currentUser }) {
    const [scope, setScope] = useState('mine');
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const query = scope === 'all' ? '?barangay=All' : '';
        fetch(`/api/events/leaderboard${query}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
            .then((res) => res.json())
            .then((data) => setLeaders(Array.isArray(data) ? data : []))
            .catch(() => setLeaders([]))
            .finally(() => setLoading(false));
    }, [scope]);

    return (
        <div>
            <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Leaderboard scope">
                {[['mine', currentUser?.barangay ? `Brgy. ${currentUser.barangay}` : 'My barangay'], ['all', 'All barangays']].map(([key, label]) => (
                    <button key={key} role="tab" aria-selected={scope === key} onClick={() => { if (key !== scope) { setLoading(true); setScope(key); } }}
                        className={`h-9 flex-1 truncate rounded-md px-3 text-sm font-semibold transition-colors ${scope === key ? 'border border-slate-200 bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {loading ? <Spinner /> : leaders.length === 0 ? (
                <EmptyState icon={<Award className="h-5 w-5" />} title="No rankings yet" text="Join a cleanup drive and be the first on the board." />
            ) : (
                <ol className="eco-card divide-y divide-slate-100">
                    {leaders.map((leader, index) => {
                        const isMe = currentUser && leader.id === currentUser.id;
                        return (
                            <li key={leader.id} className={`flex items-center gap-3 px-4 py-3 ${isMe ? 'bg-brand-50/60' : ''}`}>
                                <span className="w-8 shrink-0 text-center text-sm font-semibold text-slate-500">{MEDALS[index] || `#${index + 1}`}</span>
                                <Avatar src={mediaUrl(leader.profile_picture)} name={leader.username} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-slate-900">
                                        {leader.username}{isMe && <span className="ml-1.5 font-normal text-slate-500">(you)</span>}
                                    </p>
                                    <p className="truncate eco-meta">
                                        {titleFor(leader.points) || 'No title yet'}{scope === 'all' && leader.barangay ? ` · ${leader.barangay}` : ''}
                                    </p>
                                </div>
                                <span className="text-sm font-bold text-brand-800">{leader.points} pts</span>
                            </li>
                        );
                    })}
                </ol>
            )}
        </div>
    );
}
