export function mediaUrl(path, version) {
    if (!path) return null;
    const url = /^https?:\/\//i.test(path) ? path : `/${String(path).replace(/^\/+/, '')}`;
    if (!version) return url;
    return `${url}${url.includes('?') ? '&' : '?'}t=${version}`;
}
