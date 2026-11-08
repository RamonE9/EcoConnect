import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Modal, Spinner } from './ui';
import { renderQr } from '../lib/qr';
import { displayName } from '../lib/names';
import { useAutoRefresh } from '../lib/useAutoRefresh';

export default function RewardQrModal({ redemptionId, user, onClose, onChanged }) {
    const [claim, setClaim] = useState(null);
    const [image, setImage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/finance/redemption/${redemptionId}/qr`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.message || 'Could not load your reward QR');
                const qr = await renderQr(data.token);
                if (!cancelled) { setClaim(data); setImage(qr); }
            } catch (e) {
                if (!cancelled) setError(e.message || 'Cannot connect to the server');
            }
        })();
        return () => { cancelled = true; };
    }, [redemptionId]);

    const waiting = claim?.redemption?.status === 'Pending';
    useAutoRefresh(async () => {
        const res = await fetch(`/api/finance/redemption/${redemptionId}/qr`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        if (!res.ok) return;
        const data = await res.json();
        if (data.redemption?.status !== 'Pending') {
            setClaim((current) => (current ? { ...current, redemption: data.redemption } : current));
            onChanged?.();
        }
    }, 5000, waiting);

    const r = claim?.redemption;
    const received = r?.status === 'Claimed';
    const rejected = r?.status === 'Rejected';

    return (
        <Modal title="Reward QR" subtitle="Show this at your barangay hall to pick up your reward." onClose={onClose} size="sm">
            {error ? <p className="py-10 text-center text-sm text-red-600">{error}</p> : !claim ? <Spinner label="Loading your reward QR…" /> : (
                <div className="flex flex-col items-center text-center">
                    <p className="text-base font-bold tracking-tight text-slate-900">{(r.quantity || 1) > 1 ? `${r.quantity} × ` : ''}{r.item_name}</p>
                    <p className="mt-1 text-sm text-slate-500">Reserved {new Date(r.timestamp).toLocaleDateString()} · {r.points_spent} pts</p>

                    <div className="relative mt-4">
                        <img src={image} alt={`Reward QR code for ${r.item_name}`}
                            className={`w-60 max-w-full rounded-lg border border-slate-200 sm:w-64 ${received || rejected ? 'opacity-25' : ''}`} />
                        {(received || rejected) && (
                            <div className="absolute inset-0 grid place-items-center">
                                {received
                                    ? <span className="eco-badge eco-badge-green px-3 py-1.5 text-sm"><CheckCircle2 className="h-4 w-4" /> Received</span>
                                    : <span className="eco-badge eco-badge-red px-3 py-1.5 text-sm"><XCircle className="h-4 w-4" /> Rejected</span>}
                            </div>
                        )}
                    </div>

                    <p className="mt-4 eco-meta">Reward code</p>
                    <p className="font-mono text-2xl font-bold tracking-[0.15em] text-slate-900">{claim.code}</p>
                    <p className="mt-1 text-sm text-slate-500">{displayName(user)}</p>

                    <p className="mt-3 eco-meta">
                        {received
                            ? `You picked this up${r.claimed_at ? ` on ${new Date(r.claimed_at).toLocaleDateString()}` : ''}.`
                            : rejected
                                ? 'Your barangay rejected this claim and your points were refunded.'
                                : 'Your item is reserved. If the scan doesn’t work, the official can type the code instead.'}
                    </p>
                </div>
            )}
        </Modal>
    );
}
