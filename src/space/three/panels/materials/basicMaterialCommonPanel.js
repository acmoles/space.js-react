/**
 * @author Space.js React
 *
 * Common controls shared by every MeshBasicMaterial panel.
 *
 * Ported from the reference `BasicMaterialCommonPanel` class.
 */

import { getKeyByValue } from '@lib/utils/Utils.js';

import { FogOptions, ToneMappedOptions, WireframeOptions } from '../options.js';

/**
 * @param {import('three').Mesh} mesh
 * @returns {object[]} Panel item descriptors.
 */
export function basicMaterialCommonPanelItems(mesh) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const material = materials[0];

    return [
        {
            type: 'divider'
        },
        {
            type: 'color',
            name: 'Color',
            value: material.color,
            callback: value => {
                materials.forEach(material => material.color.copy(value));
            }
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
            name: 'Fog',
            list: FogOptions,
            value: getKeyByValue(FogOptions, material.fog),
            callback: value => {
                materials.forEach(material => material.fog = FogOptions.get(value));
            }
        },
        {
            type: 'list',
            name: 'Tone',
            list: ToneMappedOptions,
            value: getKeyByValue(ToneMappedOptions, material.toneMapped),
            callback: value => {
                materials.forEach(material => material.toneMapped = ToneMappedOptions.get(value));
            }
        }
    ];
}
