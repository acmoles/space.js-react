/**
 * @author Space.js React
 *
 * Common controls shared by every MeshStandardMaterial panel.
 *
 * Ported from the reference `StandardMaterialCommonPanel` class. Panel
 * definitions are plain functions that return an array of item descriptors,
 * so they carry no rendering concerns and are consumed declaratively by the
 * React `<Panel items={...} />` component.
 */

import { getKeyByValue } from '@lib/utils/Utils.js';

import { FlatShadingOptions, FogOptions, ToneMappedOptions, WireframeOptions } from '../options.js';

/**
 * @param {import('three').Mesh} mesh
 * @returns {object[]} Panel item descriptors.
 */
export function standardMaterialCommonPanelItems(mesh) {
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
            type: 'slider',
            name: 'Rough',
            min: 0,
            max: 2,
            step: 0.01,
            value: material.roughness,
            callback: value => {
                materials.forEach(material => material.roughness = value);
            }
        },
        {
            type: 'slider',
            name: 'Metal',
            min: 0,
            max: 1,
            step: 0.01,
            value: material.metalness,
            callback: value => {
                materials.forEach(material => material.metalness = value);
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
