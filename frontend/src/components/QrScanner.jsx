import { useEffect, useId, useRef, useState } from 'react';

/**
 * Live camera QR reader. Calls onScan(text) for each code it reads and waits
 * for that promise before scanning again, so one code isn't sent twice.
 */
export default function QrScanner({ onScan }) {
    const elementId = `qr-reader-${useId().replace(/:/g, '')}`;
    const onScanRef = useRef(onScan);
    const [error, setError] = useState('');

    useEffect(() => { onScanRef.current = onScan; }, [onScan]);

    useEffect(() => {
        let scanner = null;
        let started = false;
        let cancelled = false;
        let busy = false;
        let lastText = '';
        let lastAt = 0;

        (async () => {
            try {
                const { Html5Qrcode } = await import('html5-qrcode'); // loaded only when scanning
                if (cancelled) return;
                scanner = new Html5Qrcode(elementId, { verbose: false });
                await scanner.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: (w, h) => { const size = Math.floor(Math.min(w, h) * 0.7); return { width: size, height: size }; } },
                    async (text) => {
                        const now = Date.now();
                        // Ignore the same code held in front of the camera for a few seconds.
                        if (busy || (text === lastText && now - lastAt < 4000)) return;
                        busy = true;
                        lastText = text;
                        lastAt = now;
                        try { await onScanRef.current(text); } finally { busy = false; }
                    },
                    () => {},
                );
                started = true;
                if (cancelled) await scanner.stop().catch(() => {});
            } catch (err) {
                if (cancelled) return;
                const message = String(err?.message || err);
                setError(/permission|NotAllowed/i.test(message)
                    ? 'Camera access was blocked. Allow the camera for this site in your browser settings, then try again.'
                    : /NotFound|no camera|Requested device not found/i.test(message)
                        ? 'No camera was found on this device.'
                        : /secure|https/i.test(message)
                            ? 'The camera only works on a secure (https) connection.'
                            : 'The camera could not be started. Close other apps using it and try again.');
            }
        })();

        return () => {
            cancelled = true;
            if (scanner && started) scanner.stop().then(() => scanner.clear()).catch(() => {});
        };
    }, [elementId]);

    return (
        <div>
            {error ? (
                <div className="grid aspect-square w-full place-items-center rounded-lg border border-dashed border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">{error}</div>
            ) : (
                <div id={elementId} className="aspect-square w-full overflow-hidden rounded-lg bg-slate-900 [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
            )}
        </div>
    );
}
