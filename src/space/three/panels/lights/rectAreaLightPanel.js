/**
 * @author Space.js React
 *
 * RectAreaLight panel item descriptors.
 *
 * Ported from the reference `RectAreaLightPanel` class.
 */

import { getKeyByValue } from '@lib/utils/Utils.js';

import { HelperOptions, VisibleOptions } from '../options.js';
import { subPanel } from '../subPanel.js';

/**
 * @param {object} panel
 * @param {import('three').RectAreaLight} light
 * @returns {object[]} Panel item descriptors.
 */
export function rectAreaLightPanelItems(panel, light) {
    // Defaults
    if (light.userData.helper === undefined) {
        light.userData.helper = false;
    }

    const lightItems = [
        {
            type: 'list',
            name: 'Helper',
            list: HelperOptions,
            value: getKeyByValue(HelperOptions, light.userData.helper),
            callback: value => {
                light.userData.helper = HelperOptions.get(value);

                panel.toggleRectAreaLightHelper(light, light.userData.helper);
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'color',
            name: 'Color',
            value: light.color,
            callback: value => {
                light.color.copy(value);
            }
        },
        {
            type: 'slider',
            name: 'Int',
            min: 0,
            max: 10,
            step: 0.1,
            value: light.intensity,
            callback: value => {
                light.intensity = value;
            }
        },
        {
            type: 'slider',
            name: 'Width',
            min: 0,
            max: 10,
            step: 0.1,
            value: light.width,
            callback: value => {
                light.width = value;
            }
        },
        {
            type: 'slider',
            name: 'Height',
            min: 0,
            max: 10,
            step: 0.1,
            value: light.height,
            callback: value => {
                light.height = value;
            }
        }
    ];

    const items = [
        {
            type: 'divider'
        },
        {
            type: 'list',
            name: 'Visible',
            list: VisibleOptions,
            value: getKeyByValue(VisibleOptions, light.visible),
            callback: (value, item) => {
                if (!item.hasContent()) {
                    item.setContent(subPanel(lightItems));
                }

                light.visible = VisibleOptions.get(value);

                if (light.visible) {
                    item.toggleContent(true);
                } else {
                    item.toggleContent(false);
                }

                if (light.helper) {
                    light.helper.visible = light.visible;
                }
            }
        }
    ];

    return items;
}
