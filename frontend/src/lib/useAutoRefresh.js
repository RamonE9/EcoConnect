import { useEffect, useRef } from 'react';

export function useAutoRefresh(callback, intervalMs, enabled = true) {
    const saved = useRef(callback);

    useEffect(() => {
        saved.current = callback;
    }, [callback]);

    useEffect(() => {
        if (!enabled) return undefined;
        let busy = false;
        const run = async () => {
            if (busy || document.visibilityState !== 'visible') return;
            busy = true;
            try {
                await saved.current();
            } catch {
                // the next cycle tries again
            } finally {
                busy = false;
            }
        };
        const onVisible = () => {
            if (document.visibilityState === 'visible') run();
        };
        const timer = setInterval(run, intervalMs);
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);
        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
        };
    }, [intervalMs, enabled]);
}
