/**
 * @author Space.js React
 *
 * Displacement map panel.
 *
 * Ported from the reference `DisplacementMapPanel` class.
 */

import { mapPanelItems } from './mapPanel.js';

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function displacementMapPanelItems(mesh, ui) {
    return mapPanelItems(mesh, ui, 'displacementMap', undefined, undefined, (materials, material) => [
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'Scale',
            min: 0,
            max: 1,
            step: 0.01,
            value: material.displacementScale,
            callback: value => {
                materials.forEach(material => material.displacementScale = value);
            }
        },
        {
            type: 'slider',
            name: 'Bias',
            min: 0,
            max: 1,
            step: 0.01,
            value: material.displacementBias,
            callback: value => {
                materials.forEach(material => material.displacementBias = value);
            }
        }
    ]);
}
