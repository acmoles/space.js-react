/**
 * Environment sub-panel: environment map controls. Port of the reference
 * `EnvironmentPanel`.
 */

import { environmentMapPanelItems, subPanel } from '@/space/three/index.js';

export function environmentPanelItems(scene) {
    return [
        {
            type: 'content',
            callback: (value, item) => {
                item.setContent(subPanel(environmentMapPanelItems(scene)));
            }
        }
    ];
}
