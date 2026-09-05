import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

import { getSphericalCube } from '@lib/three.js';
import { Example } from '@/components';
import { UI } from '@/space/index.js';

import { Point3D, Points3D, useMaterialsPanel } from '../../space/three/index.js';

function Scene({ overlayEl }) {
    const pointRef = useRef(null);
    const meshRef = useRef(null);
    const [mesh, setMesh] = useState(null);

    const geometry = useMemo(() => {
        const nextGeometry = getSphericalCube(0.65);
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
 * Declarative spherical-cube materials example.
 */
export default function MaterialsSphericalCube({ title }) {
    const uiRef = useRef(null);
    const [overlayEl, setOverlayEl] = useState(null);

    useEffect(() => {
        uiRef.current?.animateIn();
    }, []);

    return (
        <Example title={title}>
            <UI fps ref={uiRef} />
            <Canvas
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
