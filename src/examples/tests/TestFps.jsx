import { useEffect, useRef } from 'react';

import { Example } from '@/components';
import { UI } from '@/space/index.js';

export default function TestFpsExample({ title }) {
    const uiRef = useRef(null);

    useEffect(() => {
        uiRef.current.animateIn();
    }, []);

    return (
        <Example title={title}>
            <UI fps ref={uiRef} />
        </Example>
    );
}
