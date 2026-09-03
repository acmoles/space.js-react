import { useEffect, useImperativeHandle, useRef } from 'react';

import { degToRad } from '@lib/utils/Utils.js';

import { useAnimation, useMotion, useTicker } from '../../motion/index.js';

// Fixed DPR of 2 — identical to the original ProgressCanvas
const CANVAS_DPR = 2;

/**
 * A canvas-based arc progress indicator that tweens smoothly from 0 to 1.
 *
 * @param {object} props
 * @param {number} [props.size=32] Diameter in CSS pixels.
 * @param {number} [props.progress] Target progress value (0–1). Animated via tween.
 * @param {function} [props.onComplete] Called when progress reaches 1.
 * @param {object} [props.ref] Exposes `animateIn()` and `animateOut(callback)`.
 * @example
 * <ProgressCanvas progress={loadProgress} onComplete={() => setLoaded(true)} ref={ref} />
 */
export function ProgressCanvas({
    size = 32,
    progress: progressProp = 0,
    onComplete,
    ref
}) {
    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.4;
    const startAngle = degToRad(-90);

    const [rootRef, root] = useAnimation();
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const motion = useMotion({ progress: 0 });
    const needsUpdateRef = useRef(false);
    const onCompleteRef = useRef(onComplete);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    });

    // Set up canvas context and scale once after mount
    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        canvas.width = Math.round(size * CANVAS_DPR);
        canvas.height = Math.round(size * CANVAS_DPR);
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;

        const ctx = canvas.getContext('2d');

        ctx.scale(CANVAS_DPR, CANVAS_DPR);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--ui-color').trim();

        ctxRef.current = ctx;

        // Draw initial state
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, startAngle);
        ctx.stroke();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Animate to new progress value whenever the prop changes
    useEffect(() => {
        motion.stop();

        needsUpdateRef.current = true;

        motion.animate({ progress: progressProp }, 500, 'easeOutCubic', () => {
            needsUpdateRef.current = false;

            if (motion.values.progress >= 1 && onCompleteRef.current) {
                onCompleteRef.current();
            }
        });
    }, [motion, progressProp]);

    useTicker(() => {
        if (!needsUpdateRef.current || !ctxRef.current) {
            return;
        }

        const canvas = canvasRef.current;
        const ctx = ctxRef.current;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, startAngle + degToRad(360 * motion.values.progress));
        ctx.stroke();
    });

    useImperativeHandle(ref, () => ({
        animateIn: () => root.stop().set({ scale: 1, opacity: 0 }).animate({ opacity: 1 }, 400, 'easeOutCubic'),
        animateOut: callback => root.stop().animate({ scale: 1.1, opacity: 0 }, 400, 'easeInCubic', callback)
    }), [root]);

    return <canvas ref={node => { rootRef.current = node; canvasRef.current = node; }} />;
}
