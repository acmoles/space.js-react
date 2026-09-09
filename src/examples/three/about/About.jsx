import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';

import { Stage, tween } from '@lib/three.js';

import { Example } from '@/components';
import { UI } from '@/space/index.js';
import { ProgressCanvas } from '@/space/components/indicators/ProgressCanvas.jsx';

import { AboutScene } from './AboutScene.jsx';

/**
 * About — the flagship Space.js demo (space.js.org) ported to the React SPA.
 *
 * A rotating dark planet, floating crystal and abstract cube over a reflective
 * floor and grid, rendered through the full post-processing stack (motion blur,
 * bloom, chromatic aberration, tone mapping and dithering) with Oimo physics
 * and a large nested control panel.
 *
 * @param {object} props
 * @param {string} props.title Route title, provided by the example registry.
 */
export default function About({ title }) {
    const uiRef = useRef(null);
    const sceneApiRef = useRef(null);
    const progressRef = useRef(null);
    const preloaderElRef = useRef(null);

    const [overlayEl, setOverlayEl] = useState(null);
    const [panelItems, setPanelItems] = useState(null);
    const [progress, setProgress] = useState(0);
    const [started, setStarted] = useState(false);

    // Stable proxy so imperative controllers can reach the React UI regardless
    // of when it mounts.
    const uiProxy = useMemo(() => ({
        addPanel: (...args) => uiRef.current?.addPanel(...args),
        getPanelValue: name => uiRef.current?.getPanelValue(name),
        setPanelIndex: (...args) => uiRef.current?.setPanelIndex(...args),
        setPanelValue: (...args) => uiRef.current?.setPanelValue(...args),
        invert: isInverted => uiRef.current?.invert(isInverted)
    }), []);

    const handleProgress = useCallback(value => {
        setProgress(value);
    }, []);

    const handlePanelItems = useCallback(items => {
        setPanelItems(items);
    }, []);

    // Preloader fade-out → start sequence (mirrors Preloader.onComplete).
    const handlePreloaderComplete = useCallback(() => {
        progressRef.current?.animateOut();

        const opacity = { value: 1 };

        tween(opacity, { value: 0 }, 250, 'easeOutSine', 500, () => {
            setStarted(true);
            sceneApiRef.current?.start();
        }, () => {
            if (preloaderElRef.current) {
                preloaderElRef.current.style.opacity = opacity.value;
            }
        });
    }, []);

    useEffect(() => {
        progressRef.current?.animateIn();
    }, []);

    const handleMenuUpdate = useCallback((name, index) => {
        Stage.events.emit('about-camera', { index });
    }, []);

    const handleUI = useCallback(({ open }) => {
        Stage.events.emit('ui', { open });
    }, []);

    return (
        <Example title={title}>
            {panelItems && (
                <UI
                    ref={uiRef}
                    fps
                    header={{
                        links: [
                            {
                                title: 'Space.js',
                                link: 'https://github.com/alienkitty/space.js'
                            }
                        ]
                    }}
                    menu={{
                        items: ['POL', 'OBL', 'ISO'],
                        active: 'OBL',
                        onUpdate: handleMenuUpdate
                    }}
                    panelItems={panelItems}
                    onUI={handleUI}
                />
            )}
            <Canvas
                flat
                gl={{ powerPreference: 'high-performance', antialias: true }}
                dpr={window.devicePixelRatio}
            >
                <AboutScene
                    overlayEl={overlayEl}
                    uiRef={uiRef}
                    uiProxy={uiProxy}
                    onProgress={handleProgress}
                    onPanelItems={handlePanelItems}
                    sceneApiRef={sceneApiRef}
                />
            </Canvas>
            <div ref={setOverlayEl} style={{ inset: 0, pointerEvents: 'none', position: 'absolute' }} />
            {!started && (
                <div
                    ref={preloaderElRef}
                    className="preloader"
                    style={{
                        alignItems: 'center',
                        backgroundColor: 'var(--bg-color)',
                        display: 'flex',
                        inset: 0,
                        justifyContent: 'center',
                        pointerEvents: 'none',
                        position: 'fixed',
                        zIndex: 100
                    }}
                >
                    <ProgressCanvas
                        ref={progressRef}
                        progress={progress}
                        onComplete={handlePreloaderComplete}
                    />
                </div>
            )}
        </Example>
    );
}
