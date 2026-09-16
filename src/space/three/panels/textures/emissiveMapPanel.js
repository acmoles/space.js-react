/**
 * @author Space.js React
 *
 * Emissive map panel.
 *
 * Ported from the reference `EmissiveMapPanel` class.
 */

import { mapPanelItems } from './mapPanel.js';

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function emissiveMapPanelItems(mesh, ui) {
    return mapPanelItems(mesh, ui, 'emissiveMap', undefined, undefined, (materials, material) => [
        {
            type: 'divider'
        },
        {
            type: 'color',
            name: 'Emissive',
            value: material.emissive,
            callback: value => {
                materials.forEach(material => material.emissive.copy(value));
            }
        },
        {
            type: 'slider',
            name: 'Int',
            min: 0,
            max: 1,
            step: 0.01,
            value: material.emissiveIntensity,
            callback: value => {
                materials.forEach(material => material.emissiveIntensity = value);
            }
        }
    ]);
}
