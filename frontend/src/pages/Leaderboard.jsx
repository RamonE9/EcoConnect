import { useState, useEffect } from 'react';
import { Award, TrendingUp, User, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Leaderboard() {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        fetch('/api/events/leaderboard', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                setLeaders(data);
                setLoading(false);
            })
            .catch(err => console.error(err));
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 p-4">
            <div className="max-w-md mx-auto">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-slate-500 hover:text-green-600 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </button>

                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                    <div className="bg-green-600 p-8 text-white text-center">
                        <Award className="w-12 h-12 mx-auto mb-2 opacity-80" />
                        <h1 className="text-2xl font-bold">Eco Warriors</h1>
                        <p className="text-green-100 text-sm">Top contributors in Puerto Princesa</p>
                    </div>

                    <div className="p-6">
                        {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {leaders.map((leader, index) => (
                                    <div
                                        key={leader.id}
                                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all
                      ${index === 0 ? 'bg-yellow-50 border-yellow-200 ring-2 ring-yellow-200' : 'bg-slate-50 border-slate-100'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                        ${index === 0 ? 'bg-yellow-400 text-white' :
                                                    index === 1 ? 'bg-slate-300 text-white' :
                                                        index === 2 ? 'bg-orange-300 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                {index + 1}
                                            </span>
                                            <div>
                                                <p className="font-bold text-slate-800">{leader.username}</p>
                                                <p className="text-[10px] text-slate-400 uppercase tracking-widest">{leader.role}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-green-600">{leader.points}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">POINTS</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
