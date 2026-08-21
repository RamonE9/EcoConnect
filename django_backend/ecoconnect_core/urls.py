"""
URL configuration for ecoconnect_core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve
from django.conf import settings
import os
from api.views_auth import index

urlpatterns = [
    path('backend-admin/', admin.site.urls),
    path('api/', include('api.urls')),
    
    re_path(r'^assets/(?P<path>.*)$', serve, {
        'document_root': os.path.join(settings.BASE_DIR.parent, 'frontend', 'dist', 'assets')
    }),
    re_path(r'^vite.svg$', serve, {
        'document_root': os.path.join(settings.BASE_DIR.parent, 'frontend', 'dist'),
        'path': 'vite.svg'
    }),
    
    re_path(r'^(?P<path>.*)$', index),
]
