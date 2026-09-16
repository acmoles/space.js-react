/**
 * @author Space.js React
 *
 * Bump map panel.
 *
 * Ported from the reference `BumpMapPanel` class.
 */

import { mapPanelItems } from './mapPanel.js';

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function bumpMapPanelItems(mesh, ui) {
    return mapPanelItems(mesh, ui, 'bumpMap', undefined, undefined, (materials, material) => [
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'Scale',
            min: -10,
            max: 10,
            step: 0.1,
            value: material.bumpScale,
            callback: value => {
                materials.forEach(material => material.bumpScale = value);
            }
        }
    ]);
}
