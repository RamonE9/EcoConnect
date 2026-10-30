/* ── Validation shared with the backend rules ─────────────────────────── */

export const PH_PHONE_PATTERN = /^(09\d{9}|\+639\d{9})$/;

export function phoneError(value) {
    if (!value) return 'Phone number is required.';
    return PH_PHONE_PATTERN.test(value.replace(/[\s-]/g, '')) ? '' : 'Use a PH mobile number, e.g. 09171234567.';
}

export function passwordScore(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return Math.min(score, 4);
}

export function passwordError(password) {
    if (password.length < 8) return 'Use at least 8 characters.';
    if (/^\d+$/.test(password)) return 'Password cannot be numbers only.';
    if (passwordScore(password) < 2) return 'Mix letters, numbers or symbols for a stronger password.';
    return '';
}

export const MAX_UPLOAD_MB = 5;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function imageFileError(file) {
    if (!file) return 'Please upload a photo of your Barangay ID.';
    if (!ACCEPTED_TYPES.includes(file.type)) return 'Only JPG, PNG, GIF or WEBP images are allowed.';
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return `Image must be ${MAX_UPLOAD_MB} MB or smaller.`;
    if (file.size === 0) return 'The selected file is empty.';
    return '';
}
