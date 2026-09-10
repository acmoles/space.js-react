/**
 * @author Space.js React
 *
 * Specular intensity sub-panel for MeshPhysicalMaterial.
 *
 * Ported from the reference `PhysicalMaterialSpecularIntensityPanel` class.
 */

import { subPanel } from '../subPanel.js';
import { mapPanelItems } from '../textures/mapPanel.js';

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function physicalMaterialSpecularIntensityPanelItems(mesh, ui) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const material = materials[0];

    return [
        {
            type: 'content',
            callback: (value, item) => {
                item.setContent(subPanel(mapPanelItems(mesh, ui, 'specularIntensityMap')));
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'Int',
            min: 0,
            max: 32,
            step: 0.1,
            value: material.specularIntensity,
            callback: value => {
                materials.forEach(material => material.specularIntensity = value);
            }
        }
    ];
}
