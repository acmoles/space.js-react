import { useEffect, useImperativeHandle, useMemo, useRef } from 'react';

import { clearTween, tween as tweenFn } from '@lib/tween/Tween.js';

import './GraphLabel.css';

/**
 * Graph-segment label — a small, absolutely-positioned caption that sits
 * centered over a segment divider in a {@link GraphSegments} component.
 *
 * The imperative handle exposes the same chainable `css`, `tween` and
 * `clearTween` surface that the original `Interface`-based `GraphLabel`
 * provides, so `GraphSegments` can drive opacity and horizontal position
 * directly from its draw loop without triggering React re-renders.
 *
 * @param {object} props
 * @param {string} props.name Label text.
 * @param {object} [props.ref] Exposes `{ element, css, tween, clearTween }`.
 * @example
 * const labelRef = useRef(null);
 * <GraphLabel ref={labelRef} name="Segment A" />
 * // Later, from a draw loop:
 * labelRef.current.css({ left: 75 });
 * labelRef.current.clearTween().tween({ opacity: 1 }, 400, 'easeOutCubic', 200);
 */
export function GraphLabel({ name, ref }) {
    const rootRef = useRef(null);

    // Internal tween-target object. Holds numeric opacity so the tween engine
    // can interpolate it; its update callback pushes the value to the DOM.
    const tweenTarget = useMemo(() => ({ opacity: 0 }), []);

    const handle = useMemo(() => {
        const syncOpacity = () => {
            if (rootRef.current) {
                rootRef.current.style.opacity = tweenTarget.opacity;
            }
        };

        const h = {
            get element() {
                return rootRef.current;
            },

            /** Mirror of Interface.css — immediate style set, chainable. */
            css(props) {
                if (props.opacity !== undefined) {
                    tweenTarget.opacity = props.opacity;
                    syncOpacity();
                }

                if (props.left !== undefined && rootRef.current) {
                    rootRef.current.style.left = typeof props.left === 'number'
                        ? `${props.left}px`
                        : props.left;
                }

                return h;
            },

            /** Mirror of Interface.tween — chainable animated set. */
            tween(props, duration, ease, delay = 0, complete) {
                if (props.opacity !== undefined) {
                    tweenFn(tweenTarget, { opacity: props.opacity }, duration, ease, delay, complete, syncOpacity);
                }

                return h;
            },

            /** Mirror of Interface.clearTween — stops running tweens, chainable. */
            clearTween() {
                clearTween(tweenTarget);

                return h;
            }
        };

        return h;
    }, [tweenTarget]);

    useImperativeHandle(ref, () => handle, [handle]);

    // Cancel any outstanding tween when the component unmounts.
    useEffect(() => () => clearTween(tweenTarget), [tweenTarget]);

    return (
        <div ref={rootRef} className="label">
            {name}
        </div>
    );
}
