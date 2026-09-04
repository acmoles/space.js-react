import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { BoxGeometry } from 'three';

import { UI } from '@lib/three.js';
import { Example } from '@/components';

import { Point3D, Points3D, useMaterialsPanel } from '../../space/three/index.js';

function Scene({ overlayEl, ui }) {
    const pointRef = useRef(null);
    const meshRef = useRef(null);
    const [mesh, setMesh] = useState(null);

    const geometry = useMemo(() => {
        const nextGeometry = new BoxGeometry();
        nextGeometry.computeTangents();
        return nextGeometry;
    }, []);

    const panelUi = useMemo(() => ({
        uvTexture: null,
        get point() {
            return pointRef.current;
        },
        isDefault: true,
        constructor: {
            points: false,
            getPoint: () => pointRef.current
        }
    }), []);

    const panelRef = useMaterialsPanel(mesh, panelUi);

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
                        name={mesh.geometry.type}
                        type={mesh.material.type}
                        panel={panelRef}
                        ref={pointRef}
                    />
                </Points3D>
            )}
            <OrbitControls enableDamping />
        </>
    );
}

/**
 * Declarative materials example with the original imperative FPS UI.
 */
export default function Materials({ title }) {
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
