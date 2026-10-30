/**
 * Turn a stored image path into something an <img> can load.
 * - Cloud storage (Supabase) saves full https:// URLs: use them as-is.
 * - Local fallback saves "static/uploads/x.jpg": serve it from our own site.
 * `version` (e.g. a timestamp) forces the browser to reload a changed photo.
 */
export function mediaUrl(path, version) {
    if (!path) return null;
    const url = /^https?:\/\//i.test(path) ? path : `/${String(path).replace(/^\/+/, '')}`;
    if (!version) return url;
    return `${url}${url.includes('?') ? '&' : '?'}t=${version}`;
}
