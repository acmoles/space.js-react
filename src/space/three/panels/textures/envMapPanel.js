/**
 * @author Space.js React
 *
 * Environment map panel (per-material envMap).
 *
 * Ported from the reference `EnvMapPanel` class.
 */

import { EquirectangularReflectionMapping, MathUtils, SRGBColorSpace } from 'three';

import { TwoPI, getKeyByValue } from '@lib/utils/Utils.js';

import { CombineOptions } from '../options.js';
import { mapPanelItems } from './mapPanel.js';

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function envMapPanelItems(mesh, ui) {
    return mapPanelItems(mesh, ui, 'envMap', EquirectangularReflectionMapping, SRGBColorSpace, (materials, material) => {
        const items = [
            {
                type: 'divider'
            },
            {
                type: 'slider',
                name: 'Rotate X',
                min: 0,
                max: 360,
                step: 1,
                value: MathUtils.radToDeg(material.envMapRotation.x + (material.envMapRotation.x < 0 ? TwoPI : 0)),
                callback: value => {
                    materials.forEach(material => material.envMapRotation.x = MathUtils.degToRad(value));
                }
            },
            {
                type: 'slider',
                name: 'Rotate Y',
                min: 0,
                max: 360,
                step: 1,
                value: MathUtils.radToDeg(material.envMapRotation.y + (material.envMapRotation.y < 0 ? TwoPI : 0)),
                callback: value => {
                    materials.forEach(material => material.envMapRotation.y = MathUtils.degToRad(value));
                }
            },
            {
                type: 'slider',
                name: 'Rotate Z',
                min: 0,
                max: 360,
                step: 1,
                value: MathUtils.radToDeg(material.envMapRotation.z + (material.envMapRotation.z < 0 ? TwoPI : 0)),
                callback: value => {
                    materials.forEach(material => material.envMapRotation.z = MathUtils.degToRad(value));
                }
            }
        ];

        if (material.envMapIntensity !== undefined) {
            items.push(
                {
                    type: 'slider',
                    name: 'Int',
                    min: 0,
                    max: 10,
                    step: 0.1,
                    value: material.envMapIntensity,
                    callback: value => {
                        materials.forEach(material => material.envMapIntensity = value);
                    }
                }
            );
        }

        if (material.combine !== undefined) {
            items.push(
                {
                    type: 'divider'
                },
                {
                    type: 'list',
                    name: 'Combine',
                    list: CombineOptions,
                    value: getKeyByValue(CombineOptions, material.combine),
                    callback: value => {
                        materials.forEach(material => {
                            material.combine = CombineOptions.get(value);
                            material.needsUpdate = true;
                        });
                    }
                },
                {
                    type: 'slider',
                    name: 'Reflect',
                    min: 0,
                    max: 1,
                    step: 0.01,
                    value: material.reflectivity,
                    callback: value => {
                        materials.forEach(material => material.reflectivity = value);
                    }
                },
                {
                    type: 'slider',
                    name: 'Refract',
                    min: 0,
                    max: 1,
                    step: 0.01,
                    value: material.refractionRatio,
                    callback: value => {
                        materials.forEach(material => material.refractionRatio = value);
                    }
                }
            );
        }

        return items;
    });
}
