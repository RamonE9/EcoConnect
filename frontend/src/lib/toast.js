
const listeners = new Set();
let nextId = 1;

const ERROR_WORDS = /(fail|error|cannot|can't|couldn't|invalid|unauthori[sz]ed|insufficient|denied|not |required|please|too many|out of stock|already)/i;

export function toast(message, type) {
    const text = typeof message === 'string' ? message : String(message ?? '');
    const kind = type || (ERROR_WORDS.test(text) ? 'error' : 'success');
    const item = { id: nextId++, text, kind };
    listeners.forEach((listener) => listener(item));
}

export function subscribeToToasts(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
