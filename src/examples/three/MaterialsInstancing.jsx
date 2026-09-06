import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Color, IcosahedronGeometry, Matrix4, MeshPhongMaterial } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

import { Example } from '@/components';
import { UI } from '@/space/index.js';

import { Point3D, Points3D, useMaterialsPanel } from '../../space/three/index.js';

const color = new Color();
const matrix = new Matrix4();
const amount = parseInt(location.search.slice(1), 10) || 3;
const count = Math.pow(amount, 3);

function Scene({ overlayEl }) {
    const pointRef = useRef(null);
    const [mesh, setMesh] = useState(null);

    const geometry = useMemo(() => {
        let nextGeometry = new IcosahedronGeometry(0.5, 12);
        nextGeometry = mergeVertices(nextGeometry);
        nextGeometry.computeTangents();
        return nextGeometry;
    }, []);

    const material = useMemo(() => new MeshPhongMaterial(), []);

    const panelUi = useMemo(() => ({
        uvTexture: null,
        get point() {
            return pointRef.current;
        },
        isDefault: true,
        constructor: {
            points: true,
            getPoint: () => pointRef.current
        }
    }), []);

    const panelRef = useMaterialsPanel(mesh, panelUi);

    const handleMeshRef = useCallback(nextMesh => {
        if (nextMesh) {
            let index = 0;
            const offset = (amount - 1) / 2;

            for (let x = 0; x < amount; x++) {
                for (let y = 0; y < amount; y++) {
                    for (let z = 0; z < amount; z++) {
                        matrix.setPosition(offset - x, offset - y, offset - z);
                        nextMesh.setMatrixAt(index, matrix);
                        nextMesh.setColorAt(index, color);
                        index++;
                    }
                }
            }

            nextMesh.instanceMatrix.needsUpdate = true;
            nextMesh.instanceColor.needsUpdate = true;
        }

        setMesh(nextMesh);
    }, []);

    useEffect(() => {
        return () => {
            geometry.dispose();
            material.dispose();
        };
    }, [geometry, material]);

    return (
        <>
            <color attach="background" args={[0x060606]} />
            <hemisphereLight args={[0xffffff, 0x888888, 3]} />
            <instancedMesh ref={handleMeshRef} args={[geometry, material, count]} />
            {overlayEl && mesh && (
                <Points3D container={overlayEl} debug={/[?&]debug/.test(location.search)}>
                    <Point3D
                        object={mesh}
                        name={mesh.geometry.type}
                        type={mesh.material.type}
                        panel={panelRef}
                        ref={pointRef}
                    />
                </Points3D>
            )}
            <OrbitControls enableDamping enableZoom={false} enablePan={false} />
        </>
    );
}

/**
 * Declarative instanced-materials example.
 */
export default function MaterialsInstancing({ title }) {
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
                camera={{ fov: 60, near: 1, far: 2000, position: [amount, amount, amount] }}
                onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
            >
                <Scene overlayEl={overlayEl} />
            </Canvas>
            <div ref={setOverlayEl} style={{ inset: 0, pointerEvents: 'none', position: 'absolute' }} />
        </Example>
    );
}
