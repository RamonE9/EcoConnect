import { useEffect, useRef, useState } from 'react';
import { registerConfirmHost } from '../lib/confirm';

export function ConfirmHost() {
    const [request, setRequest] = useState(null);
    const confirmRef = useRef(null);

    useEffect(() => registerConfirmHost(setRequest), []);

    useEffect(() => {
        if (!request) return undefined;
        confirmRef.current?.focus();
        const onKey = (e) => {
            if (e.key === 'Escape') { e.stopImmediatePropagation(); close(false); }
        };
        document.addEventListener('keydown', onKey, true);
        return () => document.removeEventListener('keydown', onKey, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [request]);

    if (!request) return null;

    function close(answer) {
        request.resolve(answer);
        setRequest(null);
    }

    return (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center bg-slate-900/40 p-4" role="alertdialog" aria-modal="true"
            aria-labelledby="confirm-title" onMouseDown={(e) => e.target === e.currentTarget && close(false)}>
            <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
                <h2 id="confirm-title" className="text-lg font-bold tracking-tight text-slate-900">{request.title}</h2>
                {request.message && <p className="mt-2 text-sm leading-relaxed text-slate-600">{request.message}</p>}
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={() => close(false)} className="eco-btn eco-btn-outline">{request.cancelLabel}</button>
                    <button type="button" ref={confirmRef} onClick={() => close(true)}
                        className={`eco-btn ${request.danger ? 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/25' : 'eco-btn-green'}`}>
                        {request.confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
