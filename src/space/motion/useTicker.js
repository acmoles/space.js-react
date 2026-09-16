import { useEffect, useRef } from 'react';

import { addTicker } from './ticker.js';

/**
 * Subscribes to the shared render loop for the lifetime of the component.
 *
 * The callback is kept in a ref so it can close over fresh props and state
 * without resubscribing.
 *
 * @param {function} callback Called with `(time, delta, frame)`.
 * @param {boolean} [enabled] Whether the callback is subscribed.
 * @param {number} [fps] Throttles the callback to this rate, as the second
 *   argument to the library's `ticker.add()` does. Omit to run every frame.
 * @example
 * useTicker((time, delta) => {
 *     ref.current.textContent = Math.round(1000 / delta);
 * });
 * @example
 * useTicker(() => drawNoise(), true, 20);
 */
export function useTicker(callback, enabled = true, fps) {
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    });

    useEffect(() => {
        if (!enabled) {
            return;
        }

        return addTicker((time, delta, frame) => callbackRef.current(time, delta, frame), fps);
    }, [enabled, fps]);
}
