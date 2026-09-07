/**
 * @author Space.js React
 *
 * Specular map panel.
 *
 * Ported from the reference `SpecularMapPanel` class.
 */

import { mapPanelItems } from './mapPanel.js';

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function specularMapPanelItems(mesh, ui) {
    return mapPanelItems(mesh, ui, 'specularMap');
}
