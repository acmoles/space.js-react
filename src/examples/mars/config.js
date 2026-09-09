/**
 * Mars example configuration.
 *
 * Ported from `examples/mars/src/config/Config.js`. Paths are adapted to the
 * SPA's served asset locations (`/assets/...`) instead of the original
 * standalone app's `basePath`/`assetPath`.
 */

export const isMobile = !!navigator.maxTouchPoints;
export const isDebug = /[?&]debug/.test(location.search);

// Vite serves `public/` at the site root, so every asset lives under `/assets`.
export const assetPath = '/assets';
export const dataPath = `${assetPath}/data/mars.json`;

export const numViews = 6;

export const colors = {
    backgroundColor: 0x000000,
    lightColor: 0x3b5b89
};

export const layers = {
    default: 0,
    background: 1,
    occlusion: 2
};

export const params = {
    redTint: false,
    sunGlow: false,
    lights: false,
    stars: true,
    animate: !isDebug,
    speed: 0.2
};

/**
 * Resets the shared `params` singleton to its defaults. Called on scene mount
 * so a React StrictMode remount (or route navigation back) starts clean
 * instead of inheriting mutated values from the previous mount.
 */
export function resetParams() {
    params.redTint = false;
    params.sunGlow = false;
    params.lights = false;
    params.stars = true;
    params.animate = !isDebug;
    params.speed = 0.2;
}
