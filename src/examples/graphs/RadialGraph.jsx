import { useEffect, useRef } from 'react';

import { RadialGraph, RadialGraphSegments } from '@lib/index.js';

import { Example } from '@/components';
import { useClassName } from '@/hooks';

import './RadialGraph.css';

export default function RadialGraphExample({ title }) {
    const ref = useRef(null);

    useClassName('scroll');

    useEffect(() => {
        const container = ref.current;

        // Radial graph
        const graph = new RadialGraph({
            value: Array.from({ length: 10 }, () => Math.random()),
            precision: 2,
            lookupPrecision: 200
        });
        graph.animateIn();
        container.appendChild(graph.element);

        // Radial graph with ghost
        const graph2 = new RadialGraph({
            precision: 2,
            lookupPrecision: 200
        });
        graph2.setArray(Array.from({ length: 10 }, () => Math.random()));
        graph2.setGhostArray(Array.from({ length: 10 }, () => Math.random()));
        graph2.animateIn();
        container.appendChild(graph2.element);

        // Radial graph with ghost value
        const graph3 = new RadialGraph({
            resolution: 311,
            precision: 2,
            ghost: true
        });
        graph3.animateIn();
        container.appendChild(graph3.element);

        // Radial graph with start angle and ghost
        const graph4 = new RadialGraph({
            value: Array.from({ length: 10 }, () => Math.random()),
            ghost: Array.from({ length: 10 }, () => Math.random()),
            start: -90,
            precision: 2,
            lookupPrecision: 200
        });
        graph4.animateIn();
        container.appendChild(graph4.element);

        // Radial graph with 2 segments
        const graph5 = new RadialGraphSegments({
            start: -45,
            precision: 2,
            lookupPrecision: 100, // per segment
            segments: [5, 5] // length of each segment (minimum length of 2)
        });
        graph5.setArray(Array.from({ length: 10 }, () => Math.random()));
        graph5.animateIn();
        container.appendChild(graph5.element);

        // Radial graph with uneven segments, ghost and labels
        const graph6 = new RadialGraphSegments({
            value: Array.from({ length: 13 }, () => Math.random()),
            ghost: Array.from({ length: 13 }, () => Math.random()),
            start: -45,
            graphHeight: 40,
            precision: 2,
            lookupPrecision: [100, 100, 50], // per segment
            segments: [5, 5, 3], // length of each segment (minimum length of 2)
            ratio: [0.45, 0.45, 0.1], // normalized ratio of each segment
            labels: ['Segment 1', 'Segment 2', 'Segment 3']
        });
        graph6.setData([Array.from({ length: 10 }, (_, i) => i + 1), Array.from({ length: 10 }, (_, i) => i + 1), []]);
        graph6.animateIn();
        container.appendChild(graph6.element);

        // animation

        let counter = 0;
        let raf;

        function animate() {
            raf = requestAnimationFrame(animate);

            graph.update();
            graph2.update();

            const y = 0.5 + 0.5 * Math.sin(counter++ / 9) * 0.5;
            graph3.update(y);

            graph4.update();
            graph5.update();
            graph6.update();
        }

        raf = requestAnimationFrame(animate);

        // resize

        function onWindowResize() {
            const width = document.documentElement.clientWidth;
            const height = document.documentElement.clientHeight;

            let size;

            if (width < height) {
                size = 250;
            } else {
                size = 300;
            }

            graph.setSize(size, size);
            graph2.setSize(size, size);
            graph3.setSize(size, size);
            graph4.setSize(size, size);
            graph5.setSize(size, size);
            graph6.setSize(size, size);
        }

        window.addEventListener('resize', onWindowResize);
        onWindowResize();

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

    return <Example title={title} className='radial-graph-example' ref={ref} />;
}
