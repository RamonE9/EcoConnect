
export const EVENT_CATEGORIES = [
    'General Cleanup', 'Coastal Cleanup', 'Tree Planting', 'River Cleanup',
    'Waste Segregation', 'Mangrove Planting', 'Urban Gardening',
];

export const PUERTO_PRINCESA = [9.7407, 118.7353];

export function parseCoords(location) {
    if (!location || !location.includes(',')) return null;
    const [lat, lng] = location.split(',').map((part) => parseFloat(part.trim()));
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
}
