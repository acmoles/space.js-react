/**
 * @author Space.js React
 *
 * AmbientLight panel item descriptors.
 *
 * Ported from the reference `AmbientLightPanel` class.
 */

import { getKeyByValue } from '@lib/utils/Utils.js';

import { VisibleOptions } from '../options.js';
import { subPanel } from '../subPanel.js';

/**
 * @param {object} panel
 * @param {import('three').AmbientLight} light
 * @returns {object[]} Panel item descriptors.
 */
export function ambientLightPanelItems(panel, light) {
    const lightItems = [
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
            }
        }
    ];

    return items;
}
