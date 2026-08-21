import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, CheckCircle, Clock, ArrowLeft, Users, FileText } from 'lucide-react';

export default function ManageParticipants() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchParticipants();
    }, [eventId]);

    const handleUnauthorized = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        alert('Session expired. Please login again.');
        const user = JSON.parse(localStorage.getItem('user'));
        if (user?.role === 'admin') navigate('/login-Barangay');
        else navigate('/login-Residence');
    };

    const fetchParticipants = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/events/participants/${eventId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) return handleUnauthorized();
            const data = await res.json();
            setParticipants(data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const verifyAttendance = async (participationId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/events/verify/${participationId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) return handleUnauthorized();
            if (res.ok) {
                fetchParticipants();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleExportParticipants = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/events/${eventId}/participants/export`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) return handleUnauthorized();

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Participants_Event_${eventId}_${new Date().toISOString().split('T')[0]}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                alert('Export failed.');
            }
        } catch (error) {
            console.error('Export Error:', error);
            alert('Network Error during export.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4">
            <div className="max-w-2xl mx-auto">
                <button
                    onClick={() => {
                        const user = JSON.parse(localStorage.getItem('user'));
                        if (user?.role === 'admin') navigate('/admin');
                        else navigate('/dashboard');
                    }}
                    className="flex items-center gap-2 text-slate-500 hover:text-green-600 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </button>

                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                    <div className="bg-blue-600 p-6 text-white flex items-center gap-4">
                        <div className="bg-blue-500 p-3 rounded-xl">
                            <Users className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Manage Participants</h1>
                            <p className="text-blue-100 text-xs">Verify attendance to award points</p>
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-600">
                            {participants.length} Resident(s) Joined
                        </span>
                        <button
                            onClick={handleExportParticipants}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-lg shadow-green-900/10 transition-all active:scale-95"
                        >
                            <FileText className="w-4 h-4" /> Export to Excel
                        </button>
                    </div>

                    <div className="p-6">
                        {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            </div>
                        ) : participants.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No participants joined yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {participants.map((p) => (
                                    <div key={p.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-slate-100 p-2 rounded-full">
                                                <User className="w-5 h-5 text-slate-500" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{p.user.username}</p>
                                                <p className="text-[10px] text-slate-400 uppercase">{p.status}</p>
                                            </div>
                                        </div>

                                        {p.status === 'attended' ? (
                                            <div className="flex items-center gap-2 text-green-600 text-xs font-bold bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                                                <CheckCircle className="w-4 h-4" /> Verified
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => verifyAttendance(p.id)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-4 rounded-lg shadow-md transition-all active:scale-95"
                                            >
                                                Verify Now
                                            </button>
                                        )}
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
