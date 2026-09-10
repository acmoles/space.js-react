/**
 * @author Space.js React
 *
 * Metalness map panel.
 *
 * Ported from the reference `MetalnessMapPanel` class.
 */

import { mapPanelItems } from './mapPanel.js';

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function metalnessMapPanelItems(mesh, ui) {
    return mapPanelItems(mesh, ui, 'metalnessMap', undefined, undefined, (materials, material) => [
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'Int',
            min: 0,
            max: 1,
            step: 0.01,
            value: material.metalness,
            callback: value => {
                materials.forEach(material => material.metalness = value);
            }
        }
    ]);
}
