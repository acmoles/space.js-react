import { useEffect, useState } from 'react';

import { clearTween, tween } from '@lib/tween/Tween.js';

/**
 * Animates plain numbers rather than styles, for values that drive canvas
 * drawing or SVG attributes.
 *
 * The values live on a mutable object read from the render loop, so an
 * animation does not re-render the component every frame. Any animation still
 * running is cancelled when the component unmounts.
 *
 * @param {object} initial Values to animate, and their starting values.
 * @returns {object} Handle with `values`, `animate` and `stop`.
 * @example
 * const motion = useMotion({ radius: 36 });
 *
 * useTicker(() => {
 *     circleRef.current.setAttribute('r', motion.values.radius);
 * });
 *
 * motion.animate({ radius: 18 }, 500, 'easeOutCubic');
 */
export function useMotion(initial) {
    const [handle] = useState(() => {
        const values = { ...initial };

        const handle = {
            values,

            stop() {
                clearTween(values);

                return handle;
            },

            animate(props, duration, ease, delay = 0, complete) {
                if (typeof delay !== 'number') {
                    complete = delay;
                    delay = 0;
                }

                return new Promise(resolve => {
                    tween(values, props, duration, ease, delay, () => {
                        if (complete) {
                            complete();
                        }

                        resolve();
                    });
                });
            }
        };

        return handle;
    });

    useEffect(() => () => clearTween(handle.values), [handle]);

    return handle;
}
