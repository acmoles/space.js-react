/**
 * @author Space.js React
 *
 * Transmission sub-panel for MeshPhysicalMaterial.
 *
 * Ported from the reference `PhysicalMaterialTransmissionPanel` class.
 */

/**
 * @param {import('three').Mesh} mesh
 * @returns {object[]} Panel item descriptors.
 */
export function physicalMaterialTransmissionPanelItems(mesh) {
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
            value: material.transmission,
            callback: value => {
                materials.forEach(material => material.transmission = value);
            }
        },
        {
            type: 'slider',
            name: 'Thick',
            min: -10,
            max: 10,
            step: 0.1,
            value: material.thickness,
            callback: value => {
                materials.forEach(material => material.thickness = value);
            }
        },
        {
            type: 'color',
            name: 'Attenuation Color',
            value: material.attenuationColor,
            callback: value => {
                materials.forEach(material => material.attenuationColor.copy(value));
            }
        },
        {
            type: 'slider',
            name: 'Distance',
            min: -10,
            max: 10,
            step: 0.1,
            value: material.attenuationDistance,
            callback: value => {
                materials.forEach(material => material.attenuationDistance = value);
            }
        },
        {
            type: 'slider',
            name: 'Chroma',
            min: 0,
            max: 1,
            step: 0.01,
            value: material.dispersion,
            callback: value => {
                materials.forEach(material => material.dispersion = value);
            }
        },
        {
            type: 'slider',
            name: 'IOR',
            min: 1,
            max: 2.333,
            step: 0.01,
            value: material.ior,
            callback: value => {
                materials.forEach(material => material.ior = value);
            }
        },
        {
            type: 'slider',
            name: 'Reflect',
            min: 0,
            max: 1,
            step: 0.01,
            value: material.reflectivity,
            callback: value => {
                materials.forEach(material => material.reflectivity = value);
            }
        }
    ];
}
