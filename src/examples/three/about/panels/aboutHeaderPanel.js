import { Vector3 } from 'three';
import { getKeyByValue } from '@lib/three.js';

import {
    DisplayOptions,
    LightOptions,
    LightPanelController,
    getKeyByLight,
    subPanel
} from '@/space/three/index.js';

import { params } from '../state.js';

import { backgroundPanelItems } from './backgroundPanel.js';
import { environmentPanelItems } from './environmentPanel.js';
import { postPanelItems } from './postPanel.js';
import { gridPanelItems } from './gridPanel.js';

/**
 * Builds the header hover-panel item descriptors, mirroring the About app's
 * `PanelController.initPanel()`.
 *
 * The scene list combines the background / environment / post options with an
 * entry per scene light (via the shared `LightOptions` builders) exactly like
 * the original. As in the original, the `Grid` panel is attached as a property
 * on the options `Map` rather than a map entry, so it is not part of the
 * visible list — this is kept identical for behavioural parity.
 *
 * @param {object} ctx
 * @param {import('three').Scene}  ctx.scene
 * @param {object}                 ctx.view              SceneView instance.
 * @param {object}                 ctx.renderManager
 * @param {object}                 ctx.physics           OimoPhysics instance.
 * @param {object}                 ctx.physicsController
 * @param {object}                 ctx.ui                UI proxy (setPanelValue/invert).
 * @returns {object[]} Panel item descriptors.
 */
export function aboutHeaderPanelItems({ scene, view, renderManager, physics, physicsController, ui }) {
    const drawBuffers = renderManager.drawBuffers;

    const vector3 = new Vector3();
    const gravity = physics.getGravity();

    const sceneOptions = new Map([
        ['BG', 'BG'],
        ['Env', 'Env'],
        ['Post', 'Post']
    ]);

    scene.traverse(object => {
        if (object.isLight) {
            const key = getKeyByLight(LightOptions, object);

            sceneOptions.set(key, [object, LightOptions.get(key)[1]]);
        }
    });

    sceneOptions.Grid = gridPanelItems;

    return [
        {
            name: 'FPS'
        },
        {
            type: 'divider'
        },
        {
            type: 'list',
            list: DisplayOptions,
            value: getKeyByValue(DisplayOptions, renderManager.display),
            callback: value => {
                renderManager.display = DisplayOptions.get(value);
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'toggle',
            name: 'Animate',
            value: params.animate,
            callback: value => {
                params.animate = value;
                drawBuffers.saveState = params.animate;
            }
        },
        {
            type: 'toggle',
            name: 'Physics',
            value: physicsController.enabled,
            callback: value => {
                physicsController.enabled = value;

                // Reset
                vector3.set(0, 0, 0);

                physics.objects.forEach(object => {
                    const { position, quaternion } = object;

                    physics.setPosition(object, position);
                    physics.setOrientation(object, quaternion);
                    physics.setLinearVelocity(object, vector3);
                    physics.setAngularVelocity(object, vector3);
                });
            }
        },
        {
            type: 'slider',
            name: 'Gravity',
            min: -10,
            max: 10,
            step: 0.1,
            value: -gravity.y,
            callback: value => {
                gravity.y = -value;
                physics.setGravity(gravity);
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'list',
            list: sceneOptions,
            value: 'BG',
            callback: (value, item) => {
                switch (value) {
                    case 'BG':
                        item.setContent(subPanel(backgroundPanelItems(scene, ui)));
                        break;
                    case 'Env':
                        item.setContent(subPanel(environmentPanelItems(scene)));
                        break;
                    case 'Post':
                        item.setContent(subPanel(postPanelItems(renderManager)));
                        break;
                    case 'Grid':
                        item.setContent(subPanel(gridPanelItems(view.floor.gridHelper)));
                        break;
                    default: {
                        const [light, buildLightPanelItems] = sceneOptions.get(value);

                        item.setContent(subPanel(buildLightPanelItems(LightPanelController, light)));
                        break;
                    }
                }
            }
        }
    ];
}
