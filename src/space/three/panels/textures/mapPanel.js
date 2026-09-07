/**
 * @author Space.js React
 *
 * Base texture-map panel builder shared by all per-material texture panels.
 *
 * Ported from the reference `MapPanel` class. The class kept mutable state
 * (`supported`, `initialized`, etc.) across its lifetime; the ported function
 * captures the same state in a closure so each invocation is self-contained.
 *
 * Callers that need to append extra items (e.g. a "Scale" slider) pass them
 * via `extraItems(materials, material)`.
 */

import { NoColorSpace, Texture, UVMapping } from 'three';

import { getKeyByValue } from '@lib/utils/Utils.js';

import { ColorSpaceOptions, RefractionMappingOptions, WrapOptions } from '../options.js';
import { subPanel } from '../subPanel.js';
import { getBallThumbnail, getThumbnail } from './mapPanelUtils.js';

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @param {string}               key        Material texture key (e.g. 'map', 'aoMap').
 * @param {number}               [mapping]  Three.js mapping constant.
 * @param {string}               [colorSpace] Three.js color-space constant.
 * @param {function}             [extraItems] `(materials, material) => descriptor[]`
 * @returns {object[]} Panel item descriptors.
 */
export function mapPanelItems(mesh, ui, key, mapping = UVMapping, colorSpace = NoColorSpace, extraItems) {
    let materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    let material = materials[0];

    let supported = false;
    let initialized = false;
    let textures;
    let thumbnails;
    let options;

    function update(index) {
        materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        material = materials[index];

        textures = materials.map(m => m[key]);
        thumbnails = textures.map(texture => texture && texture.userData.thumbnail);

        const texture = textures[index];

        supported = !!(texture && texture.isTexture && !texture.isRenderTargetTexture && !texture.isCubeTexture);
        initialized = false;
    }

    function updateOptions() {
        options = new Map(materials.map((m, i) => [m.name || (i + 1).toString(), i]));
    }

    function buildThumbnailItems(index, parent) {
        update(index);

        let point;

        if (ui.constructor.points) {
            point = ui.constructor.getPoint(mesh);
        }

        const items = [
            {
                type: 'divider'
            },
            {
                type: 'thumbnail',
                name: 'Map',
                data: supported ? textures[index] : {},
                value: supported ? thumbnails[index] : null,
                callback: (value, item) => {
                    const data = item.data;

                    const mapItems = [];

                    if (initialized) {
                        if (data.isTexture && data.userData.uv && !mesh.userData.uv) {
                            mesh.userData.uv = true;

                            if (point) {
                                point.toggleUVHelper(true);
                            }
                        }

                        if (point && point.uvTexture) {
                            if (value) {
                                if (material[key] && data.isTexture && !data.userData.uv) {
                                    mesh.userData.uv = false;
                                    point.toggleUVHelper(false);
                                }
                            } else if (material[key]) {
                                mesh.userData.uv = false;
                                point.toggleUVHelper(false);

                                if (material[key] && material[key].userData.thumbnail) {
                                    item.setData(material[key]);
                                    item.setValue(material[key].userData.thumbnail);
                                    return;
                                }
                            }
                        } else if (value) {
                            if (supported) {
                                material[key].dispose();
                                material[key] = value instanceof Texture ? value : new Texture(value);
                                material[key].mapping = data.mapping;
                                material[key].colorSpace = value instanceof Texture ? value.colorSpace : colorSpace;
                                material[key].anisotropy = data.anisotropy;
                                material[key].wrapS = data.wrapS;
                                material[key].wrapT = data.wrapT;
                                material[key].repeat.copy(data.repeat);
                            } else {
                                material[key] = value instanceof Texture ? value : new Texture(value);
                                material[key].mapping = mapping;
                                material[key].colorSpace = value instanceof Texture ? value.colorSpace : colorSpace;
                            }

                            if (key === 'envMap') {
                                material[key].userData.thumbnail = getBallThumbnail(material[key]);
                            } else if (material[key].source.data instanceof Image) {
                                material[key].userData.thumbnail = material[key].source.data;
                            } else {
                                material[key].userData.thumbnail = getThumbnail(material[key]);
                            }

                            material[key].needsUpdate = true;
                            material.needsUpdate = true;
                        } else if (supported) {
                            material[key].dispose();
                            material[key] = null;
                            material.needsUpdate = true;
                        }

                        update(index);

                        if (parent) {
                            updateOptions();

                            parent.setList(options);
                        }

                        item.setData(supported ? material[key] : {});
                        item.setValue(supported ? material[key].userData.thumbnail : null);
                    }

                    if (supported && !(key === 'envMap' && material.isMeshStandardMaterial)) {
                        if (material[key].mapping !== UVMapping) {
                            mapItems.push(
                                {
                                    type: 'spacer'
                                },
                                {
                                    type: 'list',
                                    name: 'Mapping',
                                    list: RefractionMappingOptions,
                                    value: getKeyByValue(RefractionMappingOptions, material[key].mapping),
                                    callback: value => {
                                        if (initialized) {
                                            material[key].mapping = RefractionMappingOptions.get(value);
                                            material[key].needsUpdate = true;
                                            material.needsUpdate = true;
                                        }
                                    }
                                }
                            );
                        } else {
                            mapItems.push(
                                {
                                    type: 'spacer'
                                },
                                {
                                    type: 'list',
                                    name: 'Color Space',
                                    list: ColorSpaceOptions,
                                    value: getKeyByValue(ColorSpaceOptions, material[key].colorSpace),
                                    callback: value => {
                                        if (initialized) {
                                            material[key].colorSpace = ColorSpaceOptions.get(value);
                                            material[key].needsUpdate = true;
                                        }
                                    }
                                },
                                {
                                    type: 'slider',
                                    name: 'Anisotropy',
                                    min: 1,
                                    max: 16,
                                    step: 1,
                                    value: material[key].anisotropy,
                                    callback: value => {
                                        if (initialized) {
                                            material[key].anisotropy = value;
                                            material[key].needsUpdate = true;
                                        }
                                    }
                                },
                                {
                                    type: 'list',
                                    name: 'Wrap',
                                    list: WrapOptions,
                                    value: getKeyByValue(WrapOptions, material[key].wrapS),
                                    callback: value => {
                                        if (initialized) {
                                            const wrapping = WrapOptions.get(value);

                                            material[key].wrapS = wrapping;
                                            material[key].wrapT = wrapping;
                                            material[key].needsUpdate = true;
                                        }
                                    }
                                },
                                {
                                    type: 'slider',
                                    name: 'U',
                                    min: 1,
                                    max: 16,
                                    step: 1,
                                    value: material[key].repeat.x,
                                    callback: value => {
                                        if (initialized) {
                                            material[key].repeat.setX(value);
                                        }
                                    }
                                },
                                {
                                    type: 'slider',
                                    name: 'V',
                                    min: 1,
                                    max: 16,
                                    step: 1,
                                    value: material[key].repeat.y,
                                    callback: value => {
                                        if (initialized) {
                                            material[key].repeat.setY(value);
                                        }
                                    }
                                }
                            );
                        }
                    }

                    item.setContent(subPanel(mapItems));

                    if (!initialized) {
                        initialized = true;
                    }
                }
            }
        ];

        if (extraItems) {
            items.push(...extraItems(materials, material));
        }

        return items;
    }

    if (Array.isArray(mesh.material)) {
        updateOptions();

        return [
            {
                type: 'divider'
            },
            {
                type: 'list',
                name: 'Index',
                list: options,
                value: getKeyByValue(options, 0),
                callback: (value, item) => {
                    const index = options.get(value);

                    item.setContent(subPanel(buildThumbnailItems(index, item)));
                }
            }
        ];
    }

    return buildThumbnailItems(0);
}
