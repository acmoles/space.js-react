import { useEffect, useRef } from 'react';

import { PanelItem, UI } from '@lib/index.js';

import { Example } from '@/components';

export default function FpsGraphExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        const container = ref.current;

        const ui = new UI({
            fps: true,      // Hover or tap to open
            fpsOpen: true   // Always open
        });
        ui.animateIn();
        container.appendChild(ui.element);

        let needsUpdate = true;

        const items = [
            /* {
                type: 'graph',
                name: 'FPS'
            }, */
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
