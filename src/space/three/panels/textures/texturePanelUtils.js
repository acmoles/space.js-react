/**
 * @author Space.js React
 *
 * Utility for programmatically setting a texture on the correct panel.
 *
 * Ported from the reference `TexturePanelUtils` module. References to material
 * panel classes have been replaced with imports of the ported Options maps from
 * the corresponding builder-function modules.
 */

import { BasicMaterialOptions } from '../materials/basicMaterialPanel.js';
import { LambertMaterialOptions } from '../materials/lambertMaterialPanel.js';
import { MatcapMaterialOptions } from '../materials/matcapMaterialPanel.js';
import { PhongMaterialOptions } from '../materials/phongMaterialPanel.js';
import { ToonMaterialOptions } from '../materials/toonMaterialPanel.js';
import { StandardMaterialOptions } from '../materials/standardMaterialPanel.js';
import { PhysicalMaterialOptions } from '../materials/physicalMaterialPanel.js';

export function setPanelTexture(panel, material, texture, name, path = []) {
    if (path.length) {
        path = [path];
    }

    let type, options;

    if (material.isMeshBasicMaterial) {
        type = 'Basic';
        options = BasicMaterialOptions;
    } else if (material.isMeshLambertMaterial) {
        type = 'Lambert';
        options = LambertMaterialOptions;
    } else if (material.isMeshMatcapMaterial) {
        type = 'Matcap';
        options = MatcapMaterialOptions;
    } else if (material.isMeshPhongMaterial) {
        type = 'Phong';
        options = PhongMaterialOptions;
    } else if (material.isMeshToonMaterial) {
        type = 'Toon';
        options = ToonMaterialOptions;
    } else if (material.isMeshPhysicalMaterial) {
        type = 'Physical';
        options = PhysicalMaterialOptions;
    } else if (material.isMeshStandardMaterial) {
        type = 'Standard';
        options = StandardMaterialOptions;
    }

    const index = name ? Array.from(options.keys()).indexOf(name) : panel.getPanelIndex(type) || 1; // Defaults to map

    if (~index) {
        panel.setPanelValue('Map', texture, [[type, index], ...path]);
    }
}
