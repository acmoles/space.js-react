/**
 * @author Space.js React
 *
 * Texture (diffuse) map panel.
 *
 * Ported from the reference `TextureMapPanel` class.
 */

import { SRGBColorSpace, UVMapping } from 'three';

import { mapPanelItems } from './mapPanel.js';

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function textureMapPanelItems(mesh, ui) {
    return mapPanelItems(mesh, ui, 'map', UVMapping, SRGBColorSpace);
}
