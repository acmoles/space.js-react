import { useEffect, useImperativeHandle, useRef } from 'react';

import { useAnimation, useMotion, drawLine, useTicker } from '../../motion/index.js';

import './Progress.css';

/**
 * An SVG arc progress indicator that tweens smoothly from 0 to 1.
 *
 * @param {object} props
 * @param {number} [props.size=32] Diameter in CSS pixels.
 * @param {number} [props.progress] Target progress value (0–1). Animated via tween.
 * @param {function} [props.onComplete] Called when progress reaches 1.
 * @param {object} [props.ref] Exposes `animateIn()` and `animateOut(callback)`.
 * @example
 * <Progress progress={loadProgress} onComplete={() => setLoaded(true)} ref={ref} />
 */
export function Progress({
    size = 32,
    progress: progressProp = 0,
    onComplete,
    ref
}) {
    const radius = size * 0.4;

    const [rootRef, root] = useAnimation();
    const circleRef = useRef(null);
    const motion = useMotion({ progress: 0 });
    const needsUpdateRef = useRef(false);
    const onCompleteRef = useRef(onComplete);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    });

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
        if (needsUpdateRef.current) {
            // start=0, offset=-0.25 → starts arc at 12 o'clock
            drawLine(circleRef.current, motion.values.progress, 0, -0.25);
        }
    });

    // Draw initial state after mount
    useEffect(() => {
        drawLine(circleRef.current, 0, 0, -0.25);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useImperativeHandle(ref, () => ({
        animateIn: () => root.stop().set({ scale: 1, opacity: 0 }).animate({ opacity: 1 }, 400, 'easeOutCubic'),
        animateOut: callback => root.stop().animate({ scale: 1.1, opacity: 0 }, 400, 'easeInCubic', callback)
    }), [root]);

    return (
        <svg ref={rootRef} width={size} height={size}>
            <circle
                ref={circleRef}
                className="progress-circle"
                cx={size / 2}
                cy={size / 2}
                r={radius}
            />
        </svg>
    );
}
