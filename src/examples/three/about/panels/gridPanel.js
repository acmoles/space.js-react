/**
 * Grid helper visibility sub-panel. Port of `GridPanel` from the About app.
 */

import { getKeyByValue } from '@lib/three.js';

export function gridPanelItems(helper) {
    const gridOptions = new Map([
        ['Off', false],
        ['On', true]
    ]);

    return [
        {
            type: 'divider'
        },
        {
            type: 'list',
            list: gridOptions,
            value: getKeyByValue(gridOptions, helper.visible),
            callback: value => {
                helper.visible = gridOptions.get(value);
            }
        }
    ];
}
