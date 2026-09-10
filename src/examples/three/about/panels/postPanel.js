/**
 * Post-processing sub-panel. Port of `PostPanel` from the About app, driving
 * the ported `RenderManager` instance directly.
 */

import { getKeyByValue } from '@lib/three.js';
import { subPanel } from '@/space/three/index.js';

export function postPanelItems(renderManager) {
    const { drawBuffers, luminosityMaterial, bloomCompositeMaterial, compositeMaterial } = renderManager;

    const postOptions = new Map([
        ['Off', false],
        ['On', true]
    ]);

    const toneMappingItems = [
        {
            type: 'slider',
            name: 'Exp',
            min: 0,
            max: 2,
            step: 0.01,
            value: compositeMaterial.uniforms.uExposure.value,
            callback: value => {
                compositeMaterial.uniforms.uExposure.value = value;
            }
        }
    ];

    const postItems = [
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'Interp',
            min: 0,
            max: 1,
            step: 0.01,
            value: drawBuffers.interpolateGeometry,
            callback: value => {
                drawBuffers.interpolateGeometry = value;
            }
        },
        {
            type: 'slider',
            name: 'Smear',
            min: 0,
            max: 4,
            step: 0.02,
            value: drawBuffers.smearIntensity,
            callback: value => {
                drawBuffers.smearIntensity = value;
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'Thresh',
            min: 0,
            max: 1,
            step: 0.01,
            value: luminosityMaterial.uniforms.uThreshold.value,
            callback: value => {
                luminosityMaterial.uniforms.uThreshold.value = value;
            }
        },
        {
            type: 'slider',
            name: 'Smooth',
            min: 0,
            max: 1,
            step: 0.01,
            value: luminosityMaterial.uniforms.uSmoothing.value,
            callback: value => {
                luminosityMaterial.uniforms.uSmoothing.value = value;
            }
        },
        {
            type: 'slider',
            name: 'Strength',
            min: 0,
            max: 2,
            step: 0.01,
            value: renderManager.bloomStrength,
            callback: value => {
                renderManager.bloomStrength = value;
                bloomCompositeMaterial.uniforms.uBloomFactors.value = renderManager.getBloomFactors();
            }
        },
        {
            type: 'slider',
            name: 'Radius',
            min: 0,
            max: 1,
            step: 0.01,
            value: renderManager.bloomRadius,
            callback: value => {
                renderManager.bloomRadius = value;
                bloomCompositeMaterial.uniforms.uBloomFactors.value = renderManager.getBloomFactors();
            }
        },
        {
            type: 'slider',
            name: 'Chroma',
            min: 0,
            max: 10,
            step: 0.1,
            value: compositeMaterial.uniforms.uRGBAmount.value,
            callback: value => {
                compositeMaterial.uniforms.uRGBAmount.value = value;
            }
        },
        {
            type: 'toggle',
            name: 'Tone',
            value: compositeMaterial.uniforms.uToneMapping.value,
            callback: (value, item) => {
                if (!item.hasContent()) {
                    item.setContent(subPanel(toneMappingItems));
                }

                compositeMaterial.uniforms.uToneMapping.value = value;

                if (value) {
                    item.toggleContent(true);
                } else {
                    item.toggleContent(false);
                }
            }
        },
        {
            type: 'toggle',
            name: 'Gamma',
            value: compositeMaterial.uniforms.uGamma.value,
            callback: value => {
                compositeMaterial.uniforms.uGamma.value = value;
            }
        }
    ];

    return [
        {
            type: 'divider'
        },
        {
            type: 'list',
            name: 'Post',
            list: postOptions,
            value: getKeyByValue(postOptions, renderManager.enabled),
            callback: (value, item) => {
                if (!item.hasContent()) {
                    item.setContent(subPanel(postItems));
                }

                renderManager.enabled = postOptions.get(value);

                if (renderManager.enabled) {
                    item.toggleContent(true);
                } else {
                    item.toggleContent(false);
                }
            }
        }
    ];
}
