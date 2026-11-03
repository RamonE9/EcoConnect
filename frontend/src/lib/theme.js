import { useEffect, useState } from 'react';

// Light/dark theme. The saved choice wins; with no choice saved we follow the
// device setting. public/theme-init.js applies it before React loads.
const KEY = 'ecoconnect_theme';
const listeners = new Set();

function systemTheme() {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function savedTheme() {
    try {
        const value = localStorage.getItem(KEY);
        return value === 'light' || value === 'dark' ? value : null;
    } catch {
        return null;
    }
}

function currentTheme() {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function apply(theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    listeners.forEach((fn) => fn(theme));
}

function setTheme(theme) {
    try {
        localStorage.setItem(KEY, theme);
    } catch {
        /* storage unavailable: still switch for this visit */
    }
    apply(theme);
}

// Follow device changes until the user picks a theme themselves.
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (!savedTheme()) apply(systemTheme());
});

export function useTheme() {
    const [theme, setState] = useState(currentTheme);
    useEffect(() => {
        listeners.add(setState);
        return () => listeners.delete(setState);
    }, []);
    return [theme, () => setTheme(theme === 'dark' ? 'light' : 'dark')];
}
