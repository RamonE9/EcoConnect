from django.conf import settings


def _build_csp():
    img_sources = ["'self'", "data:", "blob:", "https://*.tile.openstreetmap.org", "https://unpkg.com"]
    supabase_url = getattr(settings, 'SUPABASE_URL', '')
    if supabase_url:
        img_sources.append(supabase_url)
    directives = {
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "img-src": img_sources,
        "connect-src": ["'self'"],
        "worker-src": ["'self'", "blob:"],
        "media-src": ["'self'", "blob:"],
        "frame-ancestors": ["'none'"],
        "base-uri": ["'self'"],
        "form-action": ["'self'"],
        "object-src": ["'none'"],
    }
    return "; ".join(f"{name} {' '.join(values)}" for name, values in directives.items())


class SecurityHeadersMiddleware:

    def __init__(self, get_response):
        self.get_response = get_response
        self.csp = _build_csp()

    def __call__(self, request):
        response = self.get_response(request)
        response.setdefault('Content-Security-Policy', self.csp)
        response.setdefault('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(self)')
        response.setdefault('X-Content-Type-Options', 'nosniff')
        return response
