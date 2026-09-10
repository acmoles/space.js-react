/**
 * @author Space.js React
 *
 * Clearcoat roughness sub-panel for MeshPhysicalMaterial.
 *
 * Ported from the reference `PhysicalMaterialClearcoatRoughnessPanel` class.
 */

import { subPanel } from '../subPanel.js';
import { mapPanelItems } from '../textures/mapPanel.js';

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function physicalMaterialClearcoatRoughnessPanelItems(mesh, ui) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const material = materials[0];

    return [
        {
            type: 'content',
            callback: (value, item) => {
                item.setContent(subPanel(mapPanelItems(mesh, ui, 'clearcoatRoughnessMap')));
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'Rough',
            min: 0,
            max: 1,
            step: 0.01,
            value: material.clearcoatRoughness,
            callback: value => {
                materials.forEach(material => material.clearcoatRoughness = value);
            }
        }
    ];
}
