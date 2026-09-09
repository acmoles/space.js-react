import { useEffect, useRef, useState } from 'react';

import { Example } from '@/components';

import { PanelDivider, PanelLabel } from '../../space/components/panels/index.js';
import { UI } from '../../space/components/ui/UI.jsx';
import { DemoPanelRows } from '../shared/DemoPanelRows.jsx';

/**
 * FPS Panel example — renders the UI with fps panel open and a full set of
 * panel controls including nested content. Mirrors `fps_panel.html`.
 */
export default function FpsPanelExample({ title }) {
    const uiRef = useRef(null);

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
        uiRef.current?.animateIn();

        return () => {
            document.body.style.backgroundColor = originalBodyBg;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <Example title={title}>
            <UI
                ref={uiRef}
                fps
                fpsOpen
                panelChildren={
                    <>
                        <PanelLabel name="FPS" />
                        <PanelDivider />
                        <DemoPanelRows
                            hostRef={uiRef}
                            backgroundColor={backgroundColor}
                            img={img}
                        />
                    </>
                }
            />
        </Example>
    );
}
