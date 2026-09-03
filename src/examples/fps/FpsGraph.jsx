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
        let randomLast = performance.now() - 1000;
        const graphInitial = Array.from({ length: 10 }, () => Math.random());
        let graphValue = graphInitial;

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
                value: Array.from({ length: 10 }, () => Math.random())
            },
            {
                type: 'graph',
                name: 'Random',
                precision: 2,
                lookupPrecision: 50,
                noText: true,
                callback: () => {
                    const time = performance.now();
                    if (time - 1000 > randomLast) {
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

            {
                type: 'graph',
                name: 'MS',
                suffix: 'ms',
                range: 150,
                value: performance.now(),
                callback: (value, item) => {
                    // console.log('MS callback:', value);

                    const time = performance.now();
                    const ms = time - value;

                    item.update(ms);
                    item.setValue(ms);

                    // The return value is passed back in the next frame
                    return time;
                }
            },
            {
                type: 'graph',
                name: 'MEM',
                range: 300,
                value: performance.memory,
                callback: (value, item) => {
                    // console.log('MEM callback:', value);

                    const mem = value.usedJSHeapSize / Math.pow(1000, 2);

                    item.update(mem);
                    item.setValue(mem);

                    // The return value is passed back in the next frame
                    return value;
                }
            },
            {
                type: 'graph',
                name: 'Sine',
                precision: 2,
                value: -13,
                noText: true,
                noHover: true,
                noGradient: true,
                callback: (value, item) => {
                    // console.log('Sine callback:', value);

                    const y = 0.5 + 0.5 * Math.sin(value++ / 9) * 0.5;
                    item.update(y);

                    // The return value is passed back in the next frame
                    return value;
                }
            },
            {
                type: 'graph',
                name: 'Clip',
                precision: 2,
                value: -13,
                noText: true,
                noHover: true,
                noGradient: true,
                callback: (value, item) => {
                    // console.log('Clip callback:', value);

                    const y = 0.5 + 0.5 * Math.sin(value++ / 9);
                    item.update(y);

                    // The return value is passed back in the next frame
                    return value;
                }
            },
            {
                type: 'graph',
                name: 'Sine',
                precision: 2,
                value: -13,
                noText: true,
                callback: (value, item) => {
                    // console.log('Sine callback:', value);

                    const y = 0.5 + 0.5 * Math.sin(value++ / 9) * 0.5;
                    item.update(y);

                    // The return value is passed back in the next frame
                    return value;
                }
            },
            {
                type: 'graph',
                name: 'Clip',
                precision: 2,
                value: -13,
                noText: true,
                callback: (value, item) => {
                    // console.log('Clip callback:', value);

                    const y = 0.5 + 0.5 * Math.sin(value++ / 9);
                    item.update(y);

                    // The return value is passed back in the next frame
                    return value;
                }
            },
            {
                type: 'graph',
                name: 'Ghost',
                resolution: 85,
                precision: 2,
                value: -13,
                ghost: true,
                noText: true,
                callback: (value, item) => {
                    // console.log('Ghost callback:', value);

                    const y = 0.5 + 0.5 * Math.sin(value++ / 9) * 0.5;
                    item.update(y);

                    // The return value is passed back in the next frame
                    return value;
                }
            },
            {
                type: 'graph',
                name: 'Array',
                precision: 2,
                lookupPrecision: 50,
                value: Array.from({ length: 10 }, () => Math.random())
            },
            {
                type: 'graph',
                name: 'Random',
                precision: 2,
                lookupPrecision: 50,
                value: performance.now() - 1000,
                noText: true,
                callback: (value, item) => {
                    // console.log('Random callback:', value);

                    const time = performance.now();

                    // Update once per second
                    if (time - 1000 > value) {
                        value = time;

                        // Passing an array to `item.update()` will update the entire graph
                        const array = Array.from({ length: 10 }, () => Math.random());
                        item.update(array);
                    } else {
                        item.update();
                    }

                    // The return value is passed back in the next frame
                    return value;
                }
            },
            {
                type: 'graph',
                name: 'Graph',
                precision: 2,
                lookupPrecision: 50,
                value: Array.from({ length: 10 }, () => Math.random()),
                noText: true,
                callback: (value, item) => {
                    // console.log('Graph callback:', value);

                    if (needsUpdate) {
                        needsUpdate = false;

                        // Passing an array to `item.update()` will update the entire graph
                        value = Array.from({ length: 10 }, () => Math.random());
                        item.update(value);
                    } else {
                        item.update();
                    }

                    // The return value is passed back in the next frame
                    return value;
                }
            },
            {
                type: 'link',
                value: 'Update',
                callback: value => {
                    console.log('Update callback:', value);

                    needsUpdate = true;
                }
            }
        ];

        items.forEach(data => {
            ui.addPanel(new PanelItem(data));
        });

        // Call after adding to show the fps panel right away
        // ui.animateIn();
        ui.header.info.animateIn();

        let raf;

        function animate() {
            raf = requestAnimationFrame(animate);

            ui.update();
        }

        raf = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(raf);
            ui.destroy();
        };
    }, []);

    return <Example title={title} ref={ref} />;
}
