import { useEffect, useRef } from 'react';

import { useAnimation } from '../motion/index.js';

/**
 * Makes an element magnetic, pulling it towards the pointer when the pointer
 * comes within range and springing it back when the pointer leaves.
 *
 * A declarative version of the Space.js `Magnetic` extra, with the same
 * thresholds, tweens and easings.
 *
 * @param {object} [options]
 * @param {number} [options.threshold] Extra distance around the element, in pixels.
 * @param {boolean} [options.enabled] Whether the element responds to the pointer.
 * @returns {Array} `[ref, controls]`, the same pair `useAnimation` returns.
 * @example
 * const [ref] = useMagnetic();
 *
 * return <div ref={ref} />;
 */
export function useMagnetic({ threshold = 50, enabled = true } = {}) {
    const [ref, controls] = useAnimation({ willChange: 'transform' });
    const hoveredIn = useRef(false);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const onHover = ({ type, x, y }) => {
            controls.stop();

            if (type === 'over') {
                controls.animate({
                    x: x * 0.8,
                    y: y * 0.8,
                    skewX: x * 0.125,
                    skewY: 0,
                    rotation: x * 0.05,
                    scale: 1.1
                }, 500, 'easeOutCubic');

                hoveredIn.current = true;
            } else {
                controls.animate({
                    x: 0,
                    y: 0,
                    skewX: 0,
                    skewY: 0,
                    rotation: 0,
                    scale: 1,
                    spring: 1.2,
                    damping: 0.4
                }, 1000, 'easeOutElastic');

                hoveredIn.current = false;
            }
        };

        const onPointerMove = ({ clientX, clientY }) => {
            if (!ref.current) {
                return;
            }

            const { left, top, width, height } = ref.current.getBoundingClientRect();

            const x = clientX - (left + width / 2);
            const y = clientY - (top + height / 2);
            const distance = Math.sqrt(x * x + y * y);

            if (distance < (width + height) / 2 + threshold) {
                onHover({ type: 'over', x, y });
            } else if (hoveredIn.current) {
                onHover({ type: 'out' });
            }
        };

        const onPointerUp = () => onHover({ type: 'out' });

        window.addEventListener('pointerdown', onPointerMove);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);

        return () => {
            window.removeEventListener('pointerdown', onPointerMove);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };
    }, [ref, controls, threshold, enabled]);

    return [ref, controls];
}
