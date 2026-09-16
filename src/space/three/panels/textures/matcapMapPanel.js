/**
 * @author Space.js React
 *
 * Matcap map panel.
 *
 * Ported from the reference `MatcapMapPanel` class.
 */

import { SRGBColorSpace, UVMapping } from 'three';

import { mapPanelItems } from './mapPanel.js';

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function matcapMapPanelItems(mesh, ui) {
    return mapPanelItems(mesh, ui, 'matcap', UVMapping, SRGBColorSpace);
}
