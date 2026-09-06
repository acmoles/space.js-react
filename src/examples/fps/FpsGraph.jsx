import { useEffect, useRef, useState } from 'react';

import { Example } from '@/components';

import { UI } from '@/space/components/ui/UI.jsx';

/**
 * FPS Graph example — FPS counter with a panel of live graph items.
 * Mirrors `fps_graph.html`. Callbacks use closures instead of the imperative
 * `item.update()` pattern because `item` is not forwarded in the React panel.
 */
export default function FpsGraphExample({ title }) {
    const uiRef = useRef(null);

    // Build item descriptors once; closures capture per-item mutable state.
    const [items] = useState(() => {
        let needsUpdate = true;
        let msLast = performance.now();
        let sine1Counter = -13;
        let clip1Counter = -13;
        let sine2Counter = -13;
        let clip2Counter = -13;
        let ghostCounter = -13;
        // Initialize to 0 so the first tick (time > 1s) always returns an array,
        // ensuring PanelGraph's graphNeedsUpdateRef is set before getCurveY runs.
        let randomReady = false;
        let randomLast = 0;
        const graphInitial = Array.from({ length: 10 }, () => Math.random());
        let graphValue = graphInitial;
        // 'Array' item needs a callback returning data on the first tick so that
        // PanelGraph's graphNeedsUpdateRef is true before getCurveY is first called.
        const arrayInitial = Array.from({ length: 10 }, () => Math.random());
        let arrayReady = false;

        return [
            {
                type: 'graph',
                name: 'FPS',
                noText: true
            },
            {
                type: 'graph',
                name: 'MS',
                suffix: 'ms',
                range: 150,
                callback: () => {
                    const time = performance.now();
                    const ms = time - msLast;
                    msLast = time;
                    return ms;
                }
            },
            {
                type: 'graph',
                name: 'MEM',
                range: 300,
                callback: () => {
                    if (!performance.memory) return;
                    return performance.memory.usedJSHeapSize / 1e6;
                }
            },
            {
                type: 'graph',
                name: 'Sine',
                precision: 2,
                noText: true,
                noHover: true,
                noGradient: true,
                callback: () => 0.5 + 0.5 * Math.sin(sine1Counter++ / 9) * 0.5
            },
            {
                type: 'graph',
                name: 'Clip',
                precision: 2,
                noText: true,
                noHover: true,
                noGradient: true,
                callback: () => 0.5 + 0.5 * Math.sin(clip1Counter++ / 9)
            },
            {
                type: 'graph',
                name: 'Sine',
                precision: 2,
                noText: true,
                callback: () => 0.5 + 0.5 * Math.sin(sine2Counter++ / 9) * 0.5
            },
            {
                type: 'graph',
                name: 'Clip',
                precision: 2,
                noText: true,
                callback: () => 0.5 + 0.5 * Math.sin(clip2Counter++ / 9)
            },
            {
                type: 'graph',
                name: 'Ghost',
                resolution: 85,
                precision: 2,
                ghost: true,
                noText: true,
                callback: () => 0.5 + 0.5 * Math.sin(ghostCounter++ / 9) * 0.5
            },
            {
                type: 'graph',
                name: 'Array',
                precision: 2,
                lookupPrecision: 50,
                value: arrayInitial,
                // Callback returns the array on first tick so PanelGraph's
                // graphNeedsUpdateRef is set before getCurveY is first called.
                callback: () => {
                    if (!arrayReady) {
                        arrayReady = true;
                        return arrayInitial;
                    }
                }
            },
            {
                type: 'graph',
                name: 'Random',
                precision: 2,
                lookupPrecision: 50,
                noText: true,
                callback: () => {
                    const time = performance.now();
                    if (!randomReady || time - 1000 > randomLast) {
                        randomReady = true;
                        randomLast = time;
                        return Array.from({ length: 10 }, () => Math.random());
                    }
                }
            },
            {
                type: 'graph',
                name: 'Graph',
                precision: 2,
                lookupPrecision: 50,
                value: graphInitial,
                noText: true,
                callback: () => {
                    if (needsUpdate) {
                        needsUpdate = false;
                        graphValue = Array.from({ length: 10 }, () => Math.random());
                        return graphValue;
                    }
                }
            },
            {
                type: 'link',
                value: 'Update',
                callback: () => {
                    needsUpdate = true;
                }
            }
        ];
    });

    useEffect(() => {
        items.forEach(item => uiRef.current?.addPanel(item));
        // Defer animateIn until after React flushes the addPanel state updates
        const id = requestAnimationFrame(() => uiRef.current?.animateIn());
        return () => cancelAnimationFrame(id);
    }, [items]);

    return (
        <Example title={title}>
            <UI ref={uiRef} fps fpsOpen />
        </Example>
    );
}
