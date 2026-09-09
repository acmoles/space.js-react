/**
 * Generic material Adjustments sub-panel.
 *
 * Port of `<Material>MaterialAdjustmentsPanel` from the About app. All material
 * variants were near-identical, differing only in which `MaterialPatches[Key]`
 * shader patch they enabled, so a single factory keyed by material name covers
 * Basic/Lambert/Matcap/Phong/Toon/Standard/Physical.
 */

import { getKeyByValue } from '@lib/three.js';
import { MaterialPatches, subPanel } from '@/space/three/index.js';

import { ensureOnBeforeCompile } from './helpers.js';

export function materialAdjustmentsPanelItems(key) {
    return mesh => {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        // Defaults
        if (mesh.userData.adjustments === undefined) {
            mesh.userData.adjustments = false;

            mesh.userData.adjustmentsUniforms = {
                hue: { value: 0 },
                saturation: { value: 0 },
                lightness: { value: 0 },
                brightness: { value: 0 },
                contrast: { value: 0 }
            };
        }

        const adjustmentsOptions = new Map([
            ['Off', false],
            ['On', true]
        ]);

        const adjustmentsItems = [
            {
                type: 'slider',
                name: 'Hue',
                min: -180,
                max: 180,
                step: 1,
                value: mesh.userData.adjustmentsUniforms.hue.value * 360,
                callback: value => {
                    mesh.userData.adjustmentsUniforms.hue.value = value / 360;
                }
            },
            {
                type: 'slider',
                name: 'Saturate',
                min: -100,
                max: 100,
                step: 1,
                value: mesh.userData.adjustmentsUniforms.saturation.value * 100,
                callback: value => {
                    mesh.userData.adjustmentsUniforms.saturation.value = value / 100;
                }
            },
            {
                type: 'slider',
                name: 'Light',
                min: -100,
                max: 100,
                step: 1,
                value: mesh.userData.adjustmentsUniforms.lightness.value * 100,
                callback: value => {
                    mesh.userData.adjustmentsUniforms.lightness.value = value / 100;
                }
            },
            {
                type: 'divider'
            },
            {
                type: 'slider',
                name: 'Bright',
                min: -100,
                max: 100,
                step: 1,
                value: mesh.userData.adjustmentsUniforms.brightness.value * 100,
                callback: value => {
                    mesh.userData.adjustmentsUniforms.brightness.value = value / 100;
                }
            },
            {
                type: 'slider',
                name: 'Contrast',
                min: -100,
                max: 100,
                step: 1,
                value: mesh.userData.adjustmentsUniforms.contrast.value * 100,
                callback: value => {
                    mesh.userData.adjustmentsUniforms.contrast.value = value / 100;
                }
            }
        ];

        return [
            {
                type: 'divider'
            },
            {
                type: 'list',
                name: 'Adjustments',
                list: adjustmentsOptions,
                value: getKeyByValue(adjustmentsOptions, mesh.userData.adjustments),
                callback: (value, item) => {
                    if (!item.hasContent()) {
                        item.setContent(subPanel(adjustmentsItems));
                    }

                    mesh.userData.adjustments = adjustmentsOptions.get(value);

                    if (mesh.userData.adjustments) {
                        materials.forEach(material => {
                            ensureOnBeforeCompile(material, mesh);
                            material.userData.onBeforeCompile.adjustments = MaterialPatches[key].adjustments;
                        });

                        item.toggleContent(true);
                    } else {
                        materials.forEach(material => delete material.userData.onBeforeCompile.adjustments);

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
