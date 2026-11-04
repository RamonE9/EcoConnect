from django.conf import settings
from django.http import JsonResponse
from rest_framework_simplejwt.authentication import JWTAuthentication

PASSWORD_CHANGE_ALLOWED = ('/api/auth/me', '/api/auth/change-password', '/api/auth/token/refresh', '/api/auth/login')


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


class RequirePasswordChangeMiddleware:

    def __init__(self, get_response):
        self.get_response = get_response
        self.auth = JWTAuthentication()

    def __call__(self, request):
        if request.path.startswith('/api/') and not request.path.startswith(PASSWORD_CHANGE_ALLOWED) \
                and request.META.get('HTTP_AUTHORIZATION', '').startswith('Bearer '):
            try:
                result = self.auth.authenticate(request)
            except Exception:
                result = None
            if result and result[0].must_change_password:
                return JsonResponse({"message": "Please set a new password before continuing.",
                                     "code": "password_change_required"}, status=403)
        return self.get_response(request)


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
