import { useEffect, useRef, useState } from 'react';

import { Example } from '@/components';
import { useClassName } from '@/hooks';
import { RadialGraph, RadialGraphSegments } from '@/space/components/radial/index.js';
import { useResize } from '@/space/hooks/index.js';
import { useTicker } from '@/space/motion/index.js';

import './RadialGraph.css';

const GRAPH_5_SEGMENTS = [5, 5];
const GRAPH_6_SEGMENTS = [5, 5, 3];
const GRAPH_6_RATIO = [0.45, 0.45, 0.1];
const GRAPH_6_LABELS = ['Segment 1', 'Segment 2', 'Segment 3'];
const GRAPH_6_LOOKUP_PRECISION = [100, 100, 50];
const GRAPH_6_DATA = [
    Array.from({ length: 10 }, (_, i) => i + 1),
    Array.from({ length: 10 }, (_, i) => i + 1),
    []
];

function getSize({ width, height }) {
    return width < height ? 250 : 300;
}

export default function RadialGraphExample({ title }) {
    const graph1Ref = useRef(null);
    const graph2Ref = useRef(null);
    const graph3Ref = useRef(null);
    const graph4Ref = useRef(null);
    const graph5Ref = useRef(null);
    const graph6Ref = useRef(null);
    const counterRef = useRef(0);

    const [graph1Value] = useState(() => Array.from({ length: 10 }, () => Math.random()));
    const [graph2Value] = useState(() => Array.from({ length: 10 }, () => Math.random()));
    const [graph2Ghost] = useState(() => Array.from({ length: 10 }, () => Math.random()));
    const [graph4Value] = useState(() => Array.from({ length: 10 }, () => Math.random()));
    const [graph4Ghost] = useState(() => Array.from({ length: 10 }, () => Math.random()));
    const [graph5Value] = useState(() => Array.from({ length: 10 }, () => Math.random()));
    const [graph6Value] = useState(() => Array.from({ length: 13 }, () => Math.random()));
    const [graph6Ghost] = useState(() => Array.from({ length: 13 }, () => Math.random()));

    useClassName('scroll');

    useResize(dims => {
        const size = getSize(dims);

        graph1Ref.current?.setSize(size, size);
        graph2Ref.current?.setSize(size, size);
        graph3Ref.current?.setSize(size, size);
        graph4Ref.current?.setSize(size, size);
        graph5Ref.current?.setSize(size, size);
        graph6Ref.current?.setSize(size, size);
    });

    useEffect(() => {
        graph6Ref.current?.setData(GRAPH_6_DATA);

        graph1Ref.current?.animateIn();
        graph2Ref.current?.animateIn();
        graph3Ref.current?.animateIn();
        graph4Ref.current?.animateIn();
        graph5Ref.current?.animateIn();
        graph6Ref.current?.animateIn();
    }, []);

    useTicker(() => {
        const y = 0.5 + 0.5 * Math.sin(counterRef.current++ / 9) * 0.5;

        graph3Ref.current?.update(y);
    });

    return (
        <Example title={title} className='radial-graph-example'>
            <RadialGraph
                ref={graph1Ref}
                value={graph1Value}
                precision={2}
                lookupPrecision={200}
            />
            <RadialGraph
                ref={graph2Ref}
                value={graph2Value}
                ghost={graph2Ghost}
                precision={2}
                lookupPrecision={200}
            />
            <RadialGraph
                ref={graph3Ref}
                resolution={311}
                precision={2}
                ghost
            />
            <RadialGraph
                ref={graph4Ref}
                value={graph4Value}
                ghost={graph4Ghost}
                start={-90}
                precision={2}
                lookupPrecision={200}
            />
            <RadialGraphSegments
                ref={graph5Ref}
                value={graph5Value}
                start={-45}
                precision={2}
                lookupPrecision={100}
                segments={GRAPH_5_SEGMENTS}
            />
            <RadialGraphSegments
                ref={graph6Ref}
                value={graph6Value}
                ghost={graph6Ghost}
                start={-45}
                graphHeight={40}
                precision={2}
                lookupPrecision={GRAPH_6_LOOKUP_PRECISION}
                segments={GRAPH_6_SEGMENTS}
                ratio={GRAPH_6_RATIO}
                labels={GRAPH_6_LABELS}
            />
        </Example>
    );
}
