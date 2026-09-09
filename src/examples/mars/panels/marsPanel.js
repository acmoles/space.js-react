import { createRef } from 'react';

import { isDebug, params } from '../config.js';

/**
 * Mars scene panel item descriptors.
 *
 * Ported from `examples/mars/src/controllers/panels/MarsPanel.js`. Returns the
 * item array plus a React `ref` for the nested `<Panel>`, so `Reset` and the
 * app's `setView` can drive `setPanelValue` on this exact sub-panel (the React
 * `Panel.setPanelValue` does not recurse into nested panels).
 *
 * @param {object} ctrl Shared controller bag (scene, lights, view, world,
 *   renderManager).
 * @returns {{ items: object[], ref: import('react').RefObject }}
 */
export function marsPanel(ctrl) {
    const ref = createRef();

    const { scene, lights, view, world, renderManager } = ctrl;
    const { vlMaterial } = renderManager;
    const { mars } = view;

    const setPanelValue = (name, value) => ref.current?.setPanelValue(name, value);

    const items = [
        {
            type: 'divider'
        },
        {
            type: 'toggle',
            name: 'Red Tint',
            value: params.redTint,
            callback: value => {
                params.redTint = value;

                if (value) {
                    setPanelValue('Hue', -2);
                    setPanelValue('Saturate', -6);
                    setPanelValue('Light', -3);
                    setPanelValue('Bright', 5);
                    setPanelValue('Contrast', 10);
                } else {
                    setPanelValue('Hue', -1);
                    setPanelValue('Saturate', -10);
                    setPanelValue('Light', -3);
                    setPanelValue('Bright', 6);
                    setPanelValue('Contrast', 10);
                }
            }
        },
        {
            type: 'toggle',
            name: 'Sun Glow',
            value: params.sunGlow,
            callback: value => {
                params.sunGlow = value;

                if (value) {
                    vlMaterial.uniforms.uPower.value = 0.8;
                    vlMaterial.uniforms.uAmount.value = 0.4;
                } else {
                    vlMaterial.uniforms.uPower.value = renderManager.glowPower;
                    vlMaterial.uniforms.uAmount.value = renderManager.glowAmount;
                }
            }
        },
        {
            type: 'toggle',
            name: 'Lights',
            value: params.lights,
            callback: value => {
                params.lights = value;

                if (value) {
                    lights[0].intensity = 2.5;
                    lights[1].intensity = 2;
                } else {
                    lights[0].intensity = 0;
                    lights[1].intensity = 3;
                }
            }
        },
        {
            type: 'toggle',
            name: 'Stars',
            value: params.stars,
            callback: value => {
                params.stars = value;

                if (value) {
                    scene.backgroundIntensity = world.backgroundIntensity;
                } else {
                    scene.backgroundIntensity = 0;
                }
            }
        },
        {
            type: 'toggle',
            name: 'Animate',
            value: params.animate,
            callback: value => {
                params.animate = value;
            }
        },
        {
            type: 'slider',
            name: 'Speed',
            min: 0,
            max: 1,
            step: 0.01,
            value: params.speed,
            callback: value => {
                params.speed = value;
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'Hue',
            min: -180,
            max: 180,
            step: 1,
            value: mars.hue.value * 360,
            callback: value => {
                mars.hue.value = value / 360;
            }
        },
        {
            type: 'slider',
            name: 'Saturate',
            min: -100,
            max: 100,
            step: 1,
            value: mars.saturation.value * 100,
            callback: value => {
                mars.saturation.value = value / 100;
            }
        },
        {
            type: 'slider',
            name: 'Light',
            min: -100,
            max: 100,
            step: 1,
            value: mars.lightness.value * 100,
            callback: value => {
                mars.lightness.value = value / 100;
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'Bright',
            min: -100,
            max: 100,
            step: 1,
            value: mars.brightness.value * 100,
            callback: value => {
                mars.brightness.value = value / 100;
            }
        },
        {
            type: 'slider',
            name: 'Contrast',
            min: -100,
            max: 100,
            step: 1,
            value: mars.contrast.value * 100,
            callback: value => {
                mars.contrast.value = value / 100;
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'Normal X',
            min: -10,
            max: 10,
            step: 0.1,
            value: mars.mesh.material[0].normalScale.x,
            callback: value => {
                mars.mesh.material.forEach(material => material.normalScale.x = value);
            }
        },
        {
            type: 'slider',
            name: 'Normal Y',
            min: -10,
            max: 10,
            step: 0.1,
            value: mars.mesh.material[0].normalScale.y,
            callback: value => {
                mars.mesh.material.forEach(material => material.normalScale.y = value);
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'Light X',
            min: -10,
            max: 10,
            step: 0.1,
            value: lights[1].position.x,
            callback: value => {
                lights[1].position.x = value;
            }
        },
        {
            type: 'slider',
            name: 'Light Y',
            min: -10,
            max: 10,
            step: 0.1,
            value: lights[1].position.y,
            callback: value => {
                lights[1].position.y = value;
            }
        },
        {
            type: 'slider',
            name: 'Light Z',
            min: -10,
            max: 10,
            step: 0.1,
            value: lights[1].position.z,
            callback: value => {
                lights[1].position.z = value;
            }
        },
        {
            type: 'spacer'
        },
        {
            type: 'link',
            value: 'Reset',
            callback: () => {
                setPanelValue('Red Tint', false);
                setPanelValue('Sun Glow', false);
                setPanelValue('Lights', false);
                setPanelValue('Stars', true);
                setPanelValue('Animate', !isDebug);
                setPanelValue('Speed', 0.2);
                setPanelValue('Normal X', 2);
                setPanelValue('Normal Y', -2);

                if (world.camera === world.obliqueCamera) {
                    setPanelValue('Light X', -3);
                    setPanelValue('Light Y', 1.5);
                    setPanelValue('Light Z', 3);
                } else if (world.camera === world.northPolarCamera) {
                    setPanelValue('Light X', -1.5);
                    setPanelValue('Light Y', 3);
                    setPanelValue('Light Z', -1.5);
                } else if (world.camera === world.southPolarCamera) {
                    setPanelValue('Light X', 1.5);
                    setPanelValue('Light Y', -3);
                    setPanelValue('Light Z', -1.5);
                } else if (world.camera === world.point1Camera) {
                    setPanelValue('Light X', -3);
                    setPanelValue('Light Y', 1.5);
                    setPanelValue('Light Z', 3);
                } else if (world.camera === world.point2Camera) {
                    setPanelValue('Light X', -3);
                    setPanelValue('Light Y', 1.5);
                    setPanelValue('Light Z', 3);
                } else if (world.camera === world.point3Camera) {
                    setPanelValue('Light X', -3);
                    setPanelValue('Light Y', 1.5);
                    setPanelValue('Light Z', -1.5);
                }
            }
        }
    ];

    return { items, ref };
}
