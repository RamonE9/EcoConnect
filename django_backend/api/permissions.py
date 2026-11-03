from rest_framework.permissions import BasePermission

ADMIN_ROLES = ('admin', 'official', 'barangay_official')
ALLOWED_SIGNUP_ROLES = ('resident',)


def is_admin(user):
    return bool(user and user.is_authenticated and user.role in ADMIN_ROLES)


class IsBarangayAdmin(BasePermission):
    message = 'Only barangay officials can perform this action.'

    def has_permission(self, request, view):
        return is_admin(request.user)


class IsAdminForWrites(BasePermission):
    message = 'Only barangay officials can modify this resource.'

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return is_admin(request.user)
