import { useRef } from 'react';

import { Example } from '@/components';
import { drawLine, useEventListener, useMotion, useTicker } from '@/space';

import './Tween.css';

const SIZE = 90;
const RADIUS = SIZE * 0.4;

/**
 * A progress ring that squashes while the pointer is down and springs back on
 * release, drawn by animating the radius and the stroke dash of a circle.
 */
function Progress() {
    const circle = useRef(null);
    const motion = useMotion({ radius: RADIUS, progress: 1 });

    useTicker(() => {
        if (!circle.current) {
            return;
        }

        circle.current.setAttribute('r', motion.values.radius);

        drawLine(circle.current, motion.values.progress, 0, -0.25);
    });

    useEventListener(window, 'pointerdown', () => {
        motion.stop().animate({ radius: RADIUS * 0.5 }, 500, 'easeOutCubic');
    });

    useEventListener(window, 'pointerup', () => {
        motion.stop().animate({ radius: RADIUS, spring: 1.2, damping: 0.4 }, 1000, 'easeOutElastic');
    });

    return (
        <svg className="progress" width={SIZE} height={SIZE}>
            <circle ref={circle} cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} />
        </svg>
    );
}

export default function TweenExample({ title }) {
    return (
        <Example title={title}>
            <Progress />
        </Example>
    );
}
