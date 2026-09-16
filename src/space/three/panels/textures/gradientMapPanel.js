/**
 * @author Space.js React
 *
 * Gradient map panel.
 *
 * Ported from the reference `GradientMapPanel` class.
 */

import { mapPanelItems } from './mapPanel.js';

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function gradientMapPanelItems(mesh, ui) {
    return mapPanelItems(mesh, ui, 'gradientMap');
}
