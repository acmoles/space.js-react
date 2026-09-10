import { ticker } from '@lib/tween/Ticker.js';

/**
 * Starts the shared render loop if it is not already running.
 *
 * The library's `Tween` only adds itself to the ticker, it never starts it —
 * `Interface.tween()` does that (see `lib/utils/Interface.js`). The declarative
 * components have no `Interface`, so every entry point that schedules a tween
 * has to start the loop itself, otherwise nothing animates until some other
 * component happens to mount a `useTicker`.
 */
export function startTicker() {
    if (!ticker.isAnimating) {
        ticker.start();
    }
}
