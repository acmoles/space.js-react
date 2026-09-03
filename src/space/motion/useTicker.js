import { useEffect, useRef } from 'react';

import { ticker } from '@lib/tween/Ticker.js';

/**
 * Subscribes to the Space.js render loop for the lifetime of the component.
 *
 * The callback is kept in a ref so it can close over fresh props and state
 * without resubscribing, and the loop is started on mount and left running,
 * matching the shared ticker the library uses.
 *
 * @param {function} callback Called with `(time, delta, frame)`.
 * @param {boolean} [enabled] Whether the callback is subscribed.
 * @example
 * useTicker((time, delta) => {
 *     ref.current.textContent = Math.round(1000 / delta);
 * });
 */
export function useTicker(callback, enabled = true) {
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    });

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const onUpdate = (time, delta, frame) => callbackRef.current(time, delta, frame);

        ticker.add(onUpdate);
        ticker.start();

        return () => ticker.remove(onUpdate);
    }, [enabled]);
}
