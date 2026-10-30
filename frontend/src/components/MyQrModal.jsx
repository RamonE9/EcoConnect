import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Modal, Spinner } from './ui';
import { confirmDialog } from '../lib/confirm';
import { toast } from '../lib/toast';

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

async function renderQr(token) {
    // Loaded only when needed so the main app stays small.
    const QRCode = (await import('qrcode')).default;
    return QRCode.toDataURL(token, { errorCorrectionLevel: 'M', margin: 2, width: 560, color: { dark: '#0f172a', light: '#ffffff' } });
}

/** The resident's personal attendance QR code, shown to officials at events. */
export default function MyQrModal({ user, onClose }) {
    const [image, setImage] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const load = async (method = 'GET') => {
        setError('');
        const res = await fetch('/api/auth/me/qr', { method, headers: authHeaders() });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Could not load your QR code');
        setImage(await renderQr(data.token));
        return data;
    };

    useEffect(() => {
        load().catch((e) => setError(e.message || 'Cannot connect to the server'));
    }, []);

    const regenerate = async () => {
        const ok = await confirmDialog({
            title: 'Make a new QR code?',
            message: 'Your current code will stop working. Do this if your code was shared or your phone was lost.',
            confirmLabel: 'Make new code',
        });
        if (!ok) return;
        setBusy(true);
        try {
            const data = await load('POST');
            toast(data.message, 'success');
        } catch (e) {
            toast(e.message, 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal title="My attendance QR" subtitle="Show this to a barangay official when you arrive at an event." onClose={onClose} size="sm"
            footer={<button onClick={regenerate} disabled={busy || !image} className="eco-btn eco-btn-outline"><RefreshCw className="h-4 w-4" /> {busy ? 'Making…' : 'Make a new code'}</button>}>
            <div className="flex flex-col items-center text-center">
                {error ? (
                    <p className="py-10 text-sm text-red-600">{error}</p>
                ) : !image ? (
                    <Spinner label="Loading your code…" />
                ) : (
                    <img src={image} alt={`Attendance QR code for ${user.username}`} className="w-64 max-w-full rounded-lg border border-slate-200 sm:w-72" />
                )}
                <p className="mt-4 text-base font-semibold text-slate-900">{user.username}</p>
                <p className="text-sm text-slate-500">Resident of {user.barangay}</p>
                {!user.is_verified && (
                    <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Your ID isn’t verified yet, so officials can’t check you in until it is.</p>
                )}
                <p className="mt-3 eco-meta">Tip: turn up your screen brightness if the scan is slow.</p>
            </div>
        </Modal>
    );
}
