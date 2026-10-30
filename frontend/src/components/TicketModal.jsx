import { useEffect, useState } from 'react';
import { CheckCircle2, Calendar, MapPin } from 'lucide-react';
import { Modal, Spinner } from './ui';

async function renderQr(text) {
    // Loaded only when a ticket is opened, so the main app stays small.
    const QRCode = (await import('qrcode')).default;
    return QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 2, width: 560, color: { dark: '#0f172a', light: '#ffffff' } });
}

/** A resident's ticket for one event: QR code plus a short code to type if scanning fails. */
export default function TicketModal({ eventId, user, onClose }) {
    const [ticket, setTicket] = useState(null);
    const [image, setImage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/events/${eventId}/ticket`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.message || 'Could not load your ticket');
                const qr = await renderQr(data.token);
                if (!cancelled) { setTicket(data); setImage(qr); }
            } catch (e) {
                if (!cancelled) setError(e.message || 'Cannot connect to the server');
            }
        })();
        return () => { cancelled = true; };
    }, [eventId]);

    const event = ticket?.event;
    const attended = ticket?.status === 'attended';

    return (
        <Modal title="Event ticket" subtitle="Show this to a barangay official when you arrive." onClose={onClose} size="sm">
            {error ? <p className="py-10 text-center text-sm text-red-600">{error}</p> : !ticket ? <Spinner label="Loading your ticket…" /> : (
                <div className="flex flex-col items-center text-center">
                    <p className="text-base font-bold tracking-tight text-slate-900">{event.title}</p>
                    <p className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(event.date).toLocaleDateString()} · {event.time}</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {event.barangay}</span>
                    </p>

                    <div className="relative mt-4">
                        <img src={image} alt={`Ticket QR code for ${event.title}`}
                            className={`w-60 max-w-full rounded-lg border border-slate-200 sm:w-64 ${attended ? 'opacity-25' : ''}`} />
                        {attended && (
                            <div className="absolute inset-0 grid place-items-center">
                                <span className="eco-badge eco-badge-green px-3 py-1.5 text-sm"><CheckCircle2 className="h-4 w-4" /> Checked in</span>
                            </div>
                        )}
                    </div>

                    <p className="mt-4 eco-meta">Ticket code</p>
                    <p className="font-mono text-2xl font-bold tracking-[0.15em] text-slate-900">{ticket.code}</p>
                    <p className="mt-1 text-sm text-slate-500">{user.username}</p>

                    {!user.is_verified && (
                        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Your ID isn’t verified yet, so officials can’t check you in until it is.</p>
                    )}
                    <p className="mt-3 eco-meta">
                        {attended ? `You earned ${event.points_reward} points for this event.` : 'If the scan doesn’t work, the official can type the code instead. Turn up your screen brightness for faster scans.'}
                    </p>
                </div>
            )}
        </Modal>
    );
}
