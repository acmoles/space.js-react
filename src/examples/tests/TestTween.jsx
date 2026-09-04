import { useEffect } from 'react';

import { ticker } from '@lib/index.js';

import { Example } from '@/components';
import { useMotion } from '@/space';

/**
 * Tweens a plain number via the tween engine and logs each animated value to
 * the console, matching the original test_tween.html.
 */
export default function TestTweenExample({ title }) {
    const motion = useMotion({ radius: 0 });

    useEffect(() => {
        ticker.start();

        motion.animate({ radius: 24, spring: 1.2, damping: 0.4 }, 1000, 'easeOutElastic', null, () => {
            console.log(motion.values.radius);
        });
    }, [motion]);

    return <Example title={title} />;
}
