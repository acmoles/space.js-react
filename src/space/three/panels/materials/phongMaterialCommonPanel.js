/**
 * @author Space.js React
 *
 * Common controls shared by every MeshPhongMaterial panel.
 *
 * Ported from the reference `PhongMaterialCommonPanel` class.
 */

import { getKeyByValue } from '@lib/utils/Utils.js';

import { FlatShadingOptions, FogOptions, ToneMappedOptions, WireframeOptions } from '../options.js';

/**
 * @param {import('three').Mesh} mesh
 * @returns {object[]} Panel item descriptors.
 */
export function phongMaterialCommonPanelItems(mesh) {
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
            type: 'color',
            name: 'Emissive',
            value: material.emissive,
            callback: value => {
                materials.forEach(material => material.emissive.copy(value));
            }
        },
        {
            type: 'color',
            name: 'Specular',
            value: material.specular,
            callback: value => {
                materials.forEach(material => material.specular.copy(value));
            }
        },
        {
            type: 'slider',
            name: 'Shiny',
            min: 0,
            max: 100,
            step: 0.1,
            value: material.shininess,
            callback: value => {
                materials.forEach(material => material.shininess = value);
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
            name: 'Flat',
            list: FlatShadingOptions,
            value: getKeyByValue(FlatShadingOptions, material.flatShading),
            callback: value => {
                materials.forEach(material => {
                    material.flatShading = FlatShadingOptions.get(value);
                    material.needsUpdate = true;
                });
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
