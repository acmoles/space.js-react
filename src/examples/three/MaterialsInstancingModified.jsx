import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Color, IcosahedronGeometry, InstancedBufferAttribute, Matrix4, MeshPhongMaterial } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

import { MaterialPanels, MaterialPatches, Panel, PanelItem, UI } from '@lib/three.js';
import { Example } from '@/components';

import { Point3D, Points3D, useMaterialsPanel } from '../../space/three/index.js';

const color = new Color();
const matrix = new Matrix4();
const amount = parseInt(location.search.slice(1), 10) || 3;
const count = Math.pow(amount, 3);

MaterialPatches.Phong.instanceOpacity = function (shader) {
    shader.vertexShader = shader.vertexShader.replace(
        '#include <color_pars_vertex>',
        /* glsl */ `
        #include <color_pars_vertex>

        attribute float instanceOpacity;
        varying float vInstanceOpacity;
        `
    );

    shader.vertexShader = shader.vertexShader.replace(
        '#include <color_vertex>',
        /* glsl */ `
        #include <color_vertex>

        vInstanceOpacity = instanceOpacity;
        `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_pars_fragment>',
        /* glsl */ `
        #include <color_pars_fragment>

        varying float vInstanceOpacity;
        `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        /* glsl */ `
        #include <color_fragment>

        diffuseColor.a = vInstanceOpacity * opacity;
        `
    );
};

class InstancedMeshPanel extends Panel {
    constructor(mesh, ui, materialItems) {
        super();

        this.mesh = mesh;
        this.ui = ui;
        this.materialItems = materialItems;

        this.initPanel();
    }

    initPanel() {
        const mesh = this.mesh;
        const ui = this.ui;
        const materialItems = this.materialItems;
        const point = ui.constructor.getPoint(mesh);

        const items = [
            {
                type: 'list',
                name: 'Instance',
                list: new Map([
                    ['Mesh', false],
                    ['Instance', true]
                ]),
                value: 'Mesh',
                callback: (value, item) => {
                    if (value === 'Instance' && point) {
                        const index = point.instances[0].index;

                        const instanceItems = [
                            {
                                type: 'divider'
                            },
                            {
                                type: 'slider',
                                name: 'Opacity',
                                min: 0,
                                max: 1,
                                step: 0.01,
                                value: mesh.geometry.attributes.instanceOpacity.getX(index),
                                callback: nextValue => {
                                    if (!mesh.material.transparent) {
                                        mesh.material.transparent = true;
                                        mesh.material.needsUpdate = true;
                                    }

                                    point.instances.forEach(instance => {
                                        mesh.geometry.attributes.instanceOpacity.setX(instance.index, nextValue);
                                    });

                                    mesh.geometry.attributes.instanceOpacity.needsUpdate = true;
                                }
                            }
                        ];

                        const instancePanel = new Panel();
                        instancePanel.animateIn(true);
                        instanceItems.forEach(data => instancePanel.add(new PanelItem(data)));
                        item.setContent(instancePanel);
                    } else {
                        const materialPanel = new Panel();
                        materialPanel.animateIn(true);
                        materialItems.forEach(data => materialPanel.add(new PanelItem(data)));
                        item.setContent(materialPanel);
                    }
                }
            }
        ];

        items.forEach(data => {
            this.add(new PanelItem(data));
        });
    }
}

MaterialPanels.InstancedMeshPanel = InstancedMeshPanel;

function Scene({ overlayEl, ui }) {
    const pointRef = useRef(null);
    const [mesh, setMesh] = useState(null);

    const geometry = useMemo(() => {
        let nextGeometry = new IcosahedronGeometry(0.5, 12);
        nextGeometry = mergeVertices(nextGeometry);
        nextGeometry.computeTangents();
        nextGeometry.setAttribute('instanceOpacity', new InstancedBufferAttribute(new Float32Array(count).fill(1), 1));
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

    useFrame(() => {
        ui.update();
    });

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
 * Declarative instanced-materials example with modified Phong opacity support.
 */
export default function MaterialsInstancingModified({ title }) {
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
                camera={{ fov: 60, near: 1, far: 2000, position: [amount, amount, amount] }}
                onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
            >
                <Scene overlayEl={overlayEl} ui={ui} />
            </Canvas>
            <div ref={setOverlayEl} style={{ inset: 0, pointerEvents: 'none', position: 'absolute' }} />
        </Example>
    );
}
