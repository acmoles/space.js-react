import { createElement } from 'react';

import { Panel } from '@/space/components/panels/Panel.jsx';
import { LightOptions, LightPanelController, getKeyByLight, subPanel } from '@/space/three';

import { marsPanel } from './marsPanel.js';
import { sunlightPanel } from './sunlightPanel.js';
import { spacePanel } from './spacePanel.js';
import { postPanel } from './postPanel.js';

/**
 * Builds the top-level panel item descriptors for the Mars example.
 *
 * Ported from `examples/mars/src/controllers/panels/PanelController.js`. The
 * scene panels (Mars/Sunlight/Space/Post) and each scene light are exposed
 * through a single `list`, whose selection swaps the nested panel content.
 *
 * Unlike the vanilla version, each scene sub-panel is a `<Panel>` React element
 * built by its descriptor factory, and the factories that need `setPanelValue`
 * for a `Reset` link carry their own `ref`.
 *
 * @param {object} ctrl Shared controller bag. `ctrl.lights` is populated here.
 * @returns {object[]} Top-level panel item descriptors for `<UI panelItems>`.
 */
export function createPanelItems(ctrl) {
    const { scene } = ctrl;

    // Configure the shared light panel controller (helper toggles need scene).
    LightPanelController.init(scene);

    ctrl.lights = [];

    const sceneOptions = new Map([
        ['Mars', 'Mars'],
        ['Sunlight', 'Sunlight'],
        ['Space', 'Space'],
        ['Post', 'Post']
    ]);

    scene.traverse(object => {
        if (object.isLight) {
            const key = getKeyByLight(LightOptions, object);

            sceneOptions.set(key, [object, LightOptions.get(key)[1]]);

            ctrl.lights.push(object);
        }
    });

    const items = [
        {
            name: 'FPS'
        },
        {
            type: 'divider'
        },
        {
            type: 'list',
            list: sceneOptions,
            value: 'Mars',
            callback: (value, item) => {
                switch (value) {
                    case 'Mars': {
                        const { items: panelItems, ref } = marsPanel(ctrl);
                        ctrl.marsPanelRef = ref;
                        item.setContent(createElement(Panel, { items: panelItems, ref, autoAnimateIn: true }));
                        break;
                    }
                    case 'Sunlight': {
                        const { items: panelItems, ref } = sunlightPanel(ctrl);
                        item.setContent(createElement(Panel, { items: panelItems, ref, autoAnimateIn: true }));
                        break;
                    }
                    case 'Space': {
                        const { items: panelItems, ref } = spacePanel(ctrl);
                        item.setContent(createElement(Panel, { items: panelItems, ref, autoAnimateIn: true }));
                        break;
                    }
                    case 'Post': {
                        const { items: panelItems, ref } = postPanel(ctrl);
                        item.setContent(createElement(Panel, { items: panelItems, ref, autoAnimateIn: true }));
                        break;
                    }
                    default: {
                        const [light, buildLightPanelItems] = sceneOptions.get(value);
                        item.setContent(subPanel(buildLightPanelItems(LightPanelController, light)));
                        break;
                    }
                }
            }
        }
    ];

    return items;
}
