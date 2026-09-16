/**
 * @author Space.js React
 *
 * MeshPhongMaterial panel: a list that swaps the nested sub-panel between
 * the common controls and each texture map.
 *
 * Ported from the reference `PhongMaterialPanel` class.
 */

import { MaterialPanels } from '../patches.js';
import { subPanel } from '../subPanel.js';
import { MaterialProperties } from './materialProperties.js';

import { phongMaterialCommonPanelItems } from './phongMaterialCommonPanel.js';
import { textureMapPanelItems } from '../textures/textureMapPanel.js';
import { lightMapPanelItems } from '../textures/lightMapPanel.js';
import { aoMapPanelItems } from '../textures/aoMapPanel.js';
import { emissiveMapPanelItems } from '../textures/emissiveMapPanel.js';
import { bumpMapPanelItems } from '../textures/bumpMapPanel.js';
import { normalMapPanelItems } from '../textures/normalMapPanel.js';
import { displacementMapPanelItems } from '../textures/displacementMapPanel.js';
import { specularMapPanelItems } from '../textures/specularMapPanel.js';
import { alphaMapPanelItems } from '../textures/alphaMapPanel.js';
import { envMapPanelItems } from '../textures/envMapPanel.js';

export const PhongMaterialOptions = new Map([
    ['Common', phongMaterialCommonPanelItems],
    ['Map', textureMapPanelItems],
    ['Light', lightMapPanelItems],
    ['AO', aoMapPanelItems],
    ['Emissive', emissiveMapPanelItems],
    ['Bump', bumpMapPanelItems],
    ['Normal', normalMapPanelItems],
    ['Displace', displacementMapPanelItems],
    ['Specular', specularMapPanelItems],
    ['Alpha', alphaMapPanelItems],
    ['Env', envMapPanelItems]
]);

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function phongMaterialPanelItems(mesh, ui) {
    const materialItems = [
        {
            type: 'divider'
        },
        {
            type: 'list',
            name: 'Phong',
            list: PhongMaterialOptions,
            value: 'Common',
            callback: (value, item) => {
                const buildItems = PhongMaterialOptions.get(value);

                item.setContent(subPanel(buildItems(mesh, ui)));
            }
        }
    ];

    if (mesh.isInstancedMesh) {
        return [
            {
                type: 'content',
                callback: (value, item) => {
                    const { instancedMeshPanelItems } = MaterialPanels;

                    item.setContent(subPanel(instancedMeshPanelItems(mesh, ui, materialItems)));
                }
            }
        ];
    }

    return materialItems;
}

phongMaterialPanelItems.type = 'Phong';

phongMaterialPanelItems.properties = [
    ...MaterialProperties.Common,
    ...MaterialProperties.Phong
];
