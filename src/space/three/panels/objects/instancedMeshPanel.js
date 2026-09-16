/**
 * @author Space.js React
 *
 * InstancedMesh panel item descriptors.
 *
 * Ported from the reference `InstancedMeshPanel` class.
 */

import { Color } from 'three';

import { InstanceOptions } from '../options.js';
import { subPanel } from '../subPanel.js';

/**
 * @param {import('three').InstancedMesh} mesh
 * @param {object}                        ui
 * @param {object[]}                      materialItems
 * @returns {object[]} Panel item descriptors.
 */
export function instancedMeshPanelItems(mesh, ui, materialItems) {
    let point;

    if (ui.constructor.points) {
        point = ui.constructor.getPoint(mesh);
    }

    const color = new Color();

    const items = [
        {
            type: 'list',
            name: 'Instance',
            list: InstanceOptions,
            value: 'Mesh',
            callback: (value, item) => {
                if (InstanceOptions.get(value)) {
                    mesh.getColorAt(point.instances[0].index, color);

                    const instanceItems = [
                        {
                            type: 'divider'
                        },
                        {
                            type: 'color',
                            name: 'Color',
                            value: color,
                            callback: value => {
                                color.copy(value);

                                if (point) {
                                    point.instances.forEach(instance => {
                                        mesh.setColorAt(instance.index, color);
                                    });
                                }

                                mesh.instanceColor.needsUpdate = true;
                            }
                        }
                    ];

                    item.setContent(subPanel(instanceItems));
                } else {
                    item.setContent(subPanel(materialItems));
                }
            }
        }
    ];

    return items;
}
