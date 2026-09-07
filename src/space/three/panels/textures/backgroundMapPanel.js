/**
 * @author Space.js React
 *
 * Background map panel for scene background texture controls.
 *
 * Ported from the reference `BackgroundMapPanel` class. Unlike most texture
 * panels this one operates on the scene (not a mesh material) and manages its
 * own `supported` / `initialized` state via closure variables.
 */

import { MathUtils, SRGBColorSpace, Texture } from 'three';

import { TwoPI, getKeyByValue } from '@lib/utils/Utils.js';

import { BackgroundMappingOptions, ColorSpaceOptions, WrapOptions } from '../options.js';
import { subPanel } from '../subPanel.js';

/**
 * @param {import('three').Scene} scene
 * @returns {object[]} Panel item descriptors.
 */
export function backgroundMapPanelItems(scene) {
    const lastValue = scene.background;
    let supported = false;
    let initialized = false;

    function setSupported(texture) {
        supported = !!(texture && texture.isTexture && !texture.isRenderTargetTexture && !texture.isCubeTexture);
    }

    setSupported(scene.background);

    return [
        {
            type: 'divider'
        },
        {
            type: 'thumbnail',
            name: 'Map',
            data: supported ? scene.background : {},
            value: supported ? scene.background.userData.thumbnail : null,
            callback: (value, item) => {
                const mapItems = [];

                if (initialized) {
                    if (value) {
                        if (supported) {
                            scene.background.dispose();
                            scene.background = new Texture(value);
                            scene.background.mapping = item.data.mapping;
                            scene.background.colorSpace = item.data.colorSpace;
                            scene.background.anisotropy = item.data.anisotropy;
                            scene.background.wrapS = item.data.wrapS;
                            scene.background.wrapT = item.data.wrapT;
                            scene.background.repeat.copy(item.data.repeat);
                        } else {
                            scene.background = new Texture(value);
                            scene.background.colorSpace = SRGBColorSpace;
                        }

                        scene.background.userData.thumbnail = scene.background.source.data;
                        scene.background.needsUpdate = true;
                    } else if (supported) {
                        scene.background.dispose();
                        scene.background = lastValue;
                    }

                    setSupported(scene.background);

                    item.setData(supported ? scene.background : {});
                }

                if (supported) {
                    mapItems.push(
                        {
                            type: 'spacer'
                        },
                        {
                            type: 'list',
                            name: 'Mapping',
                            list: BackgroundMappingOptions,
                            value: getKeyByValue(BackgroundMappingOptions, scene.background.mapping),
                            callback: (value, item) => {
                                scene.background.mapping = BackgroundMappingOptions.get(value);
                                scene.background.needsUpdate = true;

                                switch (value) {
                                    case 'UV': {
                                        const mappingItems = [
                                            {
                                                type: 'divider'
                                            },
                                            {
                                                type: 'list',
                                                name: 'Color Space',
                                                list: ColorSpaceOptions,
                                                value: getKeyByValue(ColorSpaceOptions, scene.background.colorSpace),
                                                callback: value => {
                                                    if (initialized) {
                                                        scene.background.colorSpace = ColorSpaceOptions.get(value);
                                                        scene.background.needsUpdate = true;
                                                    }
                                                }
                                            },
                                            {
                                                type: 'slider',
                                                name: 'Anisotropy',
                                                min: 1,
                                                max: 16,
                                                step: 1,
                                                value: scene.background.anisotropy,
                                                callback: value => {
                                                    if (initialized) {
                                                        scene.background.anisotropy = value;
                                                        scene.background.needsUpdate = true;
                                                    }
                                                }
                                            },
                                            {
                                                type: 'list',
                                                name: 'Wrap',
                                                list: WrapOptions,
                                                value: getKeyByValue(WrapOptions, scene.background.wrapS),
                                                callback: value => {
                                                    if (initialized) {
                                                        const wrapping = WrapOptions.get(value);

                                                        scene.background.wrapS = wrapping;
                                                        scene.background.wrapT = wrapping;
                                                        scene.background.needsUpdate = true;
                                                    }
                                                }
                                            },
                                            {
                                                type: 'slider',
                                                name: 'U',
                                                min: 1,
                                                max: 16,
                                                step: 1,
                                                value: scene.background.repeat.x,
                                                callback: value => {
                                                    if (initialized) {
                                                        scene.background.repeat.setX(value);
                                                    }
                                                }
                                            },
                                            {
                                                type: 'slider',
                                                name: 'V',
                                                min: 1,
                                                max: 16,
                                                step: 1,
                                                value: scene.background.repeat.y,
                                                callback: value => {
                                                    if (initialized) {
                                                        scene.background.repeat.setY(value);
                                                    }
                                                }
                                            },
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
                                                    if (initialized) {
                                                        scene.backgroundIntensity = value;
                                                    }
                                                }
                                            }
                                        ];

                                        item.setContent(subPanel(mappingItems));
                                        break;
                                    }
                                    default: {
                                        const mappingItems = [
                                            {
                                                type: 'divider'
                                            },
                                            {
                                                type: 'slider',
                                                name: 'Blur',
                                                min: 0,
                                                max: 1,
                                                step: 0.01,
                                                value: scene.backgroundBlurriness,
                                                callback: value => {
                                                    if (initialized) {
                                                        scene.backgroundBlurriness = value;
                                                    }
                                                }
                                            },
                                            {
                                                type: 'slider',
                                                name: 'Int',
                                                min: 0,
                                                max: 10,
                                                step: 0.1,
                                                value: scene.backgroundIntensity,
                                                callback: value => {
                                                    if (initialized) {
                                                        scene.backgroundIntensity = value;
                                                    }
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
                                                    if (initialized) {
                                                        scene.backgroundRotation.x = MathUtils.degToRad(value);
                                                    }
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
                                                    if (initialized) {
                                                        scene.backgroundRotation.y = MathUtils.degToRad(value);
                                                    }
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
                                                    if (initialized) {
                                                        scene.backgroundRotation.z = MathUtils.degToRad(value);
                                                    }
                                                }
                                            }
                                        ];

                                        item.setContent(subPanel(mappingItems));
                                        break;
                                    }
                                }
                            }
                        }
                    );
                }

                item.setContent(subPanel(mapItems));

                if (!initialized) {
                    initialized = true;
                }
            }
        }
    ];
}
