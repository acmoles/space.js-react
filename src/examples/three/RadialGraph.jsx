import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { BoxGeometry } from 'three';

import { Panel, PanelItem, UI } from '@lib/three.js';
import { Example } from '@/components';

import { Point3D, Points3D, useRadialGraphCanvas } from '../../space/three/index.js';

function useUpdatePanel(graphRef) {
    const panelRef = useRef(null);
    const storeRef = useRef({
        listeners: new Set(),
        version: 0
    });

    const notify = useCallback(() => {
        storeRef.current.version += 1;
        storeRef.current.listeners.forEach(listener => listener());
    }, []);

    const subscribe = useCallback(listener => {
        storeRef.current.listeners.add(listener);

        return () => {
            storeRef.current.listeners.delete(listener);
        };
    }, []);

    const getSnapshot = useCallback(() => storeRef.current.version, []);

    useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    useEffect(() => {
        const panel = new Panel();

        panel.add(new PanelItem({
            type: 'link',
            value: 'Update',
            callback: value => {
                console.log('Update callback:', value);
                graphRef.current?.setArray([0.12, 0.28, 0.41, 0.57, 0.73, 0.66, 0.5, 0.34, 0.22, 0.48]);
            }
        }));

        panelRef.current = panel;
        notify();

        return () => {
            if (panelRef.current === panel) {
                panelRef.current = null;
                notify();
            }

            panel.destroy?.();
        };
    }, [graphRef, notify]);

    return panelRef;
}

function Scene({ overlayEl, ui }) {
    const meshRef = useRef(null);
    const [mesh, setMesh] = useState(null);

    const geometry = useMemo(() => {
        const nextGeometry = new BoxGeometry();
        nextGeometry.computeTangents();
        return nextGeometry;
    }, []);

    const graphRef = useRadialGraphCanvas({
        value: [0.18, 0.32, 0.47, 0.63, 0.78, 0.71, 0.54, 0.39, 0.24, 0.12],
        start: -45,
        graphHeight: 40,
        precision: 2,
        lookupPrecision: 200
    });

    const panelRef = useUpdatePanel(graphRef);

    const handleMeshRef = useCallback(nextMesh => {
        meshRef.current = nextMesh;
        setMesh(nextMesh);
    }, []);

    useEffect(() => {
        return () => {
            geometry.dispose();
        };
    }, [geometry]);

    useFrame(state => {
        const time = state.clock.getElapsedTime();

        if (meshRef.current) {
            meshRef.current.rotation.x = time / 2;
            meshRef.current.rotation.y = time;
        }

        ui.update();
    });

    return (
        <>
            <color attach="background" args={[0x060606]} />
            <hemisphereLight args={[0xffffff, 0x888888, 3]} />
            <mesh ref={handleMeshRef} geometry={geometry}>
                <meshNormalMaterial />
            </mesh>
            {overlayEl && mesh && (
                <Points3D container={overlayEl}>
                    <Point3D
                        object={mesh}
                        graph={graphRef}
                        name="127.0.0.1"
                        panel={panelRef}
                        type="localhost"
                    />
                </Points3D>
            )}
            <OrbitControls enableDamping />
        </>
    );
}

/**
 * Declarative radial-graph example with the original imperative FPS UI.
 */
export default function RadialGraph({ title }) {
    const containerRef = useRef(null);
    const [overlayEl, setOverlayEl] = useState(null);
    const [ui] = useState(() => new UI({ fps: true }));

    useEffect(() => {
        const container = containerRef.current;

        ui.animateIn();
        container?.appendChild(ui.element);

        return () => {
            ui.destroy();
        };
    }, [ui]);

    return (
        <Example title={title} ref={containerRef}>
            <Canvas
                gl={{ antialias: true }}
                dpr={window.devicePixelRatio}
                camera={{ fov: 35, near: 1, far: 2000, position: [0, 0, 10] }}
            >
                <Scene overlayEl={overlayEl} ui={ui} />
            </Canvas>
            <div ref={setOverlayEl} style={{ inset: 0, pointerEvents: 'none', position: 'absolute' }} />
        </Example>
    );
}
