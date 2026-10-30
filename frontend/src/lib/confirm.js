/*
 * In-app replacement for window.confirm(). Usage:
 *   if (!(await confirmDialog({ title: 'Sign out?', confirmLabel: 'Sign out' }))) return;
 * <ConfirmHost /> (mounted once in App) renders the dialog.
 */

let showDialog = null;

export function registerConfirmHost(fn) {
    showDialog = fn;
    return () => { if (showDialog === fn) showDialog = null; };
}

export function confirmDialog({ title = 'Are you sure?', message = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = {}) {
    if (!showDialog) return Promise.resolve(window.confirm(message || title));
    return new Promise((resolve) => showDialog({ title, message, confirmLabel, cancelLabel, danger, resolve }));
}

export function confirmSignOut() {
    return confirmDialog({
        title: 'Sign out?',
        message: 'Are you sure you want to sign out of EcoConnect?',
        confirmLabel: 'Sign out',
        danger: true,
    });
}
