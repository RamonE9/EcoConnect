import { useState, useEffect } from 'react';
import { Award } from 'lucide-react';
import { SimplePage, Spinner, EmptyState, Avatar } from '../components/ui';

const MEDALS = ['🥇', '🥈', '🥉'];

function storedUser() {
    try {
        return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
        return null;
    }
}

export default function Leaderboard() {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const user = storedUser();
    const backTo = user && user.role !== 'resident' ? '/admin' : '/dashboard';

    useEffect(() => {
        const token = localStorage.getItem('token');
        fetch('/api/events/leaderboard', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
            .then((res) => res.json())
            .then((data) => setLeaders(Array.isArray(data) ? data : []))
            .catch(() => setLeaders([]))
            .finally(() => setLoading(false));
    }, []);

    return (
        <SimplePage
            title="Leaderboard"
            subtitle={user?.barangay ? `Top contributors in ${user.barangay}.` : 'Top environmental contributors.'}
            backTo={backTo}
            backLabel="Back to dashboard"
            width="max-w-2xl"
        >
            {loading ? <Spinner /> : leaders.length === 0 ? (
                <EmptyState icon={<Award className="h-5 w-5" />} title="No rankings yet" text="Join a cleanup drive and be the first on the board." />
            ) : (
                <ol className="eco-card divide-y divide-slate-100">
                    {leaders.map((leader, index) => {
                        const isMe = user && leader.id === user.id;
                        return (
                            <li key={leader.id} className={`flex items-center gap-3 px-4 py-3 ${isMe ? 'bg-brand-50/60' : ''}`}>
                                <span className="w-8 shrink-0 text-center text-sm font-semibold text-slate-500">
                                    {MEDALS[index] || `#${index + 1}`}
                                </span>
                                <Avatar src={leader.profile_picture ? `/${leader.profile_picture}` : null} name={leader.username} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-slate-900">
                                        {leader.username}{isMe && <span className="ml-1.5 font-normal text-slate-500">(you)</span>}
                                    </p>
                                    <p className="truncate eco-meta">{leader.title || 'No title yet'}</p>
                                </div>
                                <span className="text-sm font-bold text-brand-800">{leader.points} pts</span>
                            </li>
                        );
                    })}
                </ol>
            )}
        </SimplePage>
    );
}
