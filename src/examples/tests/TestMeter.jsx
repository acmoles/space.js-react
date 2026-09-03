import { useEffect, useRef } from 'react';

import { Meter } from '@lib/index.js';

import { Example } from '@/components';

export default function TestMeterExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        const container = ref.current;

        const meter = new Meter({
            value: Math.random(),
            precision: 2
        });
        meter.animateIn();
        container.appendChild(meter.element);

        let raf;

        function animate() {
            raf = requestAnimationFrame(animate);

            meter.update();
        }

        raf = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(raf);
            meter.destroy();
        };
    }, []);

    return <Example title={title} ref={ref} center />;
}
