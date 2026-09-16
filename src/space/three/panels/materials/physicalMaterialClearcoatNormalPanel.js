/**
 * @author Space.js React
 *
 * Clearcoat normal sub-panel for MeshPhysicalMaterial.
 *
 * Ported from the reference `PhysicalMaterialClearcoatNormalPanel` class.
 */

import { subPanel } from '../subPanel.js';
import { mapPanelItems } from '../textures/mapPanel.js';

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function physicalMaterialClearcoatNormalPanelItems(mesh, ui) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const material = materials[0];

    return [
        {
            type: 'content',
            callback: (value, item) => {
                item.setContent(subPanel(mapPanelItems(mesh, ui, 'clearcoatNormalMap')));
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'Normal X',
            min: -10,
            max: 10,
            step: 0.1,
            value: material.clearcoatNormalScale.x,
            callback: value => {
                materials.forEach(material => material.clearcoatNormalScale.x = value);
            }
        },
        {
            type: 'slider',
            name: 'Normal Y',
            min: -10,
            max: 10,
            step: 0.1,
            value: material.clearcoatNormalScale.y,
            callback: value => {
                materials.forEach(material => material.clearcoatNormalScale.y = value);
            }
        }
    ];
}
