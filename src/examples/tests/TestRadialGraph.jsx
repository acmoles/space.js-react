import { useEffect, useRef, useState } from 'react';

import { Example } from '@/components';
import { RadialGraph } from '@/space/components/radial/index.js';

export default function TestRadialGraphExample({ title }) {
    const graphRef = useRef(null);
    const [value] = useState(() => Array.from({ length: 10 }, () => Math.random()));

    useEffect(() => {
        graphRef.current?.animateIn();
    }, []);

    return (
        <Example title={title} center>
            <RadialGraph
                ref={graphRef}
                value={value}
                precision={2}
                lookupPrecision={200}
            />
        </Example>
    );
}
