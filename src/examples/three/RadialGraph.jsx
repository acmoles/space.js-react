import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { BoxGeometry } from 'three';

import { PanelItem, Point3D, RadialGraphCanvas, UI } from '@lib/three.js';
import { Example } from '@/components';

function Scene({ containerRef }) {
    const { gl: renderer, scene, camera } = useThree();
    const uiRef = useRef(null);
    const isActiveRef = useRef(false);
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

        const graph = new RadialGraphCanvas({
            value: Array.from({ length: 10 }, () => Math.random()),
            start: -45,
            graphHeight: 40,
            precision: 2,
            lookupPrecision: 200
        });

        const point = new Point3D(mesh, { graph });
        point.setData({
            name: '127.0.0.1',
            type: 'localhost'
        });
        scene.add(point);

        // panel

        const item = new PanelItem({
            type: 'link',
            value: 'Update',
            callback: value => {
                console.log('Update callback:', value);

                graph.setArray(Array.from({ length: 10 }, () => Math.random()));
            }
        });
        point.addPanel(item);
        isActiveRef.current = true;

        return () => {
            // Clear the active flag first so useFrame stops touching destroyed state
            isActiveRef.current = false;
            scene.remove(point);
            Point3D.destroy();
            uiRef.current = null;
            ui.destroy();
        };
    }, [renderer, scene, camera, containerRef]);

    useFrame(state => {
        if (!isActiveRef.current) return;

        const time = state.clock.getElapsedTime();

        if (meshRef.current) {
            meshRef.current.rotation.x = time / 2;
            meshRef.current.rotation.y = time;
        }

        Point3D.update(time);
        uiRef.current.update();
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

export default function RadialGraph({ title }) {
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
