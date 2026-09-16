/**
 * Generic material Subsurface Scattering sub-panel + subsurface thickness map
 * panel. Port of `<Material>MaterialSubsurfacePanel` and `SubsurfaceMapPanel`
 * from the About app, keyed by material name.
 */

import { Texture } from 'three';

import { getKeyByValue } from '@lib/three.js';
import { MaterialPatches, subPanel } from '@/space/three/index.js';

import { ensureOnBeforeCompile } from './helpers.js';

export function subsurfaceMapPanelItems(mesh) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const uniforms = mesh.userData.subsurfaceUniforms;

    let supported = false;
    let initialized = false;

    function setSupported(texture) {
        supported = !!(texture && texture.isTexture && !texture.isRenderTargetTexture && !texture.isCubeTexture);
    }

    setSupported(uniforms.thicknessMap.value);

    return [
        {
            type: 'divider'
        },
        {
            type: 'thumbnail',
            name: 'Map',
            data: supported ? uniforms.thicknessMap.value : {},
            value: supported ? uniforms.thicknessMap.value.userData.thumbnail : null,
            callback: (value, item) => {
                if (initialized) {
                    if (value) {
                        if (supported) {
                            uniforms.thicknessMap.value.dispose();
                            uniforms.thicknessMap.value = new Texture(value);
                        } else {
                            uniforms.thicknessMap.value = new Texture(value);
                        }

                        uniforms.thicknessMap.value.userData.thumbnail = uniforms.thicknessMap.value.source.data;
                        uniforms.thicknessMap.value.needsUpdate = true;
                        uniforms.thicknessUseMap.value = true;
                    } else if (supported) {
                        uniforms.thicknessMap.value.dispose();
                        uniforms.thicknessMap.value = null;
                        uniforms.thicknessUseMap.value = false;
                    }

                    materials.forEach(material => {
                        material.needsUpdate = true;
                    });

                    setSupported(uniforms.thicknessMap.value);

                    item.setData(supported ? uniforms.thicknessMap.value : {});
                }

                if (!initialized) {
                    initialized = true;
                }
            }
        }
    ];
}

export function materialSubsurfacePanelItems(key) {
    return mesh => {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        // Defaults
        if (mesh.userData.subsurface === undefined) {
            mesh.userData.subsurface = false;

            mesh.userData.subsurfaceUniforms = {
                thicknessMap: { value: null },
                thicknessUseMap: { value: false },
                thicknessDistortion: { value: 0.1 },
                thicknessAmbient: { value: 0 },
                thicknessAttenuation: { value: 0.5 },
                thicknessPower: { value: 2 },
                thicknessScale: { value: 10 }
            };
        }

        const subsurfaceOptions = new Map([
            ['Off', false],
            ['On', true]
        ]);

        const subsurfaceItems = [
            {
                type: 'content',
                callback: (value, item) => {
                    item.setContent(subPanel(subsurfaceMapPanelItems(mesh)));
                }
            },
            {
                type: 'divider'
            },
            {
                type: 'slider',
                name: 'Distort',
                min: 0,
                max: 1,
                step: 0.01,
                value: mesh.userData.subsurfaceUniforms.thicknessDistortion.value,
                callback: value => {
                    mesh.userData.subsurfaceUniforms.thicknessDistortion.value = value;
                }
            },
            {
                type: 'slider',
                name: 'Ambient',
                min: 0,
                max: 5,
                step: 0.01,
                value: mesh.userData.subsurfaceUniforms.thicknessAmbient.value,
                callback: value => {
                    mesh.userData.subsurfaceUniforms.thicknessAmbient.value = value;
                }
            },
            {
                type: 'slider',
                name: 'Atten',
                min: 0,
                max: 5,
                step: 0.01,
                value: mesh.userData.subsurfaceUniforms.thicknessAttenuation.value,
                callback: value => {
                    mesh.userData.subsurfaceUniforms.thicknessAttenuation.value = value;
                }
            },
            {
                type: 'slider',
                name: 'Power',
                min: 1,
                max: 32,
                step: 0.1,
                value: mesh.userData.subsurfaceUniforms.thicknessPower.value,
                callback: value => {
                    mesh.userData.subsurfaceUniforms.thicknessPower.value = value;
                }
            },
            {
                type: 'slider',
                name: 'Scale',
                min: 0,
                max: 64,
                step: 0.1,
                value: mesh.userData.subsurfaceUniforms.thicknessScale.value,
                callback: value => {
                    mesh.userData.subsurfaceUniforms.thicknessScale.value = value;
                }
            }
        ];

        return [
            {
                type: 'divider'
            },
            {
                type: 'list',
                name: 'Subsurface Scattering',
                list: subsurfaceOptions,
                value: getKeyByValue(subsurfaceOptions, mesh.userData.subsurface),
                callback: (value, item) => {
                    if (!item.hasContent()) {
                        item.setContent(subPanel(subsurfaceItems));
                    }

                    mesh.userData.subsurface = subsurfaceOptions.get(value);

                    if (mesh.userData.subsurface) {
                        materials.forEach(material => {
                            ensureOnBeforeCompile(material, mesh);
                            material.userData.onBeforeCompile.subsurface = MaterialPatches[key].subsurface;
                        });

                        item.toggleContent(true);
                    } else {
                        materials.forEach(material => delete material.userData.onBeforeCompile.subsurface);

                        item.toggleContent(false);
                    }

                    materials.forEach(material => {
                        material.customProgramCacheKey = () => Object.keys(material.userData.onBeforeCompile).join('|');
                        material.needsUpdate = true;
                    });
                }
            }
        ];
    };
}
