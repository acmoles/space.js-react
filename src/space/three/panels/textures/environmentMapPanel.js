/**
 * @author Space.js React
 *
 * Environment map panel for scene-level environment texture controls.
 *
 * Ported from the reference `EnvironmentMapPanel` class. Unlike per-material
 * texture panels this operates on the scene and manages its own closure state.
 */

import { EquirectangularReflectionMapping, MathUtils, SRGBColorSpace, Texture } from 'three';

import { TwoPI } from '@lib/utils/Utils.js';

import { subPanel } from '../subPanel.js';

/**
 * @param {import('three').Scene} scene
 * @returns {object[]} Panel item descriptors.
 */
export function environmentMapPanelItems(scene) {
    const lastValue = scene.environment;
    let supported = false;
    let initialized = false;

    function setSupported(texture) {
        supported = !!(texture && texture.isTexture && !texture.isRenderTargetTexture && !texture.isCubeTexture);
    }

    setSupported(scene.environment);

    return [
        {
            type: 'divider'
        },
        {
            type: 'thumbnail',
            name: 'Map',
            data: supported ? scene.environment : {},
            value: supported ? scene.environment.userData.thumbnail : null,
            callback: (value, item) => {
                const mapItems = [];

                if (initialized) {
                    if (value) {
                        if (supported) {
                            scene.environment.dispose();
                            scene.environment = new Texture(value);
                            scene.environment.mapping = item.data.mapping;
                            scene.environment.colorSpace = item.data.colorSpace;
                        } else {
                            scene.environment = new Texture(value);
                            scene.environment.mapping = EquirectangularReflectionMapping;
                            scene.environment.colorSpace = SRGBColorSpace;
                        }

                        scene.environment.userData.thumbnail = scene.environment.source.data;
                        scene.environment.needsUpdate = true;
                    } else if (supported) {
                        scene.environment.dispose();
                        scene.environment = lastValue;
                    }

                    setSupported(scene.environment);

                    item.setData(supported ? scene.environment : {});
                }

                if (supported) {
                    mapItems.push(
                        {
                            type: 'divider'
                        },
                        {
                            type: 'slider',
                            name: 'Int',
                            min: 0,
                            max: 10,
                            step: 0.1,
                            value: scene.environmentIntensity,
                            callback: value => {
                                if (initialized) {
                                    scene.environmentIntensity = value;
                                }
                            }
                        },
                        {
                            type: 'slider',
                            name: 'Rotate X',
                            min: 0,
                            max: 360,
                            step: 1,
                            value: MathUtils.radToDeg(scene.environmentRotation.x + (scene.environmentRotation.x < 0 ? TwoPI : 0)),
                            callback: value => {
                                if (initialized) {
                                    scene.environmentRotation.x = MathUtils.degToRad(value);
                                }
                            }
                        },
                        {
                            type: 'slider',
                            name: 'Rotate Y',
                            min: 0,
                            max: 360,
                            step: 1,
                            value: MathUtils.radToDeg(scene.environmentRotation.y + (scene.environmentRotation.y < 0 ? TwoPI : 0)),
                            callback: value => {
                                if (initialized) {
                                    scene.environmentRotation.y = MathUtils.degToRad(value);
                                }
                            }
                        },
                        {
                            type: 'slider',
                            name: 'Rotate Z',
                            min: 0,
                            max: 360,
                            step: 1,
                            value: MathUtils.radToDeg(scene.environmentRotation.z + (scene.environmentRotation.z < 0 ? TwoPI : 0)),
                            callback: value => {
                                if (initialized) {
                                    scene.environmentRotation.z = MathUtils.degToRad(value);
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
