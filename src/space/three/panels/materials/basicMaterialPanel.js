/**
 * @author Space.js React
 *
 * MeshBasicMaterial panel: a list that swaps the nested sub-panel between
 * the common controls and each texture map.
 *
 * Ported from the reference `BasicMaterialPanel` class.
 */

import { MaterialPanels } from '../patches.js';
import { subPanel } from '../subPanel.js';
import { MaterialProperties } from './materialProperties.js';

import { basicMaterialCommonPanelItems } from './basicMaterialCommonPanel.js';
import { textureMapPanelItems } from '../textures/textureMapPanel.js';
import { lightMapPanelItems } from '../textures/lightMapPanel.js';
import { aoMapPanelItems } from '../textures/aoMapPanel.js';
import { specularMapPanelItems } from '../textures/specularMapPanel.js';
import { alphaMapPanelItems } from '../textures/alphaMapPanel.js';
import { envMapPanelItems } from '../textures/envMapPanel.js';

export const BasicMaterialOptions = new Map([
    ['Common', basicMaterialCommonPanelItems],
    ['Map', textureMapPanelItems],
    ['Light', lightMapPanelItems],
    ['AO', aoMapPanelItems],
    ['Specular', specularMapPanelItems],
    ['Alpha', alphaMapPanelItems],
    ['Env', envMapPanelItems]
]);

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function basicMaterialPanelItems(mesh, ui) {
    const materialItems = [
        {
            type: 'divider'
        },
        {
            type: 'list',
            name: 'Basic',
            list: BasicMaterialOptions,
            value: 'Common',
            callback: (value, item) => {
                const buildItems = BasicMaterialOptions.get(value);

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

basicMaterialPanelItems.type = 'Basic';

basicMaterialPanelItems.properties = [
    ...MaterialProperties.Common,
    ...MaterialProperties.Basic
];
