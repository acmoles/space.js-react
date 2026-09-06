import { useEffect, useState } from 'react';

import { Example } from '@/components';
import { useTicker } from '@/space';

/**
 * Logs time, delta and frame to the console for one second via the shared
 * ticker, the same as the original test_ticker.html.
 */
export default function TestTickerExample({ title }) {
    const [enabled, setEnabled] = useState(true);

    useTicker((time, delta, frame) => {
        console.log(time, delta, frame);
    }, enabled);

    useEffect(() => {
        const id = setTimeout(() => setEnabled(false), 1000);

        return () => clearTimeout(id);
    }, []);

    return <Example title={title} />;
}
