import { useEffect, useRef, useState } from 'react';

import { Example } from '@/components';

import { Graph } from '@/space/components/graphs/index.js';

export default function TestGraphExample({ title }) {
    const graphRef = useRef(null);
    const [value] = useState(() => Array.from({ length: 10 }, () => Math.random()));

    useEffect(() => {
        graphRef.current?.animateIn();
    }, []);

    return (
        <Example title={title} center>
            <Graph
                ref={graphRef}
                value={value}
                precision={2}
                lookupPrecision={100}
            />
        </Example>
    );
}
