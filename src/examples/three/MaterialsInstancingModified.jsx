import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Color, IcosahedronGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshPhongMaterial } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

import { InstanceOptions, MaterialPanels, MaterialPatches, MaterialsPanel, Panel, PanelItem, Point3D, UI } from '@lib/three.js';
import { Example } from '@/components';

const isDebug = /[?&]debug/.test(location.search);

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

        let point;

        if (ui.constructor.points) {
            point = ui.constructor.getPoint(mesh);
        }

        const items = [
            {
                type: 'list',
                name: 'Instance',
                list: InstanceOptions,
                value: 'Mesh',
                callback: (value, item) => {
                    if (InstanceOptions.get(value)) {
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
                                callback: val => {
                                    if (!mesh.material.transparent) {
                                        mesh.material.transparent = true;
                                        mesh.material.needsUpdate = true;
                                    }

                                    point.instances.forEach(instance => {
                                        mesh.geometry.attributes.instanceOpacity.setX(instance.index, val);
                                    });

                                    mesh.geometry.attributes.instanceOpacity.needsUpdate = true;
                                }
                            }
                        ];

                        const instancePanel = new Panel();
                        instancePanel.animateIn(true);

                        instanceItems.forEach(data => {
                            instancePanel.add(new PanelItem(data));
                        });

                        item.setContent(instancePanel);
                    } else {
                        const materialPanel = new Panel();
                        materialPanel.animateIn(true);

                        materialItems.forEach(data => {
                            materialPanel.add(new PanelItem(data));
                        });

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

function Scene({ containerRef }) {
    const { gl: renderer, scene, camera } = useThree();
    const uiRef = useRef(null);
    const isActiveRef = useRef(false);

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

        // Add attributes
        geometry.setAttribute('instanceOpacity', new InstancedBufferAttribute(new Float32Array(mesh.instanceMatrix.count).fill(1), 1));

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
        isActiveRef.current = true;

        return () => {
            // Clear the active flag first so useFrame stops touching destroyed state
            isActiveRef.current = false;
            scene.remove(point);
            scene.remove(mesh);
            geometry.dispose();
            material.dispose();
            Point3D.destroy();
            uiRef.current = null;
            ui.destroy();
        };
    }, [renderer, scene, camera, containerRef]);

    useFrame(state => {
        if (!isActiveRef.current) return;

        const time = state.clock.getElapsedTime();

        Point3D.update(time);
        uiRef.current.update();
    });

    return (
        <>
            <color attach="background" args={[0x060606]} />
            <hemisphereLight args={[0xffffff, 0x888888, 3]} />
            <OrbitControls enableDamping enableZoom={false} enablePan={false} />
        </>
    );
}

export default function MaterialsInstancingModified({ title }) {
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
