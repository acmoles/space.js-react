import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { BoxGeometry } from 'three';

import { Example } from '@/components';
import { UI } from '@/space/index.js';

import { RadialGraphCanvas } from '../../space/components/radial/index.js';
import { Point3D, Point3DGraph, Point3DPanel, Points3D } from '../../space/three/index.js';

const GRAPH_VALUE = [0.18, 0.32, 0.47, 0.63, 0.78, 0.71, 0.54, 0.39, 0.24, 0.12];
const UPDATED_VALUE = [0.12, 0.28, 0.41, 0.57, 0.73, 0.66, 0.5, 0.34, 0.22, 0.48];

function Scene({ overlayEl }) {
    const meshRef = useRef(null);
    const [mesh, setMesh] = useState(null);

    const geometry = useMemo(() => {
        const nextGeometry = new BoxGeometry();
        nextGeometry.computeTangents();
        return nextGeometry;
    }, []);

    const graphRef = useRef(null);
    const graphRefs = useMemo(() => [graphRef], []);

    const panelItems = useMemo(() => [
        {
            type: 'link',
            value: 'Update',
            callback: value => {
                console.log('Update callback:', value);
                graphRef.current?.setArray(UPDATED_VALUE);
            }
        }
    ], []);

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
                        name="127.0.0.1"
                        type="localhost"
                    >
                        <Point3DGraph
                            start={-45}
                            graphHeight={40}
                            graphRefs={graphRefs}
                        >
                            <RadialGraphCanvas
                                ref={graphRef}
                                value={GRAPH_VALUE}
                                start={-45}
                                graphHeight={40}
                                precision={2}
                                lookupPrecision={200}
                            />
                        </Point3DGraph>
                        <Point3DPanel items={panelItems} />
                    </Point3D>
                </Points3D>
            )}
            <OrbitControls enableDamping />
        </>
    );
}

/**
 * Declarative radial-graph example with the React FPS UI.
 *
 * The `<UI>` lives outside the `<Canvas>` because R3F's reconciler can only
 * host Three.js objects, not DOM elements.
 */
export default function RadialGraph({ title }) {
    const uiRef = useRef(null);
    const [overlayEl, setOverlayEl] = useState(null);

    useEffect(() => {
        uiRef.current?.animateIn();
    }, []);

    return (
        <Example title={title}>
            <UI ref={uiRef} fps />
            <Canvas
                flat
                gl={{ antialias: true }}
                dpr={window.devicePixelRatio}
                camera={{ fov: 35, near: 1, far: 2000, position: [0, 0, 10] }}
            >
                <Scene overlayEl={overlayEl} />
            </Canvas>
            <div ref={setOverlayEl} style={{ inset: 0, pointerEvents: 'none', position: 'absolute' }} />
        </Example>
    );
}
