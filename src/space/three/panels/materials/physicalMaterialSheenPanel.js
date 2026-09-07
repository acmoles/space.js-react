/**
 * @author Space.js React
 *
 * Sheen sub-panel for MeshPhysicalMaterial.
 *
 * Ported from the reference `PhysicalMaterialSheenPanel` class.
 */

/**
 * @param {import('three').Mesh} mesh
 * @returns {object[]} Panel item descriptors.
 */
export function physicalMaterialSheenPanelItems(mesh) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const material = materials[0];

    return [
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'Int',
            min: 0,
            max: 1,
            step: 0.01,
            value: material.sheen,
            callback: value => {
                materials.forEach(material => material.sheen = value);
            }
        },
        {
            type: 'color',
            name: 'Sheen Color',
            value: material.sheenColor,
            callback: value => {
                materials.forEach(material => material.sheenColor.copy(value));
            }
        },
        {
            type: 'slider',
            name: 'Rough',
            min: 0,
            max: 1,
            step: 0.01,
            value: material.sheenRoughness,
            callback: value => {
                materials.forEach(material => material.sheenRoughness = value);
            }
        }
    ];
}
