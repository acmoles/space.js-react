import { useEffect, useRef } from 'react';

import { UI } from '@lib/index.js';

import { Example } from '@/components';

export default function Fps({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        const container = ref.current;

        const ui = new UI({ fps: true });
        ui.animateIn();
        container.appendChild(ui.element);

        let raf;

        function animate() {
            raf = requestAnimationFrame(animate);

            ui.update();
        }

        raf = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(raf);
            ui.destroy();
        };
    }, []);

    return <Example title={title} ref={ref} />;
}
