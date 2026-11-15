import { isAdminRole } from './roles';

export const LOGIN_PATH = '/';
export const ADMIN_SITE = '/backend-admin/';

export function homeFor(user) {
    if (!user) return LOGIN_PATH;
    if (isAdminRole(user.role)) return '/admin';
    if (user.is_superuser) return ADMIN_SITE;
    return '/dashboard';
}

export function storedUser() {
    try {
        if (!localStorage.getItem('token')) return null;
        return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
        return null;
    }
}
