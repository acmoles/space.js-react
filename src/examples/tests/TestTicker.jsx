import { useEffect, useRef } from 'react';

import { ticker } from '@lib/index.js';

import { Example } from '@/components';

export default function TestTickerExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        ticker.add(onUpdate);
        ticker.start();

        function onUpdate(time, delta, frame) {
            console.log(time, delta, frame);
        }

        const timeout = setTimeout(() => {
            ticker.remove(onUpdate);
        }, 1000);

        return () => {
            clearTimeout(timeout);
            ticker.remove(onUpdate);
        };
    }, []);

    return <Example title={title} ref={ref} />;
}
