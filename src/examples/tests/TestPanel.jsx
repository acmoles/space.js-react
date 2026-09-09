import { useEffect, useRef } from 'react';

import { Example } from '@/components';

import { Panel, PanelColor } from '../../space/components/panels/index.js';

/**
 * Panel test — a single-item panel used for visual regression testing.
 * Mirrors `test_panel.html`.
 */
export default function TestPanelExample({ title }) {
    const panelRef = useRef(null);

    useEffect(() => {
        panelRef.current?.animateIn();
    }, []);

    return (
        <Example title={title} center>
            <Panel ref={panelRef}>
                {/* Swap for another row component to test a different item type:
                    PanelLabel, PanelSpacer, PanelDivider, PanelLinkRow,
                    PanelThumbnailRow, PanelGraphRow, PanelMeterRow, PanelList,
                    PanelSlider, PanelToggle, PanelContent. */}
                <PanelColor />
            </Panel>
        </Example>
    );
}
