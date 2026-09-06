import { useEffect, useRef, useState } from 'react';

import { clearTween, tween } from '@lib/index.js';

import { Example } from '@/components';
import { drawLine, useTicker } from '@/space';

import './Close.css';

const SIZE = 90;
const RADIUS = SIZE * 0.4;
const ICON_SIZE = 22;
const ICON_OFFSET = (SIZE - ICON_SIZE) / 2;

/**
 * SVG close-button indicator: a circle drawn in followed by a cross drawn in,
 * toggled by click. Self-contained — no matching indicator component yet.
 */
function CloseButton() {
    const circleRef = useRef(null);
    const line1Ref = useRef(null);
    const line2Ref = useRef(null);

    const needsUpdateRef = useRef(false);
    const animatedInRef = useRef(false);

    // Plain objects as tween targets, stable via useState initialiser
    const [circle] = useState(() => ({ start: 0, progress: 0 }));
    const [line1] = useState(() => ({ progress: 0 }));
    const [line2] = useState(() => ({ progress: 0 }));

    useTicker(() => {
        if (!needsUpdateRef.current) {
            return;
        }

        drawLine(circleRef.current, circle.progress, circle.start, -0.25);
        drawLine(line1Ref.current, line1.progress, 0, 0);
        drawLine(line2Ref.current, line2.progress, 0, 0);
    });

    useEffect(() => {
        // Set initial dasharray so strokes start invisible
        drawLine(circleRef.current, 0, 0, -0.25);
        drawLine(line1Ref.current, 0, 0, 0);
        drawLine(line2Ref.current, 0, 0, 0);

        const animateIn = () => {
            if (needsUpdateRef.current) {
                return;
            }

            animatedInRef.current = true;
            needsUpdateRef.current = true;

            tween(circle, { progress: 1 }, 1000, 'easeOutCubic', () => {
                tween(line1, { progress: 1 }, 400, 'easeOutCubic', () => {
                    tween(line2, { progress: 1 }, 400, 'easeOutCubic', () => {
                        needsUpdateRef.current = false;
                    });
                });
            });
        };

        animateIn();

        return () => {
            clearTween(circle);
            clearTween(line1);
            clearTween(line2);
            needsUpdateRef.current = false;
            animatedInRef.current = false;
        };
    }, [circle, line1, line2]);

    const handleClick = () => {
        if (animatedInRef.current) {
            if (needsUpdateRef.current) {
                return;
            }

            animatedInRef.current = false;
            needsUpdateRef.current = true;

            // Erase by driving circle.start 0→1 while progress = 1 − start
            tween(circle, { start: 1 }, 1000, 'easeInOutCubic', () => {
                circle.start = 0;
                needsUpdateRef.current = false;
            }, () => {
                circle.progress = 1 - circle.start;
                line1.progress = circle.progress;
                line2.progress = circle.progress;
            });
        } else {
            if (needsUpdateRef.current) {
                return;
            }

            animatedInRef.current = true;
            needsUpdateRef.current = true;

            tween(circle, { progress: 1 }, 1000, 'easeOutCubic', () => {
                tween(line1, { progress: 1 }, 400, 'easeOutCubic', () => {
                    tween(line2, { progress: 1 }, 400, 'easeOutCubic', () => {
                        needsUpdateRef.current = false;
                    });
                });
            });
        }
    };

    return (
        <svg className="close-button" width={SIZE} height={SIZE} onClick={handleClick}>
            <circle
                ref={circleRef}
                className="close-stroke"
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
            />
            <g
                className="close-stroke"
                transform={`translate(${ICON_OFFSET}, ${ICON_OFFSET})`}
            >
                <line ref={line1Ref} x1={0} y1={0} x2={ICON_SIZE} y2={ICON_SIZE} />
                <line ref={line2Ref} x1={ICON_SIZE} y1={0} x2={0} y2={ICON_SIZE} />
            </g>
        </svg>
    );
}

export default function CloseExample({ title }) {
    return (
        <Example title={title}>
            <CloseButton />
        </Example>
    );
}
