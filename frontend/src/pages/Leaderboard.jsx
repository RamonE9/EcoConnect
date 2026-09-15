import { useState, useEffect } from 'react';
import { Award, TrendingUp, User, ArrowLeft, Trophy, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RANK_STYLES = [
    { bg: 'bg-yellow-50', border: 'border-yellow-200 ring-2 ring-yellow-200', badge: 'bg-yellow-400 text-white', emoji: '🥇' },
    { bg: 'bg-slate-50', border: 'border-slate-200 ring-1 ring-slate-200', badge: 'bg-slate-300 text-white', emoji: '🥈' },
    { bg: 'bg-orange-50', border: 'border-orange-100 ring-1 ring-orange-100', badge: 'bg-orange-300 text-white', emoji: '🥉' },
];

export default function Leaderboard() {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [barangay, setBarangay] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const u = JSON.parse(storedUser);
                setBarangay(u.barangay || '');
            } catch (_) {}
        }

        fetch('/api/events/leaderboard', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                setLeaders(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 p-4">
            <div className="max-w-lg mx-auto">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-slate-500 hover:text-green-600 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </button>

                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                    {/* Header */}
                    <div className="bg-gradient-to-br from-green-600 to-emerald-500 p-8 text-white text-center">
                        <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/30">
                            <Trophy className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight">Eco Warriors</h1>
                        {barangay && (
                            <p className="text-green-100 text-sm font-bold mt-1 uppercase tracking-widest">
                                📍 Brgy. {barangay}
                            </p>
                        )}
                        <p className="text-green-100/80 text-xs mt-1">Top environmental contributors</p>
                    </div>

                    <div className="p-6">
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-3"></div>
                                <p className="text-slate-400 text-sm font-medium">Loading leaderboard...</p>
                            </div>
                        ) : leaders.length === 0 ? (
                            <div className="text-center py-12">
                                <Award className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-400 font-bold">No warriors yet. Be the first!</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {leaders.map((leader, index) => {
                                    const style = RANK_STYLES[index] || { bg: 'bg-slate-50', border: 'border-slate-100', badge: 'bg-slate-200 text-slate-500', emoji: null };
                                    return (
                                        <div
                                            key={leader.id}
                                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${style.bg} ${style.border}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${style.badge}`}>
                                                    {style.emoji || `#${index + 1}`}
                                                </span>
                                                <div>
                                                    <p className="font-black text-slate-800 leading-tight">{leader.username}</p>
                                                    {leader.title ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full mt-0.5">
                                                            <Star className="w-2.5 h-2.5" />
                                                            {leader.title}
                                                        </span>
                                                    ) : (
                                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">{leader.role}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-green-600">{leader.points}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Points</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
