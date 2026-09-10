/**
 * @author Space.js React
 *
 * AO (ambient occlusion) map panel.
 *
 * Ported from the reference `AOMapPanel` class.
 */

import { mapPanelItems } from './mapPanel.js';

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function aoMapPanelItems(mesh, ui) {
    return mapPanelItems(mesh, ui, 'aoMap', undefined, undefined, (materials, material) => [
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'Int',
            min: 0,
            max: 1,
            step: 0.01,
            value: material.aoMapIntensity,
            callback: value => {
                materials.forEach(material => material.aoMapIntensity = value);
            }
        }
    ]);
}
