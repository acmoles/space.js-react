/**
 * @author Space.js React
 *
 * Light map panel.
 *
 * Ported from the reference `LightMapPanel` class.
 */

import { mapPanelItems } from './mapPanel.js';

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function lightMapPanelItems(mesh, ui) {
    return mapPanelItems(mesh, ui, 'lightMap', undefined, undefined, (materials, material) => [
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'Int',
            min: 0,
            max: 1,
            step: 0.01,
            value: material.lightMapIntensity,
            callback: value => {
                materials.forEach(material => material.lightMapIntensity = value);
            }
        }
    ]);
}
