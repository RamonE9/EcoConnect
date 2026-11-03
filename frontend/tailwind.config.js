// Neutral and tint colours read CSS variables (defined in src/index.css) so the
// whole app switches to dark mode by toggling the `dark` class on <html>.
// Solid colours (green buttons, red badges) stay the same in both themes.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const scale = (color, steps) => Object.fromEntries(steps.map((s) => [s, v(`${color}-${s}`)]));

export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
            },
            colors: {
                // EcoConnect green, used as flat solid colours (no gradients).
                brand: {
                    50: '#f0fdf4',
                    100: '#dcfce7',
                    200: '#bbf7d0',
                    500: '#22c55e',
                    600: '#16a34a',
                    700: '#15803d',
                    800: '#166534',
                    900: '#14532d',
                },
                ink: '#0f172a',
                // Greys flip in dark mode: slate-900 text becomes near white, slate-50 becomes near black.
                slate: scale('slate', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
            },
            backgroundColor: {
                white: v('surface'),
                // Keep dark fills (overlays, camera box) dark in both themes.
                slate: { 800: '#1e293b', 900: '#0f172a' },
                brand: scale('brand', [50, 100, 200]),
                red: scale('red', [50]),
                amber: scale('amber', [50]),
                sky: scale('sky', [50]),
            },
            textColor: {
                brand: scale('brand', [600, 700, 800, 900]),
                red: scale('red', [600, 700, 800]),
                amber: scale('amber', [600, 800, 900]),
                sky: scale('sky', [800]),
            },
            borderColor: {
                brand: scale('brand', [200]),
                red: scale('red', [200]),
                amber: scale('amber', [200]),
            },
            ringColor: {
                white: v('surface'),
            },
        },
    },
    plugins: [],
}
