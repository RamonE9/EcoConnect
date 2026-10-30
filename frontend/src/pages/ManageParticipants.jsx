import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, FileSpreadsheet, QrCode, Users } from 'lucide-react';
import { SimplePage, Spinner, EmptyState, Avatar, StatCard } from '../components/ui';
import ScanAttendanceModal from '../components/ScanAttendanceModal';
import { toast } from '../lib/toast';
import { clearSession } from '../lib/api';
import { mediaUrl } from '../lib/media';

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function ManageParticipants() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [exporting, setExporting] = useState(false);

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
        fetch('/api/events/', { headers: authHeaders() })
            .then((res) => (res.ok ? res.json() : []))
            .then((list) => setEvent((Array.isArray(list) ? list : []).find((e) => e.id === parseInt(eventId)) || null))
            .catch(() => {});
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
        setExporting(true);
        try {
            const res = await fetch(`/api/events/${eventId}/participants/export`, { headers: authHeaders() });
            if (res.status === 401) return handleUnauthorized();
            if (!res.ok) return toast('Export failed', 'error');
            const match = /filename="?([^"]+)"?/.exec(res.headers.get('Content-Disposition') || '');
            const url = window.URL.createObjectURL(await res.blob());
            const a = document.createElement('a');
            a.href = url;
            a.download = match ? match[1] : `Attendance_Event_${eventId}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            toast('Cannot connect to the server.', 'error');
        } finally {
            setExporting(false);
        }
    };

    const attended = participants.filter((p) => p.status === 'attended');
    const walkIns = participants.filter((p) => p.walk_in).length;
    const sorted = [...participants].sort((a, b) => (a.status === 'attended') - (b.status === 'attended') || a.user.username.localeCompare(b.user.username));

    return (
        <SimplePage
            title={event ? event.title : 'Participants'}
            subtitle={event ? `${event.date} · ${event.time} · +${event.points_reward} pts per attendee` : 'Check residents in to award their points.'}
            backTo="/admin"
            backLabel="Back to dashboard"
            actions={
                <div className="flex flex-wrap gap-2">
                    <button onClick={handleExport} disabled={exporting} className="eco-btn eco-btn-outline">
                        <FileSpreadsheet className="h-4 w-4" /> {exporting ? 'Preparing…' : 'Export attendance'}
                    </button>
                    <button onClick={() => setScanning(true)} disabled={!event} className="eco-btn eco-btn-green">
                        <QrCode className="h-4 w-4" /> Scan attendance
                    </button>
                </div>
            }
        >
            <div className="mb-6 grid grid-cols-3 gap-3">
                <StatCard icon={<Users className="h-5 w-5" />} label="Registered" value={participants.length - walkIns} />
                <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Attended" value={attended.length} />
                <StatCard icon={<QrCode className="h-5 w-5" />} label="Walk-ins" value={walkIns} />
            </div>

            {loading ? <Spinner /> : participants.length === 0 ? (
                <EmptyState icon={<Users className="h-5 w-5" />} title="No participants yet"
                    text="Residents who join will appear here. You can also scan walk-ins at the event."
                    action={event && <button onClick={() => setScanning(true)} className="eco-btn eco-btn-green"><QrCode className="h-4 w-4" /> Scan attendance</button>} />
            ) : (
                <ul className="eco-card divide-y divide-slate-100">
                    {sorted.map((p) => (
                        <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                            <Avatar src={mediaUrl(p.user.profile_picture)} name={p.user.username} />
                            <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-900">
                                    <span className="truncate">{p.user.username}</span>
                                    {p.walk_in && <span className="eco-badge eco-badge-blue">Walk-in</span>}
                                </p>
                                <p className="eco-meta">
                                    {p.status === 'attended'
                                        ? `Checked in ${p.attended_at ? new Date(p.attended_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : p.verified_at || ''} · ${p.checkin_method === 'qr' ? 'QR scan' : 'manual'}`
                                        : 'Registered, not checked in yet'}
                                </p>
                            </div>
                            {p.status === 'attended' ? (
                                <span className="eco-badge eco-badge-green"><CheckCircle2 className="h-3.5 w-3.5" /> Attended</span>
                            ) : (
                                <button onClick={() => verifyAttendance(p)} disabled={busyId === p.id} className="eco-btn eco-btn-outline eco-btn-sm" title="Use if the resident can't show their QR code">
                                    {busyId === p.id ? 'Saving…' : 'Mark attended'}
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {scanning && event && <ScanAttendanceModal event={event} onClose={() => setScanning(false)} onCheckedIn={fetchParticipants} />}
        </SimplePage>
    );
}
