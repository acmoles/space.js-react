import { useEffect, useRef, useState } from 'react';

import { Example } from '@/components';
import { drawLine, useMagnetic, useMotion, useTicker } from '@/space';

import './Magnetic.css';

const SIZE = 90;
const RADIUS = SIZE * 0.4;

/**
 * A progress ring that is drawn in on mount, follows the pointer while it is
 * nearby, and animates out when clicked.
 */
function Progress({ onComplete }) {
    const circle = useRef(null);
    const [clicked, setClicked] = useState(false);

    const motion = useMotion({ progress: 0 });
    const [magneticRef, magnetic] = useMagnetic({ enabled: !clicked });

    useTicker(() => {
        drawLine(circle.current, motion.values.progress, 0, -0.25);
    });

    useEffect(() => {
        motion.animate({ progress: 1 }, 500, 'easeOutCubic');
    }, [motion]);

    const handleClick = () => {
        if (clicked) {
            return;
        }

        setClicked(true);

        // The magnetic transform and the animate out share the element, so
        // both run through the same controls
        magnetic.stop().animate({ scale: 0.9, opacity: 0 }, 400, 'easeInCubic', onComplete);
    };

    return (
        <svg
            ref={magneticRef}
            className="progress"
            width={SIZE}
            height={SIZE}
            onClick={handleClick}
        >
            <circle ref={circle} cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} />
        </svg>
    );
}

export default function MagneticExample({ title }) {
    const [visible, setVisible] = useState(true);

    return (
        <Example title={title}>
            {visible && <Progress onComplete={() => setVisible(false)} />}
        </Example>
    );
}
