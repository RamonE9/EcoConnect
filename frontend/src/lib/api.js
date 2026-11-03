/*
 * Central network layer for every `/api/...` request.
 *
 * Installed once in main.jsx, it wraps window.fetch so all existing pages get:
 *   1. A timeout (20s, or 60s for uploads) instead of waiting forever on slow
 *      connections. The page then shows its normal "cannot connect" message.
 *   2. Silent token refresh: when the 60-minute access token expires, the
 *      stored refresh token gets a new one and the request is retried once,
 *      so users are not logged out mid-session.
 */

const API_TIMEOUT_MS = 20000;
const UPLOAD_TIMEOUT_MS = 60000;

// Endpoints that must never trigger a refresh-and-retry loop.
const NO_REFRESH_PATHS = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/token/refresh',
    '/api/auth/forgot-password',
    '/api/auth/verify-otp',
    '/api/auth/reset-password',
];

// "Remember me": a session cookie (no expiry date) marks a sign-in that should
// end when the browser closes. The browser deletes it on close; on the next
// visit we find the flag without the cookie and sign out.
const REMEMBER_KEY = 'ecoconnect_remember';
const ALIVE_COOKIE = 'ecoconnect_alive';

function setAliveCookie() {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${ALIVE_COOKIE}=1; path=/; SameSite=Lax${secure}`;
}

export function saveSession({ access_token, refresh_token, user }, { remember = true } = {}) {
    localStorage.setItem('token', access_token);
    if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
    if (!remember) setAliveCookie();
}

export function clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem(REMEMBER_KEY);
    document.cookie = `${ALIVE_COOKIE}=; path=/; max-age=0`;
}

/** Sign out a "don't remember me" session left over from a closed browser. */
function dropEndedSession() {
    try {
        const notRemembered = localStorage.getItem(REMEMBER_KEY) === '0';
        const alive = document.cookie.split('; ').includes(`${ALIVE_COOKIE}=1`);
        if (notRemembered && !alive) clearSession();
    } catch {
        /* storage unavailable: nothing saved to clear */
    }
}

/** Read a JSON error body safely and return a readable message. */
export async function readMessage(response, fallback = 'Something went wrong. Please try again.') {
    try {
        const data = await response.json();
        return data.message || data.detail || fallback;
    } catch {
        return fallback;
    }
}

export function installApiClient() {
    if (window.__ecoApiInstalled) return;
    window.__ecoApiInstalled = true;
    dropEndedSession();

    const originalFetch = window.fetch.bind(window);
    let refreshInFlight = null;

    const urlOf = (input) => (typeof input === 'string' ? input : input?.url || '');

    async function fetchWithTimeout(input, init = {}) {
        if (init.signal) return originalFetch(input, init);
        const controller = new AbortController();
        const ms = init.body instanceof FormData ? UPLOAD_TIMEOUT_MS : API_TIMEOUT_MS;
        const timer = setTimeout(() => controller.abort(), ms);
        try {
            return await originalFetch(input, { ...init, signal: controller.signal });
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('The server is taking too long to respond. Check your connection and try again.');
            }
            throw error;
        } finally {
            clearTimeout(timer);
        }
    }

    function refreshAccessToken() {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh || !localStorage.getItem('token')) return Promise.resolve(null);
        // Several requests may fail at once; share a single refresh call.
        if (!refreshInFlight) {
            refreshInFlight = originalFetch('/api/auth/token/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh }),
            })
                .then(async (res) => {
                    if (!res.ok) {
                        clearSession();
                        return null;
                    }
                    const data = await res.json();
                    localStorage.setItem('token', data.access);
                    if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
                    return data.access;
                })
                .catch(() => null)
                .finally(() => {
                    refreshInFlight = null;
                });
        }
        return refreshInFlight;
    }

    window.fetch = async (input, init = {}) => {
        const url = urlOf(input);
        if (!url.startsWith('/api/')) return originalFetch(input, init);

        let response = await fetchWithTimeout(input, init);

        const sentToken = new Headers(init.headers || {}).has('Authorization');
        const canRefresh = !NO_REFRESH_PATHS.some((path) => url.startsWith(path));
        if (response.status === 401 && sentToken && canRefresh) {
            const newToken = await refreshAccessToken();
            if (newToken) {
                const headers = new Headers(init.headers || {});
                headers.set('Authorization', `Bearer ${newToken}`);
                response = await fetchWithTimeout(input, { ...init, headers });
            }
        }
        return response;
    };
}
