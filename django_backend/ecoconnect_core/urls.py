from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve
from django.conf import settings
import os
from api.views_auth import index
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerSplitView

urlpatterns = [
    path('backend-admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='api-schema'),
    path('api/docs/', SpectacularSwaggerSplitView.as_view(url_name='api-schema'), name='api-docs'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='api-schema'), name='api-redoc'),
    path('api/', include('api.urls')),
    
    re_path(r'^assets/(?P<path>.*)$', serve, {
        'document_root': os.path.join(settings.BASE_DIR.parent, 'frontend', 'dist', 'assets')
    }),
    re_path(r'^static/uploads/(?P<path>.*)$', serve, {
        'document_root': os.path.join(settings.BASE_DIR, 'static', 'uploads')
    }),
    re_path(r'^(?P<path>vite\.svg|ecoconnect\.svg|favicon-32\.png|apple-touch-icon\.png|icon-192\.png|icon-512\.png'
            r'|manifest\.webmanifest|theme-init\.js)$', serve, {
        'document_root': os.path.join(settings.BASE_DIR.parent, 'frontend', 'dist'),
    }),
    
    re_path(r'^(?!api/)(?P<path>.*)$', index),
]
