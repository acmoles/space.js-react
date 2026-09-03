import { useEffect, useRef } from 'react';

import { Panel, PanelItem } from '@lib/index.js';

import { Example } from '@/components';

export default function TestPanelExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        const container = ref.current;

        const panel = new Panel();
        const item = new PanelItem({
            // name: 'FPS'
            // type: 'spacer'
            // type: 'divider'
            // type: 'link'
            // type: 'thumbnail'
            // type: 'graph'
            // type: 'meter'
            // type: 'list'
            // type: 'slider'
            // type: 'toggle'
            // type: 'content'
            type: 'color'
        });
        panel.add(item);
        panel.animateIn();
        container.appendChild(panel.element);

        let raf;

        function animate() {
            raf = requestAnimationFrame(animate);

            panel.update();
        }

        raf = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(raf);
            panel.destroy();
        };
    }, []);

    return <Example title={title} ref={ref} center />;
}
