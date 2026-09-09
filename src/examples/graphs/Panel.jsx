import { useEffect, useRef, useState } from 'react';

import { Example } from '@/components';

import { Panel } from '../../space/components/panels/index.js';
import { DemoPanelRows } from '../shared/DemoPanelRows.jsx';

/**
 * Standalone Panel example — a full-featured panel centered in the viewport.
 * Mirrors `panel.html`.
 */
export default function PanelExample({ title }) {
    const panelRef = useRef(null);

    const [backgroundColor] = useState(() =>
        getComputedStyle(document.querySelector(':root')).getPropertyValue('--bg-color').trim()
    );
    const [originalBodyBg] = useState(() => document.body.style.backgroundColor);
    const [img] = useState(() => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = 'https://space.js.org/assets/meta/share.png';
        return image;
    });

    useEffect(() => {
        panelRef.current?.animateIn();

        return () => {
            document.body.style.backgroundColor = originalBodyBg;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <Example title={title} center>
            <Panel ref={panelRef}>
                <DemoPanelRows
                    hostRef={panelRef}
                    backgroundColor={backgroundColor}
                    img={img}
                />
            </Panel>
        </Example>
    );
}
