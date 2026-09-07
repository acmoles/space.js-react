/**
 * @author Space.js React
 *
 * Environment sub-panel for MeshPhysicalMaterial.
 *
 * Ported from the reference `PhysicalMaterialEnvPanel` class.
 */

import { subPanel } from '../subPanel.js';
import { envMapPanelItems } from '../textures/envMapPanel.js';

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function physicalMaterialEnvPanelItems(mesh, ui) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const material = materials[0];

    return [
        {
            type: 'content',
            callback: (value, item) => {
                item.setContent(subPanel(envMapPanelItems(mesh, ui)));
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'IOR',
            min: 1,
            max: 2.333,
            step: 0.01,
            value: material.ior,
            callback: value => {
                materials.forEach(material => material.ior = value);
            }
        },
        {
            type: 'slider',
            name: 'Reflect',
            min: 0,
            max: 1,
            step: 0.01,
            value: material.reflectivity,
            callback: value => {
                materials.forEach(material => material.reflectivity = value);
            }
        }
    ];
}
