/**
 * @author Space.js React
 *
 * HemisphereLight panel item descriptors.
 *
 * Ported from the reference `HemisphereLightPanel` class.
 */

import { getKeyByValue } from '@lib/utils/Utils.js';

import { HelperOptions, VisibleOptions } from '../options.js';
import { subPanel } from '../subPanel.js';

/**
 * @param {object} panel
 * @param {import('three').HemisphereLight} light
 * @returns {object[]} Panel item descriptors.
 */
export function hemisphereLightPanelItems(panel, light) {
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

                panel.toggleHemisphereLightHelper(light, light.userData.helper);
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'color',
            name: 'Sky Color',
            value: light.color,
            callback: value => {
                light.color.copy(value);

                if (light.helper) {
                    light.helper.update();
                }
            }
        },
        {
            type: 'color',
            name: 'Ground Color',
            value: light.groundColor,
            callback: value => {
                light.groundColor.copy(value);

                if (light.helper) {
                    light.helper.update();
                }
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
