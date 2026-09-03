import { useEffect, useRef } from 'react';

import { Graph } from '@lib/index.js';

import { Example } from '@/components';

export default function TestGraphExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        const container = ref.current;

        const graph = new Graph({
            value: Array.from({ length: 10 }, () => Math.random()),
            precision: 2,
            lookupPrecision: 100
        });
        graph.animateIn();
        container.appendChild(graph.element);

        let raf;

        function animate() {
            raf = requestAnimationFrame(animate);

            graph.update();
        }

        raf = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(raf);
            graph.destroy();
        };
    }, []);

    return <Example title={title} ref={ref} center />;
}
