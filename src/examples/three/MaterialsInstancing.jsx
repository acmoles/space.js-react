import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Color, IcosahedronGeometry, InstancedMesh, Matrix4, MeshPhongMaterial } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

import { MaterialsPanel, Point3D, UI } from '@lib/three.js';
import { Example } from '@/components';

const isDebug = /[?&]debug/.test(location.search);

const amount = parseInt(location.search.slice(1), 10) || 3;
const count = Math.pow(amount, 3);

function Scene({ containerRef }) {
    const { gl: renderer, scene, camera } = useThree();
    const uiRef = useRef(null);
    const meshRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;

        // mesh

        const color = new Color();

        let geometry = new IcosahedronGeometry(0.5, 12);

        // Convert to indexed geometry
        geometry = mergeVertices(geometry);

        geometry.computeTangents();

        const material = new MeshPhongMaterial();

        const mesh = new InstancedMesh(geometry, material, count);
        meshRef.current = mesh;

        let i = 0;
        const offset = (amount - 1) / 2;

        const matrix = new Matrix4();

        for (let x = 0; x < amount; x++) {
            for (let y = 0; y < amount; y++) {
                for (let z = 0; z < amount; z++) {
                    matrix.setPosition(offset - x, offset - y, offset - z);

                    mesh.setMatrixAt(i, matrix);
                    mesh.setColorAt(i, color);

                    i++;
                }
            }
        }

        scene.add(mesh);

        // panel

        const ui = new UI({ fps: true });
        ui.animateIn();
        container.appendChild(ui.element);
        uiRef.current = ui;

        Point3D.init(renderer, scene, camera, {
            debug: isDebug
        });

        const point = new Point3D(mesh);
        scene.add(point);

        const materialPanel = new MaterialsPanel(mesh, point);
        materialPanel.animateIn(true);

        point.setContent(materialPanel);

        return () => {
            scene.remove(mesh);
            geometry.dispose();
            material.dispose();
            meshRef.current = null;
            Point3D.destroy();
            uiRef.current = null;
            ui.destroy();
        };
    }, [renderer, scene, camera, containerRef]);

    useFrame(state => {
        const time = state.clock.getElapsedTime();

        Point3D.update(time);
        if (uiRef.current) uiRef.current.update();
    });

    return (
        <>
            <color attach="background" args={[0x060606]} />
            <hemisphereLight args={[0xffffff, 0x888888, 3]} />
            <OrbitControls enableDamping enableZoom={false} enablePan={false} />
        </>
    );
}

export default function MaterialsInstancingExample({ title }) {
    const containerRef = useRef(null);

    return (
        <Example title={title} ref={containerRef}>
            <Canvas
                gl={{ antialias: true }}
                dpr={window.devicePixelRatio}
                camera={{ fov: 60, near: 1, far: 2000, position: [amount, amount, amount] }}
                onCreated={({ camera: cam }) => cam.lookAt(0, 0, 0)}
            >
                <Scene containerRef={containerRef} />
            </Canvas>
        </Example>
    );
}
