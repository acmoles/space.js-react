import { useImperativeHandle } from 'react';

import { useAnimation } from '../../motion/index.js';

import './TargetNumber.css';

/**
 * A small boxed target-number indicator used by Tracker and PointInfo.
 *
 * @param {object} props
 * @param {string|number} [props.targetNumber] The number to display inside the box.
 * @param {object} [props.style] Extra inline styles applied to the root element (e.g. positioning from parent).
 * @param {object} [props.ref] Exposes `animateIn(delay)` and `animateOut(fast)`.
 * @example
 * <TargetNumber targetNumber={1} ref={ref} />
 */
export function TargetNumber({ targetNumber, style: styleProp, ref }) {
    const dpr = window.devicePixelRatio;
    const size = dpr > 1 ? 17 : 18;
    const numberLeft = dpr > 1 ? 4 : 5;
    const lineHeight = size - (dpr > 1 ? 4 : 3);

    const [rootRef, root] = useAnimation({ visibility: 'hidden' });

    useImperativeHandle(ref, () => ({
        animateIn: delay => {
            root.stop().set({ visibility: 'visible', opacity: 0 });
            root.animate({ opacity: 1 }, 400, 'easeOutCubic', delay);
        },
        animateOut: fast => {
            root.stop();

            if (fast) {
                root.set({ opacity: 0, visibility: 'hidden' });
            } else {
                root.animate({ opacity: 0 }, 400, 'easeOutCubic', () => {
                    root.set({ visibility: 'hidden' });
                });
            }
        }
    }), [root]);

    return (
        <div
            ref={rootRef}
            className="target-number"
            style={{ ...styleProp, width: size, height: size }}
        >
            <span
                className="number"
                style={{
                    left: numberLeft,
                    lineHeight: `${lineHeight}px`
                }}
            >
                {targetNumber}
            </span>
        </div>
    );
}
