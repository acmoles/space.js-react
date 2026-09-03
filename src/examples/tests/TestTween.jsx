import { useEffect, useRef } from 'react';

import { clearTween, ticker, tween } from '@lib/index.js';

import { Example } from '@/components';

export default function TestTweenExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        ticker.start();

        const data = {
            radius: 0
        };

        tween(data, { radius: 24, spring: 1.2, damping: 0.4 }, 1000, 'easeOutElastic', null, () => {
            console.log(data.radius);
        });

        return () => {
            clearTween(data);
        };
    }, []);

    return <Example title={title} ref={ref} />;
}
