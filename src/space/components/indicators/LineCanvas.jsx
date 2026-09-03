import { useEffect, useImperativeHandle, useRef } from 'react';

import { useMotion } from '../../motion/index.js';

/**
 * Headless canvas drawing helper for an animated line segment, used within a
 * parent canvas composite. Renders nothing to the DOM — all drawing happens
 * via the `update()` method called by the parent on every tick.
 *
 * @param {object} props
 * @param {CanvasRenderingContext2D} [props.context] Shared canvas context.
 * @param {object} [props.ref]
 *   Exposes `setContext(ctx)`, `setStartPoint({ x, y })`,
 *   `setEndPoint({ x, y })`, `update()`, `animateIn(reverse)`,
 *   `animateOut(fast, callback)`, and `deactivate()`.
 * @example
 * <LineCanvas context={ctx} ref={ref} />
 * // In parent:
 * ref.current.setStartPoint({ x: 0, y: 0 });
 * ref.current.setEndPoint({ x: 100, y: 100 });
 * ref.current.animateIn();
 */
export function LineCanvas({ context, ref }) {
    const contextRef = useRef(context);
    const startRef = useRef({ x: 0, y: 0 });
    const endRef = useRef({ x: 0, y: 0 });
    const motion = useMotion({ alpha: 0, start: 0, progress: 0 });
    const themeRef = useRef({ lineWidth: 1.5, strokeStyle: '' });

    useEffect(() => {
        contextRef.current = context;
    }, [context]);

    // Resolve CSS custom properties after mount
    useEffect(() => {
        themeRef.current.strokeStyle =
            getComputedStyle(document.documentElement).getPropertyValue('--ui-color-line').trim();
    }, []);

    useEffect(() => () => clearTween(propsRef.current), []);

    useImperativeHandle(ref, () => ({
        setContext: ctx => {
            contextRef.current = ctx;
        },
        setStartPoint: position => {
            startRef.current.x = position.x;
            startRef.current.y = position.y;
        },
        setEndPoint: position => {
            endRef.current.x = position.x;
            endRef.current.y = position.y;
        },
        update: () => {
            const ctx = contextRef.current;
            const props = propsRef.current;

            if (!ctx || props.alpha <= 0) {
                return;
            }

            const sx = startRef.current.x;
            const sy = startRef.current.y;
            const ex = endRef.current.x;
            const ey = endRef.current.y;
            const dx = ex - sx;
            const dy = ey - sy;
            const length = Math.sqrt(dx * dx + dy * dy);
            const dash = length * props.progress;
            const gap = length - dash;
            const offset = -length * props.start;

            ctx.save();
            ctx.globalAlpha = props.alpha < 0.001 ? 0 : props.alpha;
            ctx.setLineDash([dash, gap]);
            ctx.lineDashOffset = offset;
            ctx.lineWidth = themeRef.current.lineWidth;
            ctx.strokeStyle = themeRef.current.strokeStyle;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
            ctx.restore();
        },
        animateIn: reverse => {
            const props = propsRef.current;

            clearTween(props);

            props.alpha = 0;

            tween(props, { alpha: 1 }, 500, 'easeOutSine');

            if (reverse) {
                props.start = 1;
                props.progress = 0;

                tween(props, { start: 0 }, 500, 'easeInCubic', null, () => {
                    props.progress = 1 - props.start;
                });
            } else {
                props.start = 0;
                props.progress = 0;

                tween(props, { progress: 1 }, 400, 'easeOutCubic');
            }
        },
        animateOut: (fast, callback) => {
            const props = propsRef.current;
            const duration = fast ? 400 : 500;
            const ease = fast ? 'easeOutCubic' : 'easeInCubic';

            clearTween(props);

            tween(props, { start: 1 }, duration, ease, () => {
                props.alpha = 0;
                props.start = 0;

                if (callback) {
                    callback();
                }
            }, () => {
                props.progress = 1 - props.start;
            });
        },
        deactivate: () => {
            clearTween(propsRef.current);

            tween(propsRef.current, { alpha: 0 }, 300, 'easeOutSine');
        }
    }));

    return null;
}
