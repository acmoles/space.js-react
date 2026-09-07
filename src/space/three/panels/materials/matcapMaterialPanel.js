/**
 * @author Space.js React
 *
 * MeshMatcapMaterial panel: a list that swaps the nested sub-panel between
 * the common controls and each texture map.
 *
 * Ported from the reference `MatcapMaterialPanel` class.
 */

import { MaterialPanels } from '../patches.js';
import { subPanel } from '../subPanel.js';
import { MaterialProperties } from './materialProperties.js';

import { matcapMaterialCommonPanelItems } from './matcapMaterialCommonPanel.js';
import { matcapMapPanelItems } from '../textures/matcapMapPanel.js';
import { textureMapPanelItems } from '../textures/textureMapPanel.js';
import { bumpMapPanelItems } from '../textures/bumpMapPanel.js';
import { normalMapPanelItems } from '../textures/normalMapPanel.js';
import { displacementMapPanelItems } from '../textures/displacementMapPanel.js';
import { alphaMapPanelItems } from '../textures/alphaMapPanel.js';

export const MatcapMaterialOptions = new Map([
    ['Common', matcapMaterialCommonPanelItems],
    ['Matcap', matcapMapPanelItems],
    ['Map', textureMapPanelItems],
    ['Bump', bumpMapPanelItems],
    ['Normal', normalMapPanelItems],
    ['Displace', displacementMapPanelItems],
    ['Alpha', alphaMapPanelItems]
]);

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function matcapMaterialPanelItems(mesh, ui) {
    const materialItems = [
        {
            type: 'divider'
        },
        {
            type: 'list',
            name: 'Matcap',
            list: MatcapMaterialOptions,
            value: 'Common',
            callback: (value, item) => {
                const buildItems = MatcapMaterialOptions.get(value);

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

matcapMaterialPanelItems.type = 'Matcap';

matcapMaterialPanelItems.properties = [
    ...MaterialProperties.Common,
    ...MaterialProperties.Matcap
];
