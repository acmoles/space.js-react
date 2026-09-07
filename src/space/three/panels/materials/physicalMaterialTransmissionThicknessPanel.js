/**
 * @author Space.js React
 *
 * Transmission thickness sub-panel for MeshPhysicalMaterial.
 *
 * Ported from the reference `PhysicalMaterialTransmissionThicknessPanel` class.
 */

import { subPanel } from '../subPanel.js';
import { mapPanelItems } from '../textures/mapPanel.js';

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function physicalMaterialTransmissionThicknessPanelItems(mesh, ui) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const material = materials[0];

    return [
        {
            type: 'content',
            callback: (value, item) => {
                item.setContent(subPanel(mapPanelItems(mesh, ui, 'thicknessMap')));
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'Thick',
            min: -10,
            max: 10,
            step: 0.1,
            value: material.thickness,
            callback: value => {
                materials.forEach(material => material.thickness = value);
            }
        }
    ];
}
