import { useEffect, useRef, useState } from 'react';

import { Example } from '@/components';

import { UI } from '../../space/components/ui/UI.jsx';

/**
 * FPS Meter example — renders the UI with fps and fpsOpen, then populates the
 * header panel with a variety of meter items. Mirrors `fps_meter.html`.
 */
export default function FpsMeterExample({ title }) {
    const uiRef = useRef(null);
    const needsUpdateRef = useRef(true);

    // Panel items — created once via useState lazy initializer so Math.random()
    // values and callbacks are stable across re-renders.
    const [panelItems] = useState(() => [
        {
            name: 'FPS'
        },
        {
            type: 'divider'
        },
        {
            type: 'meter',
            name: 'FPS',
            noText: true,
            noGradient: true
        },
        {
            type: 'meter',
            name: 'FPS'
        },
        {
            type: 'meter',
            name: 'Random',
            value: Math.random(),
            noText: true,
            noGradient: true
        },
        {
            type: 'meter',
            name: 'Random',
            value: Math.random(),
            noText: true
        },
        {
            type: 'meter',
            name: 'Random',
            precision: 2,
            value: Math.random()
        },
        {
            type: 'meter',
            name: 'Random',
            suffix: 'ms',
            range: 150,
            value: 150 * Math.random()
        },
        {
            type: 'meter',
            name: 'Ghost',
            suffix: 'ms',
            range: 150,
            value: 150 * Math.random(),
            ghost: 150 * Math.random(),
            noText: true
        },
        {
            type: 'meter',
            name: 'Ghost',
            suffix: 'ms',
            range: 150,
            value: 150 * Math.random(),
            ghost: 150 * Math.random()
        },
        {
            type: 'meter',
            value: Math.random(),
            noText: true,
            noGradient: true
        },
        {
            type: 'meter',
            suffix: 'ms',
            range: 150,
            value: 150 * Math.random()
        },
        {
            type: 'meter',
            name: 'Sine',
            precision: 2,
            value: -180,
            noText: true,
            noGradient: true,
            callback: (value, item) => {
                const x = 0.5 + 0.5 * Math.sin(value++ / 100);
                item.update(x);
                return value;
            }
        },
        {
            type: 'meter',
            name: 'Sine',
            precision: 2,
            value: -180,
            callback: (value, item) => {
                const x = 0.5 + 0.5 * Math.sin(value++ / 100);
                item.update(x);
                return value;
            }
        },
        {
            type: 'meter',
            name: 'Random',
            precision: 2,
            value: performance.now() - 1000,
            callback: (value, item) => {
                const time = performance.now();

                if (time - 1000 > value) {
                    value = time;
                    item.update(Math.random());
                } else {
                    item.update();
                }

                return value;
            }
        },
        {
            type: 'meter',
            name: 'Meter',
            precision: 2,
            value: Math.random(),
            callback: (value, item) => {
                if (needsUpdateRef.current) {
                    needsUpdateRef.current = false;
                    item.update(Math.random());
                } else {
                    item.update();
                }

                return value;
            }
        },
        {
            type: 'link',
            value: 'Update',
            callback: () => {
                needsUpdateRef.current = true;
            }
        }
    ]);

    useEffect(() => {
        uiRef.current?.animateIn();
    }, []);

    return (
        <Example title={title}>
            <UI ref={uiRef} fps fpsOpen panelItems={panelItems} />
        </Example>
    );
}

        {
            name: 'FPS'
        },
        {
            type: 'divider'
        },
        {
            type: 'meter',
            name: 'FPS',
            noText: true,
            noGradient: true
        },
        {
            type: 'meter',
            name: 'FPS'
        },
        {
            type: 'meter',
            name: 'Random',
            value: Math.random(),
            noText: true,
            noGradient: true
        },
        {
            type: 'meter',
            name: 'Random',
            value: Math.random(),
            noText: true
        },
        {
            type: 'meter',
            name: 'Random',
            precision: 2,
            value: Math.random()
        },
        {
            type: 'meter',
            name: 'Random',
            suffix: 'ms',
            range: 150,
            value: 150 * Math.random()
        },
        {
            type: 'meter',
            name: 'Ghost',
            suffix: 'ms',
            range: 150,
            value: 150 * Math.random(),
            ghost: 150 * Math.random(),
            noText: true
        },
        {
            type: 'meter',
            name: 'Ghost',
            suffix: 'ms',
            range: 150,
            value: 150 * Math.random(),
            ghost: 150 * Math.random()
        },
        {
            type: 'meter',
            value: Math.random(),
            noText: true,
            noGradient: true
        },
        {
            type: 'meter',
            suffix: 'ms',
            range: 150,
            value: 150 * Math.random()
        },
        {
            type: 'meter',
            name: 'Sine',
            precision: 2,
            value: -180,
            noText: true,
            noGradient: true,
            callback: (value, item) => {
                const x = 0.5 + 0.5 * Math.sin(value++ / 100);
                item.update(x);
                return value;
            }
        },
        {
            type: 'meter',
            name: 'Sine',
            precision: 2,
            value: -180,
            callback: (value, item) => {
                const x = 0.5 + 0.5 * Math.sin(value++ / 100);
                item.update(x);
                return value;
            }
        },
        {
            type: 'meter',
            name: 'Random',
            precision: 2,
            value: performance.now() - 1000,
            callback: (value, item) => {
                const time = performance.now();

                if (time - 1000 > value) {
                    value = time;
                    item.update(Math.random());
                } else {
                    item.update();
                }

                return value;
            }
        },
        {
            type: 'meter',
            name: 'Meter',
            precision: 2,
            value: Math.random(),
            callback: (value, item) => {
                if (needsUpdateRef.current) {
                    needsUpdateRef.current = false;
                    item.update(Math.random());
                } else {
                    item.update();
                }

                return value;
            }
        },
        {
            type: 'link',
            value: 'Update',
            callback: () => {
                needsUpdateRef.current = true;
            }
        }
    ]).current;

    useEffect(() => {
        uiRef.current?.animateIn();
    }, []);

    return (
        <Example title={title}>
            <UI ref={uiRef} fps fpsOpen panelItems={panelItems} />
        </Example>
    );
}
