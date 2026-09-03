import { useEffect, useImperativeHandle, useRef } from 'react';

import { clearTween, tween } from '@lib/tween/Tween.js';

import { useAnimation } from '../../motion/index.js';
import { useTicker } from '../../motion/index.js';

import './Progress.css';

/**
 * Applies the SVG dash-array progress to a circle element.
 * Equivalent to Interface.drawLine() for SVG circles.
 */
function applyCircleProgress(circleEl, progress, circumference, dashOffset) {
    if (!circleEl) {
        return;
    }

    const dash = circumference * progress;
    const gap = circumference - dash;

    circleEl.style.strokeDasharray = `${dash},${gap}`;
    circleEl.style.strokeDashoffset = dashOffset;
}

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
    const circumference = 2 * Math.PI * radius;
    // start=0, offset=-0.25 → dashOffset = -circumference*(0+(-0.25)) = circumference*0.25
    const dashOffset = circumference * 0.25;

    const [rootRef, root] = useAnimation();
    const circleRef = useRef(null);
    const propsRef = useRef({ progress: 0 });
    const needsUpdateRef = useRef(false);
    const onCompleteRef = useRef(onComplete);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    });

    // Animate to new progress value whenever the prop changes
    useEffect(() => {
        clearTween(propsRef.current);

        needsUpdateRef.current = true;

        tween(propsRef.current, { progress: progressProp }, 500, 'easeOutCubic', () => {
            needsUpdateRef.current = false;

            if (propsRef.current.progress >= 1 && onCompleteRef.current) {
                onCompleteRef.current();
            }
        });
    }, [progressProp]);

    useTicker(() => {
        if (needsUpdateRef.current) {
            applyCircleProgress(circleRef.current, propsRef.current.progress, circumference, dashOffset);
        }
    });

    // Draw initial state after mount
    useEffect(() => {
        applyCircleProgress(circleRef.current, 0, circumference, dashOffset);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => () => clearTween(propsRef.current), []);

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
