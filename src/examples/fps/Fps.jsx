import { useEffect, useRef } from 'react';

import { Example } from '@/components';

import { UI } from '@/space/components/ui/UI.jsx';

/**
 * FPS example — renders the space UI with FPS counter only. Mirrors `fps.html`.
 */
export default function FpsExample({ title }) {
    const uiRef = useRef(null);

    useEffect(() => {
        uiRef.current?.animateIn();
    }, []);

    return (
        <Example title={title}>
            <UI ref={uiRef} fps />
        </Example>
    );
}
