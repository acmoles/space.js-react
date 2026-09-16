/**
 * @author Space.js React
 *
 * Iridescence thickness sub-panel for MeshPhysicalMaterial.
 *
 * Ported from the reference `PhysicalMaterialIridescenceThicknessPanel` class.
 */

import { subPanel } from '../subPanel.js';
import { mapPanelItems } from '../textures/mapPanel.js';

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function physicalMaterialIridescenceThicknessPanelItems(mesh, ui) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const material = materials[0];

    return [
        {
            type: 'content',
            callback: (value, item) => {
                item.setContent(subPanel(mapPanelItems(mesh, ui, 'iridescenceThicknessMap')));
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'Thick Min',
            min: 0,
            max: 1400,
            step: 100,
            value: material.iridescenceThicknessRange[0],
            callback: value => {
                materials.forEach(material => material.iridescenceThicknessRange[0] = value);
            }
        },
        {
            type: 'slider',
            name: 'Thick Max',
            min: 0,
            max: 1400,
            step: 100,
            value: material.iridescenceThicknessRange[1],
            callback: value => {
                materials.forEach(material => material.iridescenceThicknessRange[1] = value);
            }
        }
    ];
}
