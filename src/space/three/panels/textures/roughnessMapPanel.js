/**
 * @author Space.js React
 *
 * Roughness map panel.
 *
 * Ported from the reference `RoughnessMapPanel` class.
 */

import { mapPanelItems } from './mapPanel.js';

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function roughnessMapPanelItems(mesh, ui) {
    return mapPanelItems(mesh, ui, 'roughnessMap', undefined, undefined, (materials, material) => [
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'Int',
            min: 0,
            max: 2,
            step: 0.01,
            value: material.roughness,
            callback: value => {
                materials.forEach(material => material.roughness = value);
            }
        }
    ]);
}
