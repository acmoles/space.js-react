/**
 * @author Space.js React
 *
 * Top-level material panel: a Visible list whose nested content exposes
 * opacity, side, and a Material list that swaps the mesh's material type.
 *
 * Ported from the reference `MaterialsPanel` class. The reference looked up
 * `MaterialPanel.properties` as a static class member when copying properties
 * across a material swap; the React port reads the same field off the ported
 * builder function, which carries it as a function property.
 */

import {
    MeshBasicMaterial,
    MeshLambertMaterial,
    MeshMatcapMaterial,
    MeshNormalMaterial,
    MeshPhongMaterial,
    MeshPhysicalMaterial,
    MeshStandardMaterial,
    MeshToonMaterial
} from 'three';

import { getKeyByValue } from '@lib/utils/Utils.js';

import { SideOptions, VisibleOptions } from '../options.js';
import { subPanel } from '../subPanel.js';

import { basicMaterialPanelItems } from './basicMaterialPanel.js';
import { lambertMaterialPanelItems } from './lambertMaterialPanel.js';
import { matcapMaterialPanelItems } from './matcapMaterialPanel.js';
import { normalMaterialPanelItems } from './normalMaterialPanel.js';
import { phongMaterialPanelItems } from './phongMaterialPanel.js';
import { physicalMaterialPanelItems } from './physicalMaterialPanel.js';
import { standardMaterialPanelItems } from './standardMaterialPanel.js';
import { toonMaterialPanelItems } from './toonMaterialPanel.js';

// https://threejs.org/docs/scenes/material-browser.html
export const MaterialOptions = new Map([
    ['Basic', [MeshBasicMaterial, basicMaterialPanelItems]],
    ['Lambert', [MeshLambertMaterial, lambertMaterialPanelItems]],
    ['Matcap', [MeshMatcapMaterial, matcapMaterialPanelItems]],
    ['Phong', [MeshPhongMaterial, phongMaterialPanelItems]],
    ['Toon', [MeshToonMaterial, toonMaterialPanelItems]],
    ['Standard', [MeshStandardMaterial, standardMaterialPanelItems]],
    ['Physical', [MeshPhysicalMaterial, physicalMaterialPanelItems]],
    ['Normal', [MeshNormalMaterial, normalMaterialPanelItems]]
]);

export function getKeyByMaterial(materialOptions, material) {
    for (const [key, value] of materialOptions.entries()) {
        if (material instanceof value[0]) {
            return key;
        }
    }
}

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @param {object}               [options]
 * @param {Map}                  [options.materialOptions]
 * @returns {object[]} Panel item descriptors.
 */
export function materialsPanelItems(mesh, ui, {
    materialOptions = MaterialOptions
} = {}) {
    // Mutable state that the reference library kept on the panel instance.
    const state = {
        materials: Array.isArray(mesh.material) ? mesh.material : [mesh.material],
        material: null,
        properties: [],
        lastPanel: null
    };

    state.material = state.materials[0];

    const materialItems = [
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'Opacity',
            min: 0,
            max: 1,
            step: 0.01,
            value: state.material.opacity,
            callback: value => {
                state.materials.forEach(material => {
                    if (!material.transparent) {
                        material.transparent = true;
                        material.needsUpdate = true;
                    }

                    material.opacity = value;
                });
            }
        },
        {
            type: 'list',
            name: 'Side',
            list: SideOptions,
            value: getKeyByValue(SideOptions, state.material.side),
            callback: value => {
                state.materials.forEach(material => {
                    material.side = SideOptions.get(value);
                    material.needsUpdate = true;
                });
            }
        },
        {
            type: 'list',
            name: 'Material',
            list: materialOptions,
            value: getKeyByMaterial(materialOptions, state.material),
            callback: (value, item) => {
                state.materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                state.material = state.materials[0];

                const [Material, materialPanelItems] = materialOptions.get(value);

                const currentPanel = state.lastPanel || materialPanelItems;

                const target = state.materials.map((material, i) => {
                    if (!state.properties[i]) {
                        state.properties[i] = {};
                    }

                    const properties = state.properties[i];

                    properties.transparent = material.transparent;
                    properties.opacity = material.opacity;
                    properties.side = material.side;

                    currentPanel.properties.forEach(key => {
                        if (key in material) {
                            const value = material[key];

                            if (value && (
                                value.isVector2 ||
                                value.isVector3 ||
                                value.isVector4 ||
                                value.isMatrix3 ||
                                value.isMatrix4 ||
                                value.isColor
                            )) {
                                if (!properties[key]) {
                                    properties[key] = value.clone();
                                } else {
                                    properties[key].copy(value);
                                }
                            } else if (Array.isArray(value)) {
                                properties[key] = Array.from(value);
                            } else {
                                properties[key] = value;
                            }
                        }
                    });

                    const target = new Material();

                    target.transparent = properties.transparent;
                    target.opacity = properties.opacity;
                    target.side = properties.side;

                    materialPanelItems.properties.forEach(key => {
                        if (key in target && key in properties) {
                            const value = properties[key];

                            if (key === 'clippingPlanes' && Array.isArray(value)) {
                                const length = value.length;
                                const array = new Array(length);

                                for (let i = 0; i < length; i++) {
                                    array[i] = value[i].clone();
                                }

                                target.clippingPlanes = array;
                            } else if (key === 'userData') {
                                target.userData = value;

                                if (!target.userData.onBeforeCompile) {
                                    target.userData.onBeforeCompile = {};
                                }

                                target.onBeforeCompile = shader => {
                                    for (const key in target.userData.onBeforeCompile) {
                                        target.userData.onBeforeCompile[key](shader, mesh);
                                    }
                                };
                            } else if (value && (
                                value.isVector2 ||
                                value.isVector3 ||
                                value.isVector4 ||
                                value.isMatrix3 ||
                                value.isMatrix4 ||
                                value.isColor
                            )) {
                                target[key].copy(value);
                            } else {
                                target[key] = value;
                            }
                        }
                    });

                    if (ui.uvTexture) {
                        target.map = ui.uvTexture;
                    }

                    target.customProgramCacheKey = () => Object.keys(target.userData.onBeforeCompile).join('|');
                    target.needsUpdate = true;

                    return target;
                });

                mesh.material = Array.isArray(mesh.material) ? target : target[0];

                state.materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                state.material = state.materials[0];

                if (ui.point && ui.isDefault) {
                    ui.point.setData({
                        name: mesh.geometry.type,
                        type: state.material.type
                    });
                }

                item.setContent(subPanel(materialPanelItems(mesh, ui)));

                state.lastPanel = materialPanelItems;
            }
        }
    ];

    return [
        {
            type: 'divider'
        },
        {
            type: 'list',
            name: 'Visible',
            list: VisibleOptions,
            value: getKeyByValue(VisibleOptions, mesh.visible),
            callback: (value, item) => {
                if (!item.hasContent()) {
                    item.setContent(subPanel(materialItems));
                }

                mesh.visible = VisibleOptions.get(value);

                if (mesh.visible) {
                    item.toggleContent(true);
                } else {
                    item.toggleContent(false);
                }
            }
        }
    ];
}
