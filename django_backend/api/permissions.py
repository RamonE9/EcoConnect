"""Role-based access rules shared by every view.

Admin-only endpoints declare `IsBarangayAdmin` in their decorator, so DRF
rejects residents *before* the view body runs. This replaces the old pattern
of each view remembering to check `user.role` by hand.
"""
from rest_framework.permissions import BasePermission

ADMIN_ROLES = ('admin', 'official', 'barangay_official')
ALLOWED_SIGNUP_ROLES = ('resident', 'admin')


def is_admin(user):
    return bool(user and user.is_authenticated and user.role in ADMIN_ROLES)


class IsBarangayAdmin(BasePermission):
    message = 'Only barangay officials can perform this action.'

    def has_permission(self, request, view):
        return is_admin(request.user)


class IsAdminForWrites(BasePermission):
    """Any signed-in user may read; only officials may create/update/delete."""
    message = 'Only barangay officials can modify this resource.'

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return is_admin(request.user)
