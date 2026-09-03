import { useEffect, useRef, useState } from 'react';

import { Example } from '@/components';

import { GraphSegments } from '@/space/components/graphs/index.js';

const SEGMENTS = [5, 5];

export default function TestGraphSegmentsExample({ title }) {
    const graphRef = useRef(null);
    const [value] = useState(() => Array.from({ length: 10 }, () => Math.random()));

    useEffect(() => {
        graphRef.current?.animateIn();
    }, []);

    return (
        <Example title={title} center>
            <GraphSegments
                ref={graphRef}
                value={value}
                precision={2}
                lookupPrecision={100}
                segments={SEGMENTS}
            />
        </Example>
    );
}
