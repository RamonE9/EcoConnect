/* Title ladder (Tagalog), highest first. Must match TITLE_THRESHOLDS in django_backend/api/models.py. */

export const TITLE_THRESHOLDS = [
    { points: 500, title: 'Halaman Master', emoji: '👑', description: 'Simple lang pero may diin na ikaw ang hari o reyna ng mga tanim.' },
    { points: 300, title: 'Lodi ng Lupa', emoji: '🪴', description: 'Baliktad na "idol", para sa eksperto sa pagtatanim at pag-aalaga ng lupa.' },
    { points: 200, title: 'Plantitosaurus', emoji: '🦖', description: 'Para sa mga may edad na o lumang kaluluwa na adik na adik sa pag-aalaga ng halaman.' },
    { points: 150, title: 'Super Tropikal', emoji: '🌴', description: 'Ang tropa ninyong laging handang sumagip sa kalikasan.' },
    { points: 100, title: 'Beterano sa Damo', emoji: '🌾', description: 'Pwede sa hardinero, pwede rin sa laging tumatambay sa damuhan.' },
    { points: 60, title: 'Dahon Ranger', emoji: '🍃', description: 'Parang superhero sa mall, pero luntian at eco-friendly ang trip.' },
    { points: 30, title: 'Pormang Tanim', emoji: '😎', description: 'Astig at pampaporma kahit nagbubungkal lang ng lupa.' },
    { points: 10, title: 'Budol ng Kalikasan', emoji: '🌱', description: 'Dahil napilitan (na-budol) ka na lang ding maging eco-friendly sa huli.' },
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
