import { cancelFrame, frame, frameData } from 'motion';

/**
 * The shared render loop, driven by Motion's frame loop.
 *
 * This replaces the library's `lib/tween/Ticker.js` for everything rendered by
 * React. The library's ticker seeds `last` when the module is first evaluated
 * but never re-seeds it in `start()`, so the first frame after a lazy start
 * reports a `delta` covering everything since page load — hundreds of
 * milliseconds. Tweens accumulate that into `elapsed` and jump straight to
 * their end state, which is why a graph's first render was janky while
 * subsequent ones, with the loop already running, were smooth. Motion measures
 * the delta itself, so the first frame is an ordinary one.
 *
 * Callbacks receive `(time, delta, frame)` exactly as the library's ticker
 * does: `time` in seconds, `delta` in milliseconds, `frame` a counter.
 */

/**
 * Subscribes `callback` to the render loop until the returned function is called.
 *
 * @param {function} callback Called with `(time, delta, frame)`.
 * @param {number} [fps] Throttles the callback to this rate, as the second
 *   argument to the library's `ticker.add()` does. Omit to run every frame.
 * @returns {function} Unsubscribes the callback.
 * @example
 * const remove = addTicker((time, delta) => draw(delta), 20);
 */
export function addTicker(callback, fps) {
    let count = 0;
    let last = frameData.timestamp;

    const onFrame = () => {
        const { timestamp } = frameData;

        if (fps) {
            const delta = timestamp - last;

            if (delta < 1000 / fps) {
                return;
            }

            last = timestamp;
            count++;

            callback(timestamp * 0.001, delta, count);
            return;
        }

        count++;

        callback(timestamp * 0.001, frameData.delta, count);
    };

    // `keepAlive` keeps the callback subscribed across frames rather than
    // running it once on the next frame.
    frame.update(onFrame, true);

    return () => cancelFrame(onFrame);
}
