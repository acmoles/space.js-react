/**
 * @author Space.js React
 *
 * Sheen color sub-panel for MeshPhysicalMaterial.
 *
 * Ported from the reference `PhysicalMaterialSheenColorPanel` class.
 */

import { subPanel } from '../subPanel.js';
import { mapPanelItems } from '../textures/mapPanel.js';

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function physicalMaterialSheenColorPanelItems(mesh, ui) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const material = materials[0];

    return [
        {
            type: 'content',
            callback: (value, item) => {
                item.setContent(subPanel(mapPanelItems(mesh, ui, 'sheenColorMap')));
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'color',
            name: 'Sheen Color',
            value: material.sheenColor,
            callback: value => {
                materials.forEach(material => material.sheenColor.copy(value));
            }
        }
    ];
}
