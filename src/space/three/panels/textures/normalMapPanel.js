/**
 * @author Space.js React
 *
 * Normal map panel.
 *
 * Ported from the reference `NormalMapPanel` class.
 */

import { getKeyByValue } from '@lib/utils/Utils.js';

import { NormalMapOptions } from '../options.js';
import { mapPanelItems } from './mapPanel.js';

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function normalMapPanelItems(mesh, ui) {
    return mapPanelItems(mesh, ui, 'normalMap', undefined, undefined, (materials, material) => [
        {
            type: 'divider'
        },
        {
            type: 'list',
            name: 'Type',
            list: NormalMapOptions,
            value: getKeyByValue(NormalMapOptions, material.normalMapType),
            callback: value => {
                materials.forEach(material => {
                    material.normalMapType = NormalMapOptions.get(value);
                    material.needsUpdate = true;
                });
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'Scale X',
            min: -10,
            max: 10,
            step: 0.1,
            value: material.normalScale.x,
            callback: value => {
                materials.forEach(material => material.normalScale.x = value);
            }
        },
        {
            type: 'slider',
            name: 'Scale Y',
            min: -10,
            max: 10,
            step: 0.1,
            value: material.normalScale.y,
            callback: value => {
                materials.forEach(material => material.normalScale.y = value);
            }
        }
    ]);
}
