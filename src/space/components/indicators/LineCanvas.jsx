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
            const v = motion.values;

            if (!ctx || v.alpha <= 0) {
                return;
            }

            const sx = startRef.current.x;
            const sy = startRef.current.y;
            const ex = endRef.current.x;
            const ey = endRef.current.y;
            const dx = ex - sx;
            const dy = ey - sy;
            const length = Math.sqrt(dx * dx + dy * dy);
            const dash = length * v.progress;
            const gap = length - dash;
            const offset = -length * v.start;

            ctx.save();
            ctx.globalAlpha = v.alpha < 0.001 ? 0 : v.alpha;
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
            const v = motion.values;

            motion.stop();

            v.alpha = 0;

            motion.animate({ alpha: 1 }, 500, 'easeOutSine');

            if (reverse) {
                v.start = 1;
                v.progress = 0;

                motion.animate({ start: 0 }, 500, 'easeInCubic', 0, null, () => {
                    v.progress = 1 - v.start;
                });
            } else {
                v.start = 0;
                v.progress = 0;

                motion.animate({ progress: 1 }, 400, 'easeOutCubic');
            }
        },
        animateOut: (fast, callback) => {
            const v = motion.values;
            const duration = fast ? 400 : 500;
            const ease = fast ? 'easeOutCubic' : 'easeInCubic';

            motion.stop();

            // tween used directly for the onUpdate callback
            motion.animate({ start: 1 }, duration, ease, 0, () => {
                v.alpha = 0;
                v.start = 0;

                if (callback) {
                    callback();
                }
            }, () => {
                v.progress = 1 - v.start;
            });
        },
        deactivate: () => {
            motion.animate({ alpha: 0 }, 300, 'easeOutSine');
        }
    }));

    return null;
}
