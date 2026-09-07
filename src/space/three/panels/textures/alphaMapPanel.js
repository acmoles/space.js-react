/**
 * @author Space.js React
 *
 * Alpha map panel.
 *
 * Ported from the reference `AlphaMapPanel` class.
 */

import { mapPanelItems } from './mapPanel.js';

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function alphaMapPanelItems(mesh, ui) {
    return mapPanelItems(mesh, ui, 'alphaMap');
}
