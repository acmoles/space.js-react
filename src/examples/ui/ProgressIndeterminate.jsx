import { useEffect, useRef, useState } from 'react';

import { clearTween, tween } from '@lib/index.js';

import { Example } from '@/components';
import { drawLine, useDelayedCall, useTicker } from '@/space';

import './ProgressIndeterminate.css';

const SIZE = 90;
const RADIUS = SIZE * 0.4;

/**
 * SVG arc progress indicator running in indeterminate (looping) mode.
 * Ported directly from the original ProgressIndeterminate class; no
 * indicator-layer component exists for this variant yet.
 */
function ProgressIndeterminate() {
    const svgRef = useRef(null);
    const circleRef = useRef(null);
    const needsUpdateRef = useRef(false);
    const animatedInRef = useRef(false);
    const delay = useDelayedCall();

    // Plain object used as the tween target (matches original pattern)
    const [circle] = useState(() => ({ start: 0, progress: 0 }));

    useTicker(() => {
        if (!needsUpdateRef.current) {
            return;
        }

        drawLine(circleRef.current, circle.progress, circle.start, -0.25);
    });

    useEffect(() => {
        // Draw empty initial state so the circle is invisible before animateIn
        drawLine(circleRef.current, 0, 0, -0.25);

        const start = () => {
            tween(circle, { progress: 1 }, 1000, 'easeOutCubic', () => {
                tween(circle, { start: 1 }, 1000, 'easeInOutCubic', () => {
                    circle.start = 0;

                    delay(500, () => {
                        if (animatedInRef.current) {
                            start();
                        } else {
                            needsUpdateRef.current = false;
                        }
                    });
                }, () => {
                    circle.progress = 1 - circle.start;
                });
            });
        };

        animatedInRef.current = true;
        needsUpdateRef.current = true;
        start();

        return () => {
            clearTween(circle);
            animatedInRef.current = false;
            needsUpdateRef.current = false;
        };
    }, [circle, delay]);

    const handleClick = () => {
        if (needsUpdateRef.current) {
            animatedInRef.current = false;
        }
    };

    return (
        <svg ref={svgRef} className="progress-indeterminate" width={SIZE} height={SIZE} onClick={handleClick}>
            <circle
                ref={circleRef}
                className="progress-indeterminate-circle"
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
            />
        </svg>
    );
}

export default function ProgressIndeterminateExample({ title }) {
    return (
        <Example title={title}>
            <ProgressIndeterminate />
        </Example>
    );
}
