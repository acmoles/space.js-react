/**
 * @author Space.js React
 *
 * Transmission intensity sub-panel for MeshPhysicalMaterial.
 *
 * Ported from the reference `PhysicalMaterialTransmissionIntensityPanel` class.
 */

import { subPanel } from '../subPanel.js';
import { mapPanelItems } from '../textures/mapPanel.js';

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function physicalMaterialTransmissionIntensityPanelItems(mesh, ui) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const material = materials[0];

    return [
        {
            type: 'content',
            callback: (value, item) => {
                item.setContent(subPanel(mapPanelItems(mesh, ui, 'transmissionMap')));
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'Int',
            min: 0,
            max: 1,
            step: 0.01,
            value: material.transmission,
            callback: value => {
                materials.forEach(material => material.transmission = value);
            }
        }
    ];
}
