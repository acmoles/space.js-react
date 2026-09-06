import { useEffect, useRef } from 'react';

import { clearTween, delayedCall } from '@lib/tween/Tween.js';

import { startTicker } from './ticker.js';

/**
 * Returns a function that defers a callback, cancelling any outstanding call
 * when the component unmounts.
 *
 * @returns {function} `(duration, callback) => tween`
 * @example
 * const delay = useDelayedCall();
 *
 * delay(500, () => setOpen(true));
 */
export function useDelayedCall() {
    const timeouts = useRef([]);

    useEffect(() => {
        const pending = timeouts.current;

        return () => {
            pending.forEach(clearTween);
            pending.length = 0;
        };
    }, []);

    return (duration, callback) => {
        startTicker();

        const timeout = delayedCall(duration, () => {
            timeouts.current = timeouts.current.filter(item => item !== timeout);

            callback();
        });

        timeouts.current.push(timeout);

        return timeout;
    };
}
