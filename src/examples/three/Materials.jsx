import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { BoxGeometry } from 'three';

import { MaterialsPanel, Point3D, UI } from '@lib/three.js';
import { Example } from '@/components';

function Scene({ containerRef }) {
    const { gl: renderer, scene, camera } = useThree();
    const uiRef = useRef(null);
    const meshRef = useRef();

    const geometry = useMemo(() => {
        const geo = new BoxGeometry();
        geo.computeTangents();
        return geo;
    }, []);

    useEffect(() => {
        return () => {
            geometry.dispose();
        };
    }, [geometry]);

    useEffect(() => {
        const container = containerRef.current;
        const mesh = meshRef.current;
        if (!mesh) return;

        const ui = new UI({ fps: true });
        ui.animateIn();
        container.appendChild(ui.element);
        uiRef.current = ui;

        Point3D.init(renderer, scene, camera);

        const point = new Point3D(mesh);
        scene.add(point);

        const materialPanel = new MaterialsPanel(mesh, point);
        materialPanel.animateIn(true);

        point.setContent(materialPanel);

        return () => {
            scene.remove(point);
            Point3D.destroy();
            uiRef.current = null;
            ui.destroy();
        };
    }, [renderer, scene, camera, containerRef]);

    useFrame(state => {
        const time = state.clock.getElapsedTime();

        if (meshRef.current) {
            meshRef.current.rotation.x = time / 2;
            meshRef.current.rotation.y = time;
        }

        Point3D.update(time);
        if (uiRef.current) uiRef.current.update();
    });

    return (
        <>
            <color attach="background" args={[0x060606]} />
            <hemisphereLight args={[0xffffff, 0x888888, 3]} />
            <mesh ref={meshRef} geometry={geometry}>
                <meshNormalMaterial />
            </mesh>
            <OrbitControls enableDamping />
        </>
    );
}

export default function MaterialsExample({ title }) {
    const containerRef = useRef(null);

    return (
        <Example title={title} ref={containerRef}>
            <Canvas
                gl={{ antialias: true }}
                dpr={window.devicePixelRatio}
                camera={{ fov: 35, near: 1, far: 2000, position: [0, 0, 10] }}
            >
                <Scene containerRef={containerRef} />
            </Canvas>
        </Example>
    );
}
