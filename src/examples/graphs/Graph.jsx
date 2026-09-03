import { useEffect, useRef } from 'react';

import { Graph, GraphSegments, clamp, mapLinear } from '@lib/index.js';

import { Example } from '@/components';
import { useClassName } from '@/hooks';

import './Graph.css';

export default function GraphExample({ title }) {
    const ref = useRef(null);

    useClassName('scroll');

    useEffect(() => {
        const container = ref.current;

        // Graph
        const graph = new Graph({
            value: Array.from({ length: 10 }, () => Math.random()),
            width: document.documentElement.clientWidth * 0.74,
            height: clamp(mapLinear(document.documentElement.clientHeight, 600, 1000, 40, 80), 40, 80),
            precision: 2,
            lookupPrecision: 200
        });
        graph.animateIn();
        container.appendChild(graph.element);

        // Graph with 2 segments
        const graph2 = new GraphSegments({
            precision: 2,
            lookupPrecision: 100, // per segment
            segments: [2, 2] // length of each segment (minimum length of 2)
        });
        graph2.setArray(Array.from({ length: 4 }, () => Math.random()));
        graph2.setSize(document.documentElement.clientWidth * 0.74, clamp(mapLinear(document.documentElement.clientHeight, 600, 1000, 40, 80), 40, 80));
        graph2.animateIn();
        container.appendChild(graph2.element);

        // Graph with 3 segments and labels
        const graph3 = new GraphSegments({
            precision: 2,
            lookupPrecision: 100, // per segment
            segments: [5, 5, 5], // length of each segment (minimum length of 2)
            labels: ['Segment 1', 'Segment 2', 'Segment 3']
        });
        graph3.setArray(Array.from({ length: 15 }, () => Math.random()));
        graph3.setSize(document.documentElement.clientWidth * 0.74, clamp(mapLinear(document.documentElement.clientHeight, 600, 1000, 40, 80), 40, 80));
        graph3.animateIn();
        container.appendChild(graph3.element);

        // Graph with ghost
        const graph4 = new Graph({
            precision: 2,
            lookupPrecision: 200
        });
        graph4.setArray(Array.from({ length: 10 }, () => Math.random()));
        graph4.setGhostArray(Array.from({ length: 10 }, () => Math.random()));
        graph4.setSize(document.documentElement.clientWidth * 0.74, clamp(mapLinear(document.documentElement.clientHeight, 600, 1000, 40, 80), 40, 80));
        graph4.animateIn();
        container.appendChild(graph4.element);

        // Graph with ghost value
        const graph5 = new Graph({
            resolution: 311,
            precision: 2,
            ghost: true
        });
        graph5.setSize(document.documentElement.clientWidth * 0.74, clamp(mapLinear(document.documentElement.clientHeight, 600, 1000, 40, 80), 40, 80));
        graph5.animateIn();
        container.appendChild(graph5.element);

        // Graph with uneven segments, ghost and labels
        const graph6 = new GraphSegments({
            value: Array.from({ length: 13 }, () => Math.random()),
            ghost: Array.from({ length: 13 }, () => Math.random()),
            precision: 2,
            lookupPrecision: [100, 100, 50], // per segment
            segments: [5, 5, 3], // length of each segment (minimum length of 2)
            ratio: [0.45, 0.45, 0.1], // normalized ratio of each segment
            labels: ['Segment 1', 'Segment 2', 'Segment 3']
        });
        graph6.setData([Array.from({ length: 10 }, (_, i) => i + 1), Array.from({ length: 10 }, (_, i) => i + 1), []]);
        graph6.setSize(document.documentElement.clientWidth * 0.74, clamp(mapLinear(document.documentElement.clientHeight, 600, 1000, 40, 80), 40, 80));
        graph6.animateIn();
        container.appendChild(graph6.element);

        // animation

        let counter = 0;
        let raf;

        function animate() {
            raf = requestAnimationFrame(animate);

            graph.update();
            graph2.update();
            graph3.update();
            graph4.update();

            const y = 0.5 + 0.5 * Math.sin(counter++ / 9) * 0.5;
            graph5.update(y);

            graph6.update();
        }

        raf = requestAnimationFrame(animate);

        // resize

        function onWindowResize() {
            const width = document.documentElement.clientWidth * 0.74;
            const height = clamp(mapLinear(document.documentElement.clientHeight, 600, 1000, 40, 80), 40, 80);

            graph.setSize(width, height);
            graph2.setSize(width, height);
            graph3.setSize(width, height);
            graph4.setSize(width, height);
            graph5.setSize(width, height);
            graph6.setSize(width, height);
        }

        window.addEventListener('resize', onWindowResize);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', onWindowResize);
            graph.destroy();
            graph2.destroy();
            graph3.destroy();
            graph4.destroy();
            graph5.destroy();
            graph6.destroy();
        };
    }, []);

    return <Example title={title} className='graph-example' ref={ref} />;
}
