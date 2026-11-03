/* Title ladder. Must match TITLE_THRESHOLDS in django_backend/api/models.py. */

export const TITLE_THRESHOLDS = [
    { points: 500, title: 'Eco Legend', emoji: '🌍' },
    { points: 300, title: 'Planet Protector', emoji: '🛡️' },
    { points: 200, title: 'Monster Sweeper', emoji: '🧹' },
    { points: 150, title: 'Bio Crusader', emoji: '⚔️' },
    { points: 100, title: "Nature's Knight", emoji: '🌿' },
    { points: 60, title: 'Eco Avenger', emoji: '💪' },
    { points: 30, title: 'Green Guardian', emoji: '🌱' },
    { points: 10, title: 'Sprout Scout', emoji: '🌿' },
];

/** The highest title earned with this many points, or '' if none yet. */
export function titleFor(points = 0) {
    return TITLE_THRESHOLDS.find((t) => points >= t.points)?.title || '';
}

/**
 * Points that count towards titles: the highest balance ever reached, so
 * spending points on rewards never takes a title away.
 */
export function achievementPoints(user) {
    return Math.max(user?.peak_points ?? 0, user?.points ?? 0);
}

/** The next title to aim for, or null at the top. */
export function nextTitleFor(points = 0) {
    return [...TITLE_THRESHOLDS].reverse().find((t) => points < t.points) || null;
}
