/**
 * Deterministic page clock for the visual harnesses.
 *
 * The examples animate continuously and many of them feed `Math.random()` into
 * graphs and meters, so two captures of the *same* page disagree by anywhere
 * from a few hundred to tens of thousands of pixels.  That noise floor used to
 * be indistinguishable from a real regression, which made small pixel diffs
 * meaningless.
 *
 * This module removes the two sources of that noise:
 *
 *   - **Time.**  `requestAnimationFrame`, `performance.now()` and `Date.now()`
 *     are replaced with a virtual clock that only moves when the harness calls
 *     `advance()`.  Nothing animates on its own, so a capture happens at an
 *     exact frame number rather than "whenever the screenshot landed".
 *   - **Randomness.**  `Math.random()` is replaced with a seeded PRNG, so a
 *     page that plots random data plots the *same* random data every run.
 *
 * Real timers (`setTimeout`/`setInterval`) are deliberately left alone: module
 * loading, texture decoding and font loading depend on them, and stubbing them
 * out deadlocks the page before it ever renders.
 *
 * Applied identically to the reference page and the ported page, so it cannot
 * mask a difference between them — it only stops them disagreeing with
 * themselves.
 */

/** Virtual frame duration, matching a 60Hz display. */
export const FRAME_MS = 1000 / 60;

/**
 * Installed with `page.addInitScript`, so it runs before any application code
 * and before the modules that capture `window.requestAnimationFrame` at import
 * time (see `lib/tween/Ticker.js`).
 */
function install({ seed, baseDate }) {
    let now = 0;
    let nextId = 1;

    const callbacks = new Map();

    performance.now = () => now;

    const RealDate = Date;

    Date.now = () => baseDate + now;

    // `new Date()` with no arguments must follow the virtual clock too, or
    // anything formatting "now" (graph labels, timestamps) drifts between runs.
    const VirtualDate = new Proxy(RealDate, {
        construct(target, args) {
            return args.length
                ? new target(...args)
                : new target(baseDate + now);
        }
    });

    VirtualDate.now = () => baseDate + now;
    window.Date = VirtualDate;

    window.requestAnimationFrame = callback => {
        const id = nextId++;
        callbacks.set(id, callback);

        return id;
    };

    window.cancelAnimationFrame = id => {
        callbacks.delete(id);
    };

    // mulberry32 — small, fast, and identical across runs for a given seed.
    let state = seed >>> 0;

    Math.random = () => {
        state = (state + 0x6d2b79f5) >>> 0;

        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    /**
     * Steps the virtual clock `frames` times, flushing the animation callbacks
     * queued for each frame.  Callbacks scheduled *during* a frame run on the
     * next one, exactly as a real browser would order them.
     */
    window.__parityAdvance = frames => {
        for (let i = 0; i < frames; i++) {
            now += FRAME_MS;

            const due = [...callbacks.entries()];
            callbacks.clear();

            for (const [, callback] of due) {
                try {
                    callback(now);
                } catch {
                    // A throwing frame callback is the page's problem, not the
                    // harness's; the smoke test is what reports those.
                }
            }
        }
    };
}

/**
 * Installs the deterministic clock on `page`.  Must be called before
 * navigation.
 *
 * @param {import('playwright-core').Page} page
 * @param {object}  [options]
 * @param {number}  [options.seed=1]      PRNG seed; any fixed value works.
 * @param {number}  [options.baseDate]    Epoch ms reported as "now".
 */
export async function installDeterministicClock(page, { seed = 1, baseDate = 1700000000000 } = {}) {
    await page.addInitScript(install, { seed, baseDate });
}

/**
 * Advances the page's virtual clock by `frames` frames.
 *
 * Resolves without doing anything if the clock is not installed, so callers
 * can share a capture path with harnesses that do not use it.
 */
export async function advance(page, frames) {
    await page
        .evaluate(count => {
            if (typeof window.__parityAdvance === 'function') {
                window.__parityAdvance(count);
            }
        }, frames)
        .catch(() => {});
}
