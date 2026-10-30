import { useState } from 'react';
import { Keyboard } from 'lucide-react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { Modal, Avatar } from './ui';
import QrScanner from './QrScanner';
import { mediaUrl } from '../lib/media';

const TONES = {
    checked_in: { box: 'border-brand-200 bg-brand-50 text-brand-900', icon: CheckCircle2, iconColor: 'text-brand-700' },
    already: { box: 'border-amber-200 bg-amber-50 text-amber-900', icon: Info, iconColor: 'text-amber-600' },
    error: { box: 'border-red-200 bg-red-50 text-red-800', icon: AlertCircle, iconColor: 'text-red-600' },
};

/** Officials scan residents' QR codes to record attendance for one event. */
export default function ScanAttendanceModal({ event, onClose, onCheckedIn }) {
    const [last, setLast] = useState(null);
    const [log, setLog] = useState([]);

    const [code, setCode] = useState('');

    const checkIn = async (payload) => {
        let result;
        try {
            const res = await fetch(`/api/events/${event.id}/check-in`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            result = { ...data, tone: data.result === 'checked_in' ? 'checked_in' : data.result === 'already' ? 'already' : 'error' };
            if (!result.message) result.message = res.ok ? 'Done' : 'Could not check in this code';
        } catch (error) {
            result = { tone: 'error', message: error.message || 'Cannot connect to the server' };
        }
        result.at = new Date();
        setLast(result);
        if (result.result === 'checked_in') {
            setLog((items) => [result, ...items].slice(0, 30));
            onCheckedIn?.();
            navigator.vibrate?.(80);
        }
        return result;
    };

    const handleScan = (token) => checkIn({ token });
    const submitCode = async (e) => {
        e.preventDefault();
        const result = await checkIn({ code });
        if (result.result === 'checked_in' || result.result === 'already') setCode('');
    };

    const tone = last ? TONES[last.tone] : null;
    const ToneIcon = tone?.icon;

    return (
        <Modal title="Scan attendance" subtitle={`${event.title} · +${event.points_reward} pts per attendee`} onClose={onClose} size="md">
            <div className="mx-auto max-w-sm">
                <QrScanner onScan={handleScan} />
                <p className="mt-2 text-center eco-meta">Point the camera at the resident’s event ticket.</p>
                <form onSubmit={submitCode} className="mt-3 flex gap-2">
                    <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={9} placeholder="Or type ticket code, e.g. 7KQ2-M9XD"
                        aria-label="Ticket code" className="eco-input h-10 font-mono uppercase tracking-wider" autoCapitalize="characters" autoComplete="off" />
                    <button type="submit" disabled={code.replace(/[^A-Z0-9]/g, '').length !== 8} className="eco-btn eco-btn-outline h-10 shrink-0"><Keyboard className="h-4 w-4" /> Check in</button>
                </form>
            </div>

            <div className="mt-4 min-h-[64px]" aria-live="assertive">
                {last ? (
                    <div className={`flex items-center gap-3 rounded-xl border p-3 ${tone.box}`}>
                        {last.user ? <Avatar src={mediaUrl(last.user.profile_picture)} name={last.user.username} /> : <ToneIcon className={`h-6 w-6 shrink-0 ${tone.iconColor}`} />}
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">{last.message}</p>
                        </div>
                        {last.user && <ToneIcon className={`h-5 w-5 shrink-0 ${tone.iconColor}`} />}
                    </div>
                ) : (
                    <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">Waiting for a QR code…</p>
                )}
            </div>

            {log.length > 0 && (
                <div className="mt-5">
                    <h3 className="text-sm font-semibold text-slate-900">Checked in this session ({log.length})</h3>
                    <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                        {log.map((item, i) => (
                            <li key={`${item.user?.id}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                                <span className="truncate font-medium text-slate-900">{item.user?.username}</span>
                                <span className="flex shrink-0 items-center gap-2">
                                    <span className="eco-meta">{item.at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Modal>
    );
}
