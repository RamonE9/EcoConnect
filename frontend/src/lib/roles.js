export const ADMIN_ROLES = ['admin', 'official', 'barangay_official'];

export function isAdminRole(role) {
    return ADMIN_ROLES.includes(role);
}
