import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import { clearTween, tween } from '@lib/tween/Tween.js';

import { applyStyle, createStyleState, getStyleValue } from './style.js';

/**
 * Animates an element from a React component.
 *
 * Returns a `[ref, controls]` pair. The ref goes on the element, and the
 * controls mirror the `css` and `tween` methods of the Space.js `Interface`
 * class. The tween engine and easing functions are the library's own, so
 * durations and curves are identical, but the element is owned by React and
 * styles are written through the ref rather than an imperative view object.
 *
 * Any animation still running is cancelled when the component unmounts.
 *
 * @param {object} [initial] Style properties applied when the element mounts.
 * @returns {Array} `[ref, controls]` where controls has `set`, `animate` and `stop`.
 * @example
 * const [lineRef, line] = useAnimation({ transformOrigin: 'left center', scaleX: 0 });
 *
 * return <span ref={lineRef} className="line" />;
 *
 * // Later, in an event handler
 * line.animate({ scaleX: 1 }, 800, 'easeOutQuint');
 */
export function useAnimation(initial) {
    const ref = useRef(null);
    const initialRef = useRef(initial);

    const controls = useMemo(() => {
        const state = createStyleState();

        const target = {
            get element() {
                return ref.current;
            },

            set(props) {
                applyStyle(ref.current, props, state);

                return target;
            },

            stop() {
                clearTween(target);

                return target;
            },

            animate(props, duration, ease, delay = 0, complete) {
                if (typeof delay !== 'number') {
                    complete = delay;
                    delay = 0;
                }

                return new Promise(resolve => {
                    const from = {};
                    const to = {};

                    for (const key in props) {
                        if (typeof props[key] === 'number' && key !== 'spring' && key !== 'damping') {
                            from[key] = getStyleValue(state, key);
                            to[key] = props[key];
                        } else {
                            // Non-numeric values, such as `transformOrigin`,
                            // are applied immediately
                            target.set({ [key]: props[key] });
                        }
                    }

                    // Easing parameters rather than animated properties
                    if (props.spring !== undefined) {
                        to.spring = props.spring;
                    }

                    if (props.damping !== undefined) {
                        to.damping = props.damping;
                    }

                    Object.assign(target, from);

                    const onUpdate = () => {
                        const style = {};

                        for (const key in from) {
                            style[key] = target[key];
                        }

                        applyStyle(ref.current, style, state);
                    };

                    tween(target, to, duration, ease, delay, () => {
                        if (complete) {
                            complete();
                        }

                        resolve();
                    }, onUpdate);
                });
            }
        };

        return target;
    }, []);

    useLayoutEffect(() => {
        if (initialRef.current) {
            controls.set(initialRef.current);
        }
    }, [controls]);

    useEffect(() => () => clearTween(controls), [controls]);

    return [ref, controls];
}
