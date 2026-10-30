import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, FileSpreadsheet, Users } from 'lucide-react';
import { SimplePage, Spinner, EmptyState, Avatar } from '../components/ui';
import { toast } from '../lib/toast';
import { clearSession } from '../lib/api';
import { mediaUrl } from '../lib/media';

export default function ManageParticipants() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);

    const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

    const handleUnauthorized = () => {
        clearSession();
        toast('Your session expired. Please sign in again.', 'error');
        navigate('/login-Barangay');
    };

    const fetchParticipants = async () => {
        try {
            const res = await fetch(`/api/events/participants/${eventId}`, { headers: authHeaders() });
            if (res.status === 401) return handleUnauthorized();
            const data = await res.json();
            if (res.ok) setParticipants(Array.isArray(data) ? data : []);
            else toast(data.message || 'Could not load participants', 'error');
        } catch {
            toast('Cannot connect to the server.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchParticipants();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId]);

    const verifyAttendance = async (participation) => {
        if (busyId) return;
        setBusyId(participation.id);
        try {
            const res = await fetch(`/api/events/verify/${participation.id}`, { method: 'POST', headers: authHeaders() });
            if (res.status === 401) return handleUnauthorized();
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                toast(`Attendance verified for ${participation.user.username}`, 'success');
                fetchParticipants();
            } else toast(data.message || 'Could not verify attendance', 'error');
        } catch {
            toast('Cannot connect to the server.', 'error');
        } finally {
            setBusyId(null);
        }
    };

    const handleExport = async () => {
        try {
            const res = await fetch(`/api/events/${eventId}/participants/export`, { headers: authHeaders() });
            if (res.status === 401) return handleUnauthorized();
            if (!res.ok) return toast('Export failed', 'error');
            const url = window.URL.createObjectURL(await res.blob());
            const a = document.createElement('a');
            a.href = url;
            a.download = `Participants_Event_${eventId}_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch {
            toast('Cannot connect to the server.', 'error');
        }
    };

    const attended = participants.filter((p) => p.status === 'attended').length;

    return (
        <SimplePage
            title="Participants"
            subtitle={loading ? 'Verify attendance to award points.' : `${participants.length} joined · ${attended} attended. Verify attendance to award points.`}
            backTo="/admin"
            backLabel="Back to dashboard"
            actions={<button onClick={handleExport} className="eco-btn eco-btn-outline"><FileSpreadsheet className="h-4 w-4" /> Export to Excel</button>}
        >
            {loading ? <Spinner /> : participants.length === 0 ? (
                <EmptyState icon={<Users className="h-5 w-5" />} title="No participants yet" text="Residents who join this event will appear here." />
            ) : (
                <ul className="eco-card divide-y divide-slate-100">
                    {participants.map((p) => (
                        <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                            <Avatar src={mediaUrl(p.user.profile_picture)} name={p.user.username} />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-900">{p.user.username}</p>
                                <p className="eco-meta">{p.status === 'attended' ? `Verified ${p.verified_at || ''}` : 'Joined, not yet verified'}</p>
                            </div>
                            {p.status === 'attended' ? (
                                <span className="eco-badge eco-badge-green"><CheckCircle2 className="h-3.5 w-3.5" /> Attended</span>
                            ) : (
                                <button onClick={() => verifyAttendance(p)} disabled={busyId === p.id} className="eco-btn eco-btn-green eco-btn-sm">
                                    {busyId === p.id ? 'Verifying…' : 'Mark attended'}
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </SimplePage>
    );
}
