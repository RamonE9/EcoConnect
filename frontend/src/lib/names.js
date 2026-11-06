export function displayName(person) {
    if (!person) return '';
    return person.full_name || person.username || '';
}

export function firstName(person) {
    return person?.first_name || person?.username || '';
}

const NAME_PATTERN = /^\p{L}[\p{L} .'-]*$/u;

export function personNameError(value, label) {
    const name = String(value || '').trim();
    if (!name) return `${label} is required.`;
    if (name.length > 50 || !NAME_PATTERN.test(name)) return `${label} can only use letters, spaces, dots, dashes or apostrophes.`;
    return '';
}
