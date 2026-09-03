import { useEffect, useRef } from 'react';

import { Graph, RadialGraph, Stage, UI, clamp, mapLinear, ticker } from '@lib/index.js';

import { Example } from '@/components';
import { useClassName } from '@/hooks';

import './GraphMarkersExample.css';

export default function GraphMarkersExample({ title }) {
    const ref = useRef(null);

    useClassName('scroll');

    useEffect(() => {
        const container = ref.current;

        let instructionsCounter = 0;

        // initViews

        const graph = new RadialGraph({
            value: Array.from({ length: 10 }, () => Math.random()),
            precision: 2,
            lookupPrecision: 200,
            markers: [ // An array of normalized positions
                [0.5, 'Marker 1'],
                [1, 'Drag me']
            ]
        });
        container.appendChild(graph.element);

        const graph2 = new RadialGraph({
            value: Array.from({ length: 10 }, () => Math.random()),
            precision: 2,
            lookupPrecision: 200,
            markers: [ // An array of normalized positions
                [0.5, 'Not me'],
                [1, 'Marker 2']
            ],
            // noMarker: true,
            noMarkerDrag: true
        });
        container.appendChild(graph2.element);

        const graph3 = new Graph({
            value: Array.from({ length: 10 }, () => Math.random()),
            precision: 2,
            lookupPrecision: 200
        });
        // An array of normalized positions
        graph3.setMarkers([
            [0.5, 'Marker 1'],
            [1, 'Drag me']
        ]);
        container.appendChild(graph3.element);

        const ui = new UI({
            instructions: {
                content: `${navigator.maxTouchPoints ? 'Tap' : 'Click'} graph to add marker`
            }
        });
        ui.instructions.animateIn();
        container.appendChild(ui.element);

        // addListeners

        const onMarker = e => {
            console.log('Marker event:', e);

            if (e.type === 'add') {
                if (instructionsCounter === 0) {
                    ui.instructions.animateOut(() => {
                        ui.instructions.setContent('Drag away marker to remove');
                        ui.instructions.animateIn();
                    });

                    instructionsCounter++;
                }
            } else {
                if (instructionsCounter === 1) {
                    ui.instructions.animateOut();
                    instructionsCounter++;
                }
            }
        };

        const preventZoom = e => {
            e.preventDefault();
        };

        const onResize = () => {
            const width = document.documentElement.clientWidth;
            const height = document.documentElement.clientHeight;

            if (width < height) {
                graph.setSize(250, 250);
            } else {
                graph.setSize(300, 300);
            }

            if (width < height) {
                graph2.setSize(250, 250);
            } else {
                graph2.setSize(300, 300);
            }

            graph3.setSize(width * 0.74, clamp(mapLinear(height, 600, 1000, 40, 80), 40, 80));
        };

        const onUpdate = () => {
            graph.update();
            graph2.update();
            graph3.update();
            ui.update();
        };

        const onLoad = () => {
            graph.animateIn();
            graph2.animateIn();
            graph3.animateIn();
            ui.animateIn();
        };

        Stage.events.on('marker', onMarker);
        document.addEventListener('dblclick', preventZoom);
        window.addEventListener('resize', onResize);
        window.addEventListener('load', onLoad);
        ticker.add(onUpdate);
        ticker.start();

        onResize();
        onLoad();

        return () => {
            Stage.events.off('marker', onMarker);
            document.removeEventListener('dblclick', preventZoom);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('load', onLoad);
            ticker.remove(onUpdate);
            graph.destroy();
            graph2.destroy();
            graph3.destroy();
            ui.destroy();
        };
    }, []);

    return <Example title={title} className='graph-markers' ref={ref} />;
}
