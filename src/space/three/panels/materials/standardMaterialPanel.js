/**
 * @author Space.js React
 *
 * MeshStandardMaterial panel: a list that swaps the nested sub-panel between
 * the common controls and each texture map.
 *
 * Ported from the reference `StandardMaterialPanel` class. The reference kept
 * `type` and `properties` as static class members; the React port attaches
 * them to the builder function, which serves the same lookup role for
 * `MaterialsPanel` when it copies properties across a material swap.
 */

import { MaterialPanels } from '../patches.js';
import { subPanel } from '../subPanel.js';
import { MaterialProperties } from './materialProperties.js';

import { standardMaterialCommonPanelItems } from './standardMaterialCommonPanel.js';
import { alphaMapPanelItems } from '../textures/alphaMapPanel.js';
import { aoMapPanelItems } from '../textures/aoMapPanel.js';
import { bumpMapPanelItems } from '../textures/bumpMapPanel.js';
import { displacementMapPanelItems } from '../textures/displacementMapPanel.js';
import { emissiveMapPanelItems } from '../textures/emissiveMapPanel.js';
import { envMapPanelItems } from '../textures/envMapPanel.js';
import { lightMapPanelItems } from '../textures/lightMapPanel.js';
import { metalnessMapPanelItems } from '../textures/metalnessMapPanel.js';
import { normalMapPanelItems } from '../textures/normalMapPanel.js';
import { roughnessMapPanelItems } from '../textures/roughnessMapPanel.js';
import { textureMapPanelItems } from '../textures/textureMapPanel.js';

export const StandardMaterialOptions = new Map([
    ['Common', standardMaterialCommonPanelItems],
    ['Map', textureMapPanelItems],
    ['Light', lightMapPanelItems],
    ['AO', aoMapPanelItems],
    ['Emissive', emissiveMapPanelItems],
    ['Bump', bumpMapPanelItems],
    ['Normal', normalMapPanelItems],
    ['Displace', displacementMapPanelItems],
    ['Rough', roughnessMapPanelItems],
    ['Metal', metalnessMapPanelItems],
    ['Alpha', alphaMapPanelItems],
    ['Env', envMapPanelItems]
]);

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function standardMaterialPanelItems(mesh, ui) {
    const materialItems = [
        {
            type: 'divider'
        },
        {
            type: 'list',
            name: 'Standard',
            list: StandardMaterialOptions,
            value: 'Common',
            callback: (value, item) => {
                const buildItems = StandardMaterialOptions.get(value);

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

standardMaterialPanelItems.type = 'Standard';

standardMaterialPanelItems.properties = [
    ...MaterialProperties.Common,
    ...MaterialProperties.Standard
];
