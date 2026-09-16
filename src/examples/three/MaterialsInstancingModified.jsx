import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Color, IcosahedronGeometry, InstancedBufferAttribute, Matrix4, MeshPhongMaterial } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

import { Example } from '@/components';
import { UI } from '@/space/index.js';

import { MaterialPanels, MaterialPatches, Point3D, Point3DPanel, Points3D, subPanel, useMaterialsPanelItems } from '../../space/three/index.js';

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

// Overrides the built-in instanced-mesh panel with one that also exposes
// per-instance opacity, backed by the `instanceOpacity` attribute patched into
// the Phong shader above.
function instancedMeshPanelItems(mesh, ui, materialItems) {
    const point = ui.constructor.getPoint(mesh);

    return [
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

                    item.setContent(subPanel([
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
                    ]));
                } else {
                    item.setContent(subPanel(materialItems));
                }
            }
        }
    ];
}

MaterialPanels.instancedMeshPanelItems = instancedMeshPanelItems;

function Scene({ overlayEl }) {
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

    const panelItems = useMaterialsPanelItems(mesh, panelUi);

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
                        ref={pointRef}
                    >
                        <Point3DPanel items={panelItems} />
                    </Point3D>
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
    const uiRef = useRef(null);
    const [overlayEl, setOverlayEl] = useState(null);

    useEffect(() => {
        uiRef.current?.animateIn();
    }, []);

    return (
        <Example title={title}>
            <UI fps ref={uiRef} />
            <Canvas
                flat
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
