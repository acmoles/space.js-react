/**
 * @author Space.js React
 *
 * MeshToonMaterial panel: a list that swaps the nested sub-panel between
 * the common controls and each texture map.
 *
 * Ported from the reference `ToonMaterialPanel` class.
 */

import { MaterialPanels } from '../patches.js';
import { subPanel } from '../subPanel.js';
import { MaterialProperties } from './materialProperties.js';

import { toonMaterialCommonPanelItems } from './toonMaterialCommonPanel.js';
import { textureMapPanelItems } from '../textures/textureMapPanel.js';
import { gradientMapPanelItems } from '../textures/gradientMapPanel.js';
import { lightMapPanelItems } from '../textures/lightMapPanel.js';
import { aoMapPanelItems } from '../textures/aoMapPanel.js';
import { emissiveMapPanelItems } from '../textures/emissiveMapPanel.js';
import { bumpMapPanelItems } from '../textures/bumpMapPanel.js';
import { normalMapPanelItems } from '../textures/normalMapPanel.js';
import { displacementMapPanelItems } from '../textures/displacementMapPanel.js';
import { alphaMapPanelItems } from '../textures/alphaMapPanel.js';

export const ToonMaterialOptions = new Map([
    ['Common', toonMaterialCommonPanelItems],
    ['Map', textureMapPanelItems],
    ['Gradient', gradientMapPanelItems],
    ['Light', lightMapPanelItems],
    ['AO', aoMapPanelItems],
    ['Emissive', emissiveMapPanelItems],
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
export function toonMaterialPanelItems(mesh, ui) {
    const materialItems = [
        {
            type: 'divider'
        },
        {
            type: 'list',
            name: 'Toon',
            list: ToonMaterialOptions,
            value: 'Common',
            callback: (value, item) => {
                const buildItems = ToonMaterialOptions.get(value);

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

toonMaterialPanelItems.type = 'Toon';

toonMaterialPanelItems.properties = [
    ...MaterialProperties.Common,
    ...MaterialProperties.Toon
];
