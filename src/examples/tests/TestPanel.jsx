import { useEffect, useRef, useState } from 'react';

import { Example } from '@/components';

import { Panel } from '../../space/components/panels/Panel.jsx';

/**
 * Panel test — a single-item panel used for visual regression testing.
 * Mirrors `test_panel.html`.
 */
export default function TestPanelExample({ title }) {
    const panelRef = useRef(null);

    const [items] = useState(() => [
        // Uncomment to test different item types:
        // { name: 'FPS' }
        // { type: 'spacer' }
        // { type: 'divider' }
        // { type: 'link' }
        // { type: 'thumbnail' }
        // { type: 'graph' }
        // { type: 'meter' }
        // { type: 'list' }
        // { type: 'slider' }
        // { type: 'toggle' }
        // { type: 'content' }
        { type: 'color' }
    ]);

    useEffect(() => {
        panelRef.current?.animateIn();
    }, []);

    return (
        <Example title={title} center>
            <Panel ref={panelRef} items={items} />
        </Example>
    );
}
