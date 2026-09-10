import { useEffect, useRef, useState } from 'react';

import { clamp, mapLinear } from '@lib/utils/Utils.js';

import { Example } from '@/components';
import { useClassName } from '@/hooks';
import { Graph, GraphSegments } from '@/space/components/graphs/index.js';
import { useResize } from '@/space/hooks/index.js';
import { useTicker } from '@/space/motion/index.js';

import './Graph.css';

const GRAPH_2_SEGMENTS = [2, 2];
const GRAPH_3_SEGMENTS = [5, 5, 5];
const GRAPH_3_LABELS = ['Segment 1', 'Segment 2', 'Segment 3'];
const GRAPH_6_SEGMENTS = [5, 5, 3];
const GRAPH_6_RATIO = [0.45, 0.45, 0.1];
const GRAPH_6_LABELS = ['Segment 1', 'Segment 2', 'Segment 3'];
const GRAPH_6_LOOKUP_PRECISION = [100, 100, 50];
const GRAPH_6_DATA = [
    Array.from({ length: 10 }, (_, i) => i + 1),
    Array.from({ length: 10 }, (_, i) => i + 1),
    []
];

function getGraphDimensions() {
    return {
        width: Math.round(window.innerWidth * 0.74),
        height: clamp(mapLinear(window.innerHeight, 600, 1000, 40, 80), 40, 80)
    };
}

export default function GraphExample({ title }) {
    const graphRef = useRef(null);
    const graph2Ref = useRef(null);
    const graph3Ref = useRef(null);
    const graph4Ref = useRef(null);
    const graph5Ref = useRef(null);
    const graph6Ref = useRef(null);
    const counterRef = useRef(0);
    const [dimensions, setDimensions] = useState(() => getGraphDimensions());
    const [graphValue] = useState(() => Array.from({ length: 10 }, () => Math.random()));
    const [graph2Value] = useState(() => Array.from({ length: 4 }, () => Math.random()));
    const [graph3Value] = useState(() => Array.from({ length: 15 }, () => Math.random()));
    const [graph4Value] = useState(() => Array.from({ length: 10 }, () => Math.random()));
    const [graph4Ghost] = useState(() => Array.from({ length: 10 }, () => Math.random()));
    const [graph6Value] = useState(() => Array.from({ length: 13 }, () => Math.random()));
    const [graph6Ghost] = useState(() => Array.from({ length: 13 }, () => Math.random()));

    useClassName('scroll');

    useResize(() => {
        setDimensions(getGraphDimensions());
    });

    useEffect(() => {
        graphRef.current?.animateIn();
        graph2Ref.current?.animateIn();
        graph3Ref.current?.animateIn();
        graph4Ref.current?.animateIn();
        graph5Ref.current?.animateIn();
        graph6Ref.current?.animateIn();
    }, []);

    useTicker(() => {
        const y = 0.5 + 0.5 * Math.sin(counterRef.current++ / 9) * 0.5;
        graph5Ref.current?.update(y);
    });

    return (
        <Example title={title} className='graph-example'>
            <Graph
                ref={graphRef}
                width={dimensions.width}
                height={dimensions.height}
                value={graphValue}
                precision={2}
                lookupPrecision={200}
            />
            <GraphSegments
                ref={graph2Ref}
                width={dimensions.width}
                height={dimensions.height}
                value={graph2Value}
                precision={2}
                lookupPrecision={100}
                segments={GRAPH_2_SEGMENTS}
            />
            <GraphSegments
                ref={graph3Ref}
                width={dimensions.width}
                height={dimensions.height}
                value={graph3Value}
                precision={2}
                lookupPrecision={100}
                segments={GRAPH_3_SEGMENTS}
                labels={GRAPH_3_LABELS}
            />
            <Graph
                ref={graph4Ref}
                width={dimensions.width}
                height={dimensions.height}
                value={graph4Value}
                ghost={graph4Ghost}
                precision={2}
                lookupPrecision={200}
            />
            <Graph
                ref={graph5Ref}
                width={dimensions.width}
                height={dimensions.height}
                resolution={311}
                precision={2}
                ghost
            />
            <GraphSegments
                ref={graph6Ref}
                width={dimensions.width}
                height={dimensions.height}
                value={graph6Value}
                ghost={graph6Ghost}
                precision={2}
                lookupPrecision={GRAPH_6_LOOKUP_PRECISION}
                segments={GRAPH_6_SEGMENTS}
                ratio={GRAPH_6_RATIO}
                labels={GRAPH_6_LABELS}
                data={GRAPH_6_DATA}
            />
        </Example>
    );
}
