import { createRef } from 'react';

import { colors } from '../config.js';

/**
 * Sunlight (volumetric light + lensflare) panel item descriptors.
 *
 * Ported from `examples/mars/src/controllers/panels/SunlightPanel.js`.
 *
 * @param {object} ctrl Shared controller bag.
 * @returns {{ items: object[], ref: import('react').RefObject }}
 */
export function sunlightPanel(ctrl) {
    const ref = createRef();

    const { view, renderManager } = ctrl;
    const { vlMaterial } = renderManager;
    const { sun } = view;

    const setPanelValue = (name, value) => ref.current?.setPanelValue(name, value);

    const items = [
        {
            type: 'divider'
        },
        {
            type: 'color',
            name: 'Color',
            value: sun.occMesh.material.color,
            callback: value => {
                sun.occMesh.material.color.copy(value);
                vlMaterial.uniforms.uLightColor.value.copy(value);
            }
        },
        {
            type: 'slider',
            name: 'Power',
            min: 0,
            max: 6,
            step: 0.01,
            value: vlMaterial.uniforms.uPower.value,
            callback: value => {
                vlMaterial.uniforms.uPower.value = value;
            }
        },
        {
            type: 'slider',
            name: 'Amount',
            min: 0,
            max: 1,
            step: 0.01,
            value: vlMaterial.uniforms.uAmount.value,
            callback: value => {
                vlMaterial.uniforms.uAmount.value = value;
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'Scale X',
            min: -2,
            max: 2,
            step: 0.01,
            value: vlMaterial.uniforms.uScale.value.x,
            callback: value => {
                vlMaterial.uniforms.uScale.value.x = value;
            }
        },
        {
            type: 'slider',
            name: 'Scale Y',
            min: -2,
            max: 2,
            step: 0.01,
            value: vlMaterial.uniforms.uScale.value.y,
            callback: value => {
                vlMaterial.uniforms.uScale.value.y = value;
            }
        },
        {
            type: 'slider',
            name: 'Swizzle',
            min: -2,
            max: 2,
            step: 0.01,
            value: vlMaterial.uniforms.uSwizzle.value,
            callback: value => {
                vlMaterial.uniforms.uSwizzle.value = value;
            }
        },
        {
            type: 'slider',
            name: 'Exp',
            min: 0,
            max: 1,
            step: 0.01,
            value: vlMaterial.uniforms.uExposure.value,
            callback: value => {
                vlMaterial.uniforms.uExposure.value = value;
            }
        },
        {
            type: 'slider',
            name: 'Decay',
            min: 0.6,
            max: 1,
            step: 0.01,
            value: vlMaterial.uniforms.uDecay.value,
            callback: value => {
                vlMaterial.uniforms.uDecay.value = value;
            }
        },
        {
            type: 'slider',
            name: 'Density',
            min: 0,
            max: 1,
            step: 0.01,
            value: vlMaterial.uniforms.uDensity.value,
            callback: value => {
                vlMaterial.uniforms.uDensity.value = value;
            }
        },
        {
            type: 'slider',
            name: 'Weight',
            min: 0,
            max: 1,
            step: 0.01,
            value: vlMaterial.uniforms.uWeight.value,
            callback: value => {
                vlMaterial.uniforms.uWeight.value = value;
            }
        },
        {
            type: 'slider',
            name: 'Clamp',
            min: 0,
            max: 1,
            step: 0.01,
            value: vlMaterial.uniforms.uClamp.value,
            callback: value => {
                vlMaterial.uniforms.uClamp.value = value;
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'F Scale X',
            min: 0,
            max: 4,
            step: 0.02,
            value: vlMaterial.uniforms.uLensflareScale.value.x,
            callback: value => {
                vlMaterial.uniforms.uLensflareScale.value.x = value;
            }
        },
        {
            type: 'slider',
            name: 'F Scale Y',
            min: 0,
            max: 4,
            step: 0.02,
            value: vlMaterial.uniforms.uLensflareScale.value.y,
            callback: value => {
                vlMaterial.uniforms.uLensflareScale.value.y = value;
            }
        },
        {
            type: 'slider',
            name: 'F Exp',
            min: 0,
            max: 1,
            step: 0.01,
            value: vlMaterial.uniforms.uLensflareExposure.value,
            callback: value => {
                vlMaterial.uniforms.uLensflareExposure.value = value;
            }
        },
        {
            type: 'slider',
            name: 'F Clamp',
            min: 0,
            max: 1,
            step: 0.01,
            value: vlMaterial.uniforms.uLensflareClamp.value,
            callback: value => {
                vlMaterial.uniforms.uLensflareClamp.value = value;
            }
        },
        {
            type: 'spacer'
        },
        {
            type: 'link',
            value: 'Reset',
            callback: () => {
                setPanelValue('Color', colors.lightColor);
                setPanelValue('Power', renderManager.glowPower);
                setPanelValue('Amount', renderManager.glowAmount);
                setPanelValue('Scale X', renderManager.vlScale.x);
                setPanelValue('Scale Y', renderManager.vlScale.y);
                setPanelValue('Swizzle', renderManager.vlSwizzle);
                setPanelValue('Exp', renderManager.vlExposure);
                setPanelValue('Decay', renderManager.vlDecay);
                setPanelValue('Density', renderManager.vlDensity);
                setPanelValue('Weight', renderManager.vlWeight);
                setPanelValue('Clamp', renderManager.vlClamp);
                setPanelValue('F Scale X', renderManager.lensflareScale.x);
                setPanelValue('F Scale Y', renderManager.lensflareScale.y);
                setPanelValue('F Exp', renderManager.lensflareExposure);
                setPanelValue('F Clamp', renderManager.lensflareClamp);
            }
        }
    ];

    return { items, ref };
}
