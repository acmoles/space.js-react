/**
 * Shared helpers for the About panel patches.
 *
 * The reference material Adjustments/Subsurface panels mutate
 * `material.userData.onBeforeCompile` and rely on the aggregating
 * `material.onBeforeCompile` set up by `MaterialsPanel` during a material swap.
 * Because the initial materials created by the scene objects have not been
 * swapped, we defensively install the aggregator so toggling adjustments or
 * subsurface scattering works immediately, exactly as it does after a swap.
 */
export function ensureOnBeforeCompile(material, mesh) {
    if (!material.userData.onBeforeCompile) {
        material.userData.onBeforeCompile = {};
    }

    if (!material.userData.onBeforeCompilePatched) {
        material.userData.onBeforeCompilePatched = true;

        material.onBeforeCompile = shader => {
            for (const key in material.userData.onBeforeCompile) {
                material.userData.onBeforeCompile[key](shader, mesh);
            }
        };

        material.customProgramCacheKey = () => Object.keys(material.userData.onBeforeCompile).join('|');
    }
}
