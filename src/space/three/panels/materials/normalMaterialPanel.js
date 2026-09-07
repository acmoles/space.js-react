/**
 * @author Space.js React
 *
 * MeshNormalMaterial panel: a list that swaps the nested sub-panel between
 * the common controls and each texture map.
 *
 * Ported from the reference `NormalMaterialPanel` class.
 */

import { MaterialPanels } from '../patches.js';
import { subPanel } from '../subPanel.js';
import { MaterialProperties } from './materialProperties.js';

import { normalMaterialCommonPanelItems } from './normalMaterialCommonPanel.js';
import { bumpMapPanelItems } from '../textures/bumpMapPanel.js';
import { normalMapPanelItems } from '../textures/normalMapPanel.js';
import { displacementMapPanelItems } from '../textures/displacementMapPanel.js';

export const NormalMaterialOptions = new Map([
    ['Common', normalMaterialCommonPanelItems],
    ['Bump', bumpMapPanelItems],
    ['Normal', normalMapPanelItems],
    ['Displace', displacementMapPanelItems]
]);

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function normalMaterialPanelItems(mesh, ui) {
    const materialItems = [
        {
            type: 'divider'
        },
        {
            type: 'list',
            name: 'Normal',
            list: NormalMaterialOptions,
            value: 'Common',
            callback: (value, item) => {
                const buildItems = NormalMaterialOptions.get(value);

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

normalMaterialPanelItems.type = 'Normal';

normalMaterialPanelItems.properties = [
    ...MaterialProperties.Common,
    ...MaterialProperties.Normal
];
