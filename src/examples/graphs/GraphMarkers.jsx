import { useCallback, useEffect, useRef, useState } from 'react';

import { Stage, clamp, mapLinear } from '@lib/index.js';

import { Example } from '@/components';
import { useClassName, useResize } from '@/hooks';

import { Graph } from '@/space/components/graphs/index.js';
import { Info } from '@/space/components/nav/index.js';
import { RadialGraph } from '@/space/components/radial/index.js';
import { UI } from '@/space/components/ui/UI.jsx';

import './GraphMarkers.css';

const GRAPH1_VALUE = Array.from({ length: 10 }, () => Math.random());
const GRAPH1_MARKERS = [[0.5, 'Marker 1'], [1, 'Drag me']];

const GRAPH2_VALUE = Array.from({ length: 10 }, () => Math.random());
const GRAPH2_MARKERS = [[0.5, 'Not me'], [1, 'Marker 2']];

const GRAPH3_VALUE = Array.from({ length: 10 }, () => Math.random());
const GRAPH3_MARKERS = [[0.5, 'Marker 1'], [1, 'Drag me']];

/**
 * Graph Markers example — demonstrates RadialGraph and Graph with draggable markers
 * and an animated instructions overlay. Mirrors the original `graph_markers.html`.
 */
export default function GraphMarkersExample({ title }) {
    useClassName('scroll');

    const uiRef = useRef(null);
    const instructionsRef = useRef(null);
    const graph1Ref = useRef(null);
    const graph2Ref = useRef(null);
    const graph3Ref = useRef(null);

    // Responsive sizes driven by useResize
    const [radialSize, setRadialSize] = useState(300);
    const [graph3W, setGraph3W] = useState(600);
    const [graph3H, setGraph3H] = useState(60);

    // Instructions overlay content; updated imperatively via state to trigger re-render
    const [instructionsContent, setInstructionsContent] = useState(
        `${navigator.maxTouchPoints ? 'Tap' : 'Click'} graph to add marker`
    );

    // Counter tracks which instructions step we are on
    const instructionsCounterRef = useRef(0);

    useResize(() => {
        const width = document.documentElement.clientWidth;
        const height = document.documentElement.clientHeight;
        setRadialSize(width < height ? 250 : 300);
        setGraph3W(width * 0.74);
        setGraph3H(clamp(mapLinear(height, 600, 1000, 40, 80), 40, 80));
    });

    // Animate in on mount
    useEffect(() => {
        instructionsRef.current?.animateIn();
        uiRef.current?.animateIn();
        graph1Ref.current?.animateIn();
        graph2Ref.current?.animateIn();
        graph3Ref.current?.animateIn();
    }, []);

    // After instructionsContent changes (triggered from the marker callback), animate in again
    const pendingAnimateInRef = useRef(false);
    useEffect(() => {
        if (pendingAnimateInRef.current) {
            pendingAnimateInRef.current = false;
            instructionsRef.current?.animateIn();
        }
    }, [instructionsContent]);

    const onMarker = useCallback(e => {
        console.log('Marker event:', e);

        if (e.type === 'add') {
            if (instructionsCounterRef.current === 0) {
                instructionsRef.current?.animateOut(() => {
                    pendingAnimateInRef.current = true;
                    setInstructionsContent('Drag away marker to remove');
                });
                instructionsCounterRef.current++;
            }
        } else {
            if (instructionsCounterRef.current === 1) {
                instructionsRef.current?.animateOut();
                instructionsCounterRef.current++;
            }
        }
    }, []);

    useEffect(() => {
        Stage.events.on('marker', onMarker);
        const preventZoom = e => e.preventDefault();
        document.addEventListener('dblclick', preventZoom);
        return () => {
            Stage.events.off('marker', onMarker);
            document.removeEventListener('dblclick', preventZoom);
        };
    }, [onMarker]);

    return (
        <Example title={title} className="graph-markers">
            <RadialGraph
                ref={graph1Ref}
                value={GRAPH1_VALUE}
                precision={2}
                lookupPrecision={200}
                markers={GRAPH1_MARKERS}
                width={radialSize}
                height={radialSize}
            />
            <RadialGraph
                ref={graph2Ref}
                value={GRAPH2_VALUE}
                precision={2}
                lookupPrecision={200}
                markers={GRAPH2_MARKERS}
                noMarkerDrag
                width={radialSize}
                height={radialSize}
            />
            <Graph
                ref={graph3Ref}
                value={GRAPH3_VALUE}
                precision={2}
                lookupPrecision={200}
                markers={GRAPH3_MARKERS}
                width={graph3W}
                height={graph3H}
            />
            <UI ref={uiRef} />
            {/* Standalone Info for instructions — UI handle lacks animateInstructionsOut */}
            <Info ref={instructionsRef} bottom content={instructionsContent} />
        </Example>
    );
}
