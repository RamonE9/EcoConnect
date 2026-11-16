import { readMessage } from './api';

export async function downloadFile(url, fallbackName) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    if (!res.ok) throw new Error(await readMessage(res, 'Could not download the file.'));
    const blob = await res.blob();
    const name = /filename="?([^";]+)"?/.exec(res.headers.get('Content-Disposition') || '')?.[1] || fallbackName;
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export function buildQuery(params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== '') query.set(key, String(value).trim());
    });
    const text = query.toString();
    return text ? `?${text}` : '';
}
