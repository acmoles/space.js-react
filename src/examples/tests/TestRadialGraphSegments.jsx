import { useEffect, useRef, useState } from 'react';

import { Example } from '@/components';
import { RadialGraphSegments } from '@/space/components/radial/index.js';

const SEGMENTS = [5, 5];

export default function TestRadialGraphSegmentsExample({ title }) {
    const graphRef = useRef(null);
    const [value] = useState(() => Array.from({ length: 10 }, () => Math.random()));

    useEffect(() => {
        graphRef.current?.animateIn();
    }, []);

    return (
        <Example title={title} center>
            <RadialGraphSegments
                ref={graphRef}
                value={value}
                precision={2}
                lookupPrecision={100}
                segments={SEGMENTS}
            />
        </Example>
    );
}
