/**
 * Registers the About app's extra material sub-panels (Adjustments, Subsurface
 * Scattering, Helper) onto the shared React material option maps, and
 * loads the shader patches (`../materials/Patches.js`) that those sub-panels
 * enable.
 *
 * Port of the About app's `controllers/panels/Patches.js`. Because the option
 * maps are shared module-level singletons used by every example, the keys are
 * removed again on teardown so navigating to other examples is not polluted.
 */

// Side effect: populates MaterialPatches.<Key>.adjustments / .subsurface
import '../materials/Patches.js';

import {
    BasicMaterialOptions,
    LambertMaterialOptions,
    MatcapMaterialOptions,
    PhongMaterialOptions,
    PhysicalMaterialOptions,
    StandardMaterialOptions,
    ToonMaterialOptions
} from '@/space/three/index.js';

import { materialAdjustmentsPanelItems } from './materialAdjustmentsPanel.js';
import { materialSubsurfacePanelItems } from './materialSubsurfacePanel.js';
import { meshHelperPanelItems } from './meshHelperPanel.js';

function buildRegistrations() {
    return [
        [BasicMaterialOptions, 'Basic', false],
        [LambertMaterialOptions, 'Lambert', true],
        [MatcapMaterialOptions, 'Matcap', false],
        [PhongMaterialOptions, 'Phong', true],
        [ToonMaterialOptions, 'Toon', true],
        [StandardMaterialOptions, 'Standard', true],
        [PhysicalMaterialOptions, 'Physical', true]
    ];
}

export function registerAboutPatches() {
    const registrations = buildRegistrations();
    const added = [];

    registrations.forEach(([options, key, hasSubsurface]) => {
        if (hasSubsurface) {
            options.set('Subsurface', materialSubsurfacePanelItems(key));
            added.push([options, 'Subsurface']);
        }

        options.set('Adjust', materialAdjustmentsPanelItems(key));
        options.set('Helper', meshHelperPanelItems);

        added.push([options, 'Adjust']);
        added.push([options, 'Helper']);
    });

    return function unregister() {
        added.forEach(([options, mapKey]) => {
            options.delete(mapKey);
        });
    };
}
