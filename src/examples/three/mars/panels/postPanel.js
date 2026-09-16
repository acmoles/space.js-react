import { createElement, createRef } from 'react';
import { getKeyByValue } from '@lib/three.js';

import { Panel } from '@/space/components/panels/Panel.jsx';

/**
 * Post-processing panel item descriptors.
 *
 * Ported from `examples/mars/src/controllers/panels/PostPanel.js`. This panel is
 * doubly nested: the outer panel has a `Post` list whose content is the post
 * sub-panel, and inside that a `Tone` toggle whose content is the tone-mapping
 * sub-panel. Each nested sub-panel gets its own React `ref` so `Reset` (which
 * lives on the outer panel) can drive `setPanelValue` on the correct level —
 * the React `Panel.setPanelValue` does not recurse into nested panels.
 *
 * @param {object} ctrl Shared controller bag.
 * @returns {{ items: object[], ref: import('react').RefObject }}
 */
export function postPanel(ctrl) {
    const ref = createRef();
    const postRef = createRef();
    const toneRef = createRef();

    const { renderManager } = ctrl;

    const {
        hBloomMaterial,
        vBloomMaterial,
        sceneCompositeMaterial,
        luminosityMaterial,
        bloomCompositeMaterial,
        compositeMaterial
    } = renderManager;

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
            name: 'Bloom',
            min: 0,
            max: 10,
            step: 0.1,
            value: hBloomMaterial.uniforms.uBlurAmount.value,
            callback: value => {
                hBloomMaterial.uniforms.uBlurAmount.value = value;
                vBloomMaterial.uniforms.uBlurAmount.value = value;
            }
        },
        {
            type: 'slider',
            name: 'Reduce',
            min: 0,
            max: 1,
            step: 0.01,
            value: sceneCompositeMaterial.uniforms.uBloomReduction.value,
            callback: value => {
                sceneCompositeMaterial.uniforms.uBloomReduction.value = value;
            }
        },
        {
            type: 'slider',
            name: 'Boost',
            min: 0,
            max: 10,
            step: 0.1,
            value: sceneCompositeMaterial.uniforms.uBloomBoost.value,
            callback: value => {
                sceneCompositeMaterial.uniforms.uBloomBoost.value = value;
            }
        },
        {
            type: 'slider',
            name: 'Clamp',
            min: 0,
            max: 1,
            step: 0.01,
            value: sceneCompositeMaterial.uniforms.uBloomClamp.value,
            callback: value => {
                sceneCompositeMaterial.uniforms.uBloomClamp.value = value;
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
            type: 'divider'
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
            type: 'slider',
            name: 'V Reduce',
            min: 0,
            max: 2,
            step: 0.01,
            value: compositeMaterial.uniforms.uReduction.value,
            callback: value => {
                compositeMaterial.uniforms.uReduction.value = value;
            }
        },
        {
            type: 'slider',
            name: 'V Boost',
            min: 0,
            max: 2,
            step: 0.01,
            value: compositeMaterial.uniforms.uBoost.value,
            callback: value => {
                compositeMaterial.uniforms.uBoost.value = value;
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'toggle',
            name: 'Tone',
            value: compositeMaterial.uniforms.uToneMapping.value,
            callback: (value, item) => {
                if (!item.hasContent()) {
                    item.setContent(createElement(Panel, {
                        items: toneMappingItems,
                        ref: toneRef,
                        autoAnimateIn: true
                    }));
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
        },
        {
            type: 'toggle',
            name: 'SMAA',
            value: renderManager.smaa,
            callback: value => {
                renderManager.smaa = value;
            }
        }
    ];

    const items = [
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
                    item.setContent(createElement(Panel, {
                        items: postItems,
                        ref: postRef,
                        autoAnimateIn: true
                    }));
                }

                renderManager.enabled = postOptions.get(value);

                if (renderManager.enabled) {
                    item.toggleContent(true);
                } else {
                    item.toggleContent(false);
                }
            }
        },
        {
            type: 'spacer'
        },
        {
            type: 'link',
            value: 'Reset',
            callback: () => {
                const setPost = (name, value) => postRef.current?.setPanelValue(name, value);

                setPost('Bloom', renderManager.bloomAmount);
                setPost('Reduce', renderManager.bloomReduction);
                setPost('Boost', renderManager.bloomBoost);
                setPost('Clamp', renderManager.bloomClamp);
                setPost('Thresh', renderManager.luminosityThreshold);
                setPost('Smooth', renderManager.luminositySmoothing);
                setPost('Strength', 0.3);
                setPost('Radius', 0.2);
                setPost('Chroma', renderManager.rgbAmount);
                setPost('V Reduce', renderManager.reduction);
                setPost('V Boost', renderManager.boost);
                setPost('Tone', renderManager.toneMapping);
                toneRef.current?.setPanelValue('Exp', renderManager.toneMappingExposure);
                setPost('Gamma', renderManager.gammaCorrection);
                setPost('SMAA', true);
            }
        }
    ];

    return { items, ref };
}
