import { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import { Avatar, EmptyState, Spinner } from './ui';
import { titleFor } from '../lib/titles';
import { mediaUrl } from '../lib/media';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardList({ currentUser }) {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        fetch('/api/events/leaderboard', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
            .then((res) => res.json())
            .then((data) => setLeaders(Array.isArray(data) ? data : []))
            .catch(() => setLeaders([]))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div>
            {currentUser?.barangay && <p className="mb-4 text-sm text-slate-500">Residents of Barangay {currentUser.barangay}</p>}

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
                                        {leader.title || titleFor(leader.points) || 'No title yet'}
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
