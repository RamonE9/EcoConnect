import { useState } from 'react';
import { Keyboard, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { Modal, Avatar } from './ui';
import QrScanner from './QrScanner';
import { mediaUrl } from '../lib/media';
import { displayName } from '../lib/names';

const TONES = {
    success: { box: 'border-brand-200 bg-brand-50 text-brand-900', icon: CheckCircle2, iconColor: 'text-brand-700' },
    already: { box: 'border-amber-200 bg-amber-50 text-amber-900', icon: Info, iconColor: 'text-amber-600' },
    error: { box: 'border-red-200 bg-red-50 text-red-800', icon: AlertCircle, iconColor: 'text-red-600' },
};

export default function ScanCodeModal({
    title, subtitle, url, successResult, hint, placeholder, buttonLabel, logTitle, logText = (item) => displayName(item.user),
    onSuccess, onClose,
}) {
    const [last, setLast] = useState(null);
    const [log, setLog] = useState([]);
    const [code, setCode] = useState('');

    const submit = async (payload) => {
        let result;
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            result = { ...data, tone: data.result === successResult ? 'success' : data.result === 'already' ? 'already' : 'error' };
            if (!result.message) result.message = res.ok ? 'Done' : 'Could not use this code';
        } catch (error) {
            result = { tone: 'error', message: error.message || 'Cannot connect to the server' };
        }
        result.at = new Date();
        setLast(result);
        if (result.result === successResult) {
            setLog((items) => [result, ...items].slice(0, 30));
            onSuccess?.(result);
            navigator.vibrate?.(80);
        }
        return result;
    };

    const submitCode = async (e) => {
        e.preventDefault();
        const result = await submit({ code });
        if (result.result === successResult || result.result === 'already') setCode('');
    };

    const tone = last ? TONES[last.tone] : null;
    const ToneIcon = tone?.icon;

    return (
        <Modal title={title} subtitle={subtitle} onClose={onClose} size="md">
            <div className="mx-auto max-w-sm">
                <QrScanner onScan={(token) => submit({ token })} />
                <p className="mt-2 text-center eco-meta">{hint}</p>
                <form onSubmit={submitCode} className="mt-3 flex gap-2">
                    <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={9} placeholder={placeholder}
                        aria-label="Code" className="eco-input h-10 font-mono uppercase tracking-wider" autoCapitalize="characters" autoComplete="off" />
                    <button type="submit" disabled={code.replace(/[^A-Z0-9]/g, '').length !== 8} className="eco-btn eco-btn-outline h-10 shrink-0"><Keyboard className="h-4 w-4" /> {buttonLabel}</button>
                </form>
            </div>

            <div className="mt-4 min-h-[64px]" aria-live="assertive">
                {last ? (
                    <div className={`flex items-center gap-3 rounded-xl border p-3 ${tone.box}`}>
                        {last.user ? <Avatar src={mediaUrl(last.user.profile_picture)} name={displayName(last.user)} /> : <ToneIcon className={`h-6 w-6 shrink-0 ${tone.iconColor}`} />}
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
                    <h3 className="text-sm font-semibold text-slate-900">{logTitle} ({log.length})</h3>
                    <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                        {log.map((item, i) => (
                            <li key={`${item.user?.id}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                                <span className="truncate font-medium text-slate-900">{logText(item)}</span>
                                <span className="eco-meta shrink-0">{item.at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Modal>
    );
}
