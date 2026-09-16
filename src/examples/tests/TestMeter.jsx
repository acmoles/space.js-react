import { useEffect, useRef, useState } from 'react';

import { Example } from '@/components';

import { Meter } from '@/space/components/graphs/index.js';

export default function TestMeterExample({ title }) {
    const meterRef = useRef(null);
    const [value] = useState(Math.random);

    useEffect(() => {
        meterRef.current?.animateIn();
    }, []);

    return (
        <Example title={title} center>
            <Meter
                ref={meterRef}
                value={value}
                precision={2}
            />
        </Example>
    );
}
