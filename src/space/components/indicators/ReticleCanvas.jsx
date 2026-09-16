import { useEffect, useImperativeHandle, useRef } from 'react';

import { TwoPI } from '@lib/utils/Utils.js';

import { useMotion } from '../../motion/index.js';

/**
 * Headless canvas drawing helper for a circular reticle, used within a
 * parent canvas composite. Renders nothing to the DOM — all drawing happens
 * via the `update()` method called by the parent on every tick.
 *
 * @param {object} props
 * @param {CanvasRenderingContext2D} [props.context] Shared canvas context.
 * @param {object} [props.ref]
 *   Exposes `position { x, y }`, `setContext(ctx)`, `update()`,
 *   `animateIn()`, `animateOut(callback)`, and `animatedIn`.
 * @example
 * <ReticleCanvas context={ctx} ref={ref} />
 * // In parent ticker:
 * ref.current.position.x = mouseX;
 * ref.current.position.y = mouseY;
 * ref.current.update();
 */
export function ReticleCanvas({ context, ref }) {
    const contextRef = useRef(context);
    const positionRef = useRef({ x: 0, y: 0 });
    const animatedInRef = useRef(false);
    const motion = useMotion({ scale: 1, alpha: 0 });
    const themeRef = useRef({ lineWidth: 1.5, strokeStyle: '' });

    useEffect(() => {
        contextRef.current = context;
    }, [context]);

    // Resolve CSS custom properties after mount
    useEffect(() => {
        themeRef.current.strokeStyle =
            getComputedStyle(document.documentElement).getPropertyValue('--ui-color').trim();
    }, []);

    useImperativeHandle(ref, () => ({
        get animatedIn() {
            return animatedInRef.current;
        },
        position: positionRef.current,
        setContext: ctx => {
            contextRef.current = ctx;
        },
        update: () => {
            const ctx = contextRef.current;
            const v = motion.values;

            if (!ctx || v.alpha <= 0) {
                return;
            }

            ctx.save();
            ctx.globalAlpha = v.alpha < 0.001 ? 0 : v.alpha;
            ctx.translate(positionRef.current.x, positionRef.current.y);
            ctx.scale(v.scale, v.scale);
            ctx.lineWidth = themeRef.current.lineWidth;
            ctx.strokeStyle = themeRef.current.strokeStyle;
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, TwoPI);
            ctx.stroke();
            ctx.restore();
        },
        animateIn: () => {
            motion.stop();

            motion.values.scale = 0.25;
            motion.values.alpha = 0;

            motion.animate({ scale: 1, alpha: 1 }, 400, 'easeOutCubic');

            animatedInRef.current = true;
        },
        animateOut: callback => {
            motion.stop();

            motion.animate({ scale: 0, alpha: 0 }, 500, 'easeInCubic', () => {
                animatedInRef.current = false;

                if (callback) {
                    callback();
                }
            });
        }
    }));

    return null;
}
