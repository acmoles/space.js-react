/**
 * @author Space.js React
 *
 * Specular sub-panel for MeshPhysicalMaterial.
 *
 * Ported from the reference `PhysicalMaterialSpecularPanel` class.
 */

/**
 * @param {import('three').Mesh} mesh
 * @returns {object[]} Panel item descriptors.
 */
export function physicalMaterialSpecularPanelItems(mesh) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const material = materials[0];

    return [
        {
            type: 'divider'
        },
        {
            type: 'color',
            name: 'Specular Color',
            value: material.specularColor,
            callback: value => {
                materials.forEach(material => material.specularColor.copy(value));
            }
        },
        {
            type: 'slider',
            name: 'Int',
            min: 0,
            max: 32,
            step: 0.1,
            value: material.specularIntensity,
            callback: value => {
                materials.forEach(material => material.specularIntensity = value);
            }
        }
    ];
}
