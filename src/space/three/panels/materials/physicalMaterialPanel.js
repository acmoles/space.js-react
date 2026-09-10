/**
 * @author Space.js React
 *
 * MeshPhysicalMaterial panel: a list that swaps the nested sub-panel between
 * the common controls and each texture / physical property panel.
 *
 * Ported from the reference `PhysicalMaterialPanel` class.
 */

import { MaterialPanels } from '../patches.js';
import { subPanel } from '../subPanel.js';
import { MaterialProperties } from './materialProperties.js';

import { physicalMaterialCommonPanelItems } from './physicalMaterialCommonPanel.js';
import { physicalMaterialAnisotropyPanelItems } from './physicalMaterialAnisotropyPanel.js';
import { physicalMaterialClearcoatPanelItems } from './physicalMaterialClearcoatPanel.js';
import { physicalMaterialClearcoatRoughnessPanelItems } from './physicalMaterialClearcoatRoughnessPanel.js';
import { physicalMaterialClearcoatNormalPanelItems } from './physicalMaterialClearcoatNormalPanel.js';
import { physicalMaterialIridescencePanelItems } from './physicalMaterialIridescencePanel.js';
import { physicalMaterialIridescenceThicknessPanelItems } from './physicalMaterialIridescenceThicknessPanel.js';
import { physicalMaterialSheenPanelItems } from './physicalMaterialSheenPanel.js';
import { physicalMaterialSheenColorPanelItems } from './physicalMaterialSheenColorPanel.js';
import { physicalMaterialSheenRoughnessPanelItems } from './physicalMaterialSheenRoughnessPanel.js';
import { physicalMaterialTransmissionPanelItems } from './physicalMaterialTransmissionPanel.js';
import { physicalMaterialTransmissionIntensityPanelItems } from './physicalMaterialTransmissionIntensityPanel.js';
import { physicalMaterialTransmissionThicknessPanelItems } from './physicalMaterialTransmissionThicknessPanel.js';
import { physicalMaterialSpecularPanelItems } from './physicalMaterialSpecularPanel.js';
import { physicalMaterialSpecularColorPanelItems } from './physicalMaterialSpecularColorPanel.js';
import { physicalMaterialSpecularIntensityPanelItems } from './physicalMaterialSpecularIntensityPanel.js';
import { physicalMaterialEnvPanelItems } from './physicalMaterialEnvPanel.js';
import { textureMapPanelItems } from '../textures/textureMapPanel.js';
import { lightMapPanelItems } from '../textures/lightMapPanel.js';
import { aoMapPanelItems } from '../textures/aoMapPanel.js';
import { emissiveMapPanelItems } from '../textures/emissiveMapPanel.js';
import { bumpMapPanelItems } from '../textures/bumpMapPanel.js';
import { normalMapPanelItems } from '../textures/normalMapPanel.js';
import { displacementMapPanelItems } from '../textures/displacementMapPanel.js';
import { roughnessMapPanelItems } from '../textures/roughnessMapPanel.js';
import { metalnessMapPanelItems } from '../textures/metalnessMapPanel.js';
import { alphaMapPanelItems } from '../textures/alphaMapPanel.js';

export const PhysicalMaterialOptions = new Map([
    ['Common', physicalMaterialCommonPanelItems],
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
    ['Anis', physicalMaterialAnisotropyPanelItems],
    ['Coat', physicalMaterialClearcoatPanelItems],
    ['Coat Rough', physicalMaterialClearcoatRoughnessPanelItems],
    ['Coat Normal', physicalMaterialClearcoatNormalPanelItems],
    ['Irid', physicalMaterialIridescencePanelItems],
    ['Irid Thick', physicalMaterialIridescenceThicknessPanelItems],
    ['Sheen', physicalMaterialSheenPanelItems],
    ['Sheen Color', physicalMaterialSheenColorPanelItems],
    ['Sheen Rough', physicalMaterialSheenRoughnessPanelItems],
    ['Trans', physicalMaterialTransmissionPanelItems],
    ['Trans Int', physicalMaterialTransmissionIntensityPanelItems],
    ['Trans Thick', physicalMaterialTransmissionThicknessPanelItems],
    ['Specular', physicalMaterialSpecularPanelItems],
    ['Specular Color', physicalMaterialSpecularColorPanelItems],
    ['Specular Int', physicalMaterialSpecularIntensityPanelItems],
    ['Env', physicalMaterialEnvPanelItems]
]);

/**
 * @param {import('three').Mesh} mesh
 * @param {object}               ui
 * @returns {object[]} Panel item descriptors.
 */
export function physicalMaterialPanelItems(mesh, ui) {
    const materialItems = [
        {
            type: 'divider'
        },
        {
            type: 'list',
            name: 'Physical',
            list: PhysicalMaterialOptions,
            value: 'Common',
            callback: (value, item) => {
                const buildItems = PhysicalMaterialOptions.get(value);

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

physicalMaterialPanelItems.type = 'Physical';

physicalMaterialPanelItems.properties = [
    ...MaterialProperties.Common,
    ...MaterialProperties.Standard,
    ...MaterialProperties.Physical
];
