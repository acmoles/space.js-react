/**
 * @author Space.js React
 *
 * Common controls shared by every MeshNormalMaterial panel.
 *
 * Ported from the reference `NormalMaterialCommonPanel` class.
 */

import { getKeyByValue } from '@lib/utils/Utils.js';

import { FlatShadingOptions, WireframeOptions } from '../options.js';

/**
 * @param {import('three').Mesh} mesh
 * @returns {object[]} Panel item descriptors.
 */
export function normalMaterialCommonPanelItems(mesh) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const material = materials[0];

    return [
        {
            type: 'divider'
        },
        {
            type: 'list',
            name: 'Wire',
            list: WireframeOptions,
            value: getKeyByValue(WireframeOptions, material.wireframe),
            callback: value => {
                materials.forEach(material => material.wireframe = WireframeOptions.get(value));
            }
        },
        {
            type: 'list',
            name: 'Flat',
            list: FlatShadingOptions,
            value: getKeyByValue(FlatShadingOptions, material.flatShading),
            callback: value => {
                materials.forEach(material => {
                    material.flatShading = FlatShadingOptions.get(value);
                    material.needsUpdate = true;
                });
            }
        }
    ];
}
