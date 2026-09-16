import { createRef } from 'react';
import { MathUtils } from 'three';
import { TwoPI } from '@lib/three.js';

/**
 * Space (background) panel item descriptors.
 *
 * Ported from `examples/mars/src/controllers/panels/SpacePanel.js`.
 *
 * @param {object} ctrl Shared controller bag.
 * @returns {{ items: object[], ref: import('react').RefObject }}
 */
export function spacePanel(ctrl) {
    const ref = createRef();

    const { scene } = ctrl;

    const setPanelValue = (name, value) => ref.current?.setPanelValue(name, value);

    const items = [
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'Int',
            min: 0,
            max: 10,
            step: 0.1,
            value: scene.backgroundIntensity,
            callback: value => {
                scene.backgroundIntensity = value;
            }
        },
        {
            type: 'slider',
            name: 'Rotate X',
            min: 0,
            max: 360,
            step: 1,
            value: MathUtils.radToDeg(scene.backgroundRotation.x + (scene.backgroundRotation.x < 0 ? TwoPI : 0)),
            callback: value => {
                scene.backgroundRotation.x = MathUtils.degToRad(value);
            }
        },
        {
            type: 'slider',
            name: 'Rotate Y',
            min: 0,
            max: 360,
            step: 1,
            value: MathUtils.radToDeg(scene.backgroundRotation.y + (scene.backgroundRotation.y < 0 ? TwoPI : 0)),
            callback: value => {
                scene.backgroundRotation.y = MathUtils.degToRad(value);
            }
        },
        {
            type: 'slider',
            name: 'Rotate Z',
            min: 0,
            max: 360,
            step: 1,
            value: MathUtils.radToDeg(scene.backgroundRotation.z + (scene.backgroundRotation.z < 0 ? TwoPI : 0)),
            callback: value => {
                scene.backgroundRotation.z = MathUtils.degToRad(value);
            }
        },
        {
            type: 'spacer'
        },
        {
            type: 'link',
            value: 'Reset',
            callback: () => {
                setPanelValue('Int', 1.2);
                setPanelValue('Rotate X', 180);
                setPanelValue('Rotate Y', 0);
                setPanelValue('Rotate Z', 180);
            }
        }
    ];

    return { items, ref };
}
