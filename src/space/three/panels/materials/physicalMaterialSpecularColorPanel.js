/**
 * @author Space.js React
 *
 * Specular color sub-panel for MeshPhysicalMaterial.
 *
 * Ported from the reference `PhysicalMaterialSpecularColorPanel` class.
 */

import { subPanel } from '../subPanel.js';
import { mapPanelItems } from '../textures/mapPanel.js';

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function physicalMaterialSpecularColorPanelItems(mesh, ui) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const material = materials[0];

    return [
        {
            type: 'content',
            callback: (value, item) => {
                item.setContent(subPanel(mapPanelItems(mesh, ui, 'specularColorMap')));
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'color',
            name: 'Specular Color',
            value: material.specularColor,
            callback: value => {
                materials.forEach(material => material.specularColor.copy(value));
            }
        }
    ];
}
