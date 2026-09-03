import { useEffect, useRef } from 'react';

import { Meter } from '@lib/index.js';

import { Example } from '@/components';
import { useClassName } from '@/hooks';

import './Meter.css';

export default function MeterExample({ title }) {
    const ref = useRef(null);

    useClassName('scroll');

    useEffect(() => {
        const container = ref.current;

        // Meter
        const meter = new Meter({
            value: Math.random(),
            width: 200,
            precision: 2
        });
        meter.animateIn();
        container.appendChild(meter.element);

        // Meter with no text or gradient
        const meter2 = new Meter({
            noText: true,
            noGradient: true
        });
        meter2.setValue(Math.random());
        meter2.setWidth(200);
        meter2.animateIn();
        container.appendChild(meter2.element);

        // Meter with suffix
        const meter3 = new Meter({
            suffix: 'ms',
            range: 150,
            value: 150 * Math.random(),
            width: 200
        });
        meter3.animateIn();
        container.appendChild(meter3.element);

        // Meter with ghost and no range text
        const meter4 = new Meter({
            suffix: 'ms',
            range: 150,
            value: 150 * Math.random(),
            ghost: 150 * Math.random(),
            width: 200,
            noRange: true
        });
        meter4.animateIn();
        container.appendChild(meter4.element);

        // Meter with ghost
        const meter5 = new Meter({
            suffix: 'ms'
        });
        meter5.setRange(150);
        meter5.setValue(150 * Math.random());
        meter5.setGhostValue(150 * Math.random());
        meter5.setWidth(200);
        meter5.animateIn();
        container.appendChild(meter5.element);

        // Meter
        const meter6 = new Meter({
            width: 200,
            precision: 2
        });
        meter6.animateIn();
        container.appendChild(meter6.element);

        // animation

        let counter = -180;
        let raf;

        function animate() {
            raf = requestAnimationFrame(animate);

            meter.update();
            meter2.update();
            meter3.update();
            meter4.update();
            meter5.update();

            const x = 0.5 + 0.5 * Math.sin(counter++ / 100);
            meter6.update(x);
        }

        raf = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(raf);
            meter.destroy();
            meter2.destroy();
            meter3.destroy();
            meter4.destroy();
            meter5.destroy();
            meter6.destroy();
        };
    }, []);

    return <Example title={title} className='meter-example' ref={ref} />;
}
