import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

import { UI } from '@lib/three.js';
import { Example } from '@/components';

import { useLightPanelController } from '../../space/three/index.js';

function Scene({ ui }) {
    const { scene } = useThree();
    const meshRef = useRef(null);
    const pointLightRef = useRef(null);
    const rectLight1Ref = useRef(null);
    const rectLight2Ref = useRef(null);
    const rectLight3Ref = useRef(null);

    useEffect(() => {
        RectAreaLightUniformsLib.init();
    }, []);

    useEffect(() => {
        rectLight1Ref.current?.lookAt(0, 0, 0);
        rectLight2Ref.current?.lookAt(0, 0, 0);
        rectLight3Ref.current?.lookAt(0, 0, 0);
    }, []);

    useLightPanelController(scene, ui);

    useFrame(state => {
        const time = state.clock.getElapsedTime();

        if (meshRef.current) {
            meshRef.current.rotation.x = time / 2;
            meshRef.current.rotation.y = time;
        }

        if (pointLightRef.current) {
            pointLightRef.current.position.x = Math.sin(time * 1.7) * 2;
            pointLightRef.current.position.y = Math.cos(time * 1.5) * 2;
            pointLightRef.current.position.z = Math.cos(time * 1.3) * 2;
        }

        ui.update();
    });

    return (
        <>
            <color attach="background" args={[0x060606]} />
            <ambientLight color={0xffffff} intensity={3} />
            <hemisphereLight args={[0xffffff, 0x888888, 3]} />
            <directionalLight color={0xffffff} intensity={2} position={[5, 5, 5]} />
            <pointLight ref={pointLightRef} />
            <spotLight angle={0.3} penumbra={0.2} decay={2} position={[-5, 5, 5]} />
            <rectAreaLight ref={rectLight1Ref} color={0xff0000} intensity={5} width={4} height={10} position={[-5, 5, -5]} />
            <rectAreaLight ref={rectLight2Ref} color={0x00ff00} intensity={5} width={4} height={10} position={[0, 5, -5]} />
            <rectAreaLight ref={rectLight3Ref} color={0x0000ff} intensity={5} width={4} height={10} position={[5, 5, -5]} />
            <mesh ref={meshRef}>
                <boxGeometry />
                <meshStandardMaterial color={0x595959} metalness={0.5} roughness={0.7} />
            </mesh>
            <OrbitControls enableDamping />
        </>
    );
}

/**
 * Declarative lights example with the original imperative light control UI.
 */
export default function Lights({ title }) {
    const containerRef = useRef(null);
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
                <Scene ui={ui} />
            </Canvas>
        </Example>
    );
}
