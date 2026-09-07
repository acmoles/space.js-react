/**
 * @author Space.js React
 *
 * Builds the item descriptors for the three.js material inspector.
 *
 * Replaces the reference library's `MaterialsPanel` class: rather than
 * constructing a panel instance imperatively, this returns plain data that is
 * handed to `<Point3DPanel items={...} />`, so the panel is rendered and
 * animated by React like any other component.
 *
 * The inspector is wrapped in a single `content` item, matching the reference
 * library's `Point3D.setContent()`.
 *
 * The descriptors close over the mesh, so they are rebuilt whenever the mesh
 * or ui object identity changes and are stable otherwise.
 *
 * @param {import('three').Mesh|null} mesh
 * @param {object|null}               [ui]
 * @param {object}                    [options] Forwarded to `materialsPanelItems`.
 * @returns {object[]} Panel item descriptors, or an empty array while `mesh` is null.
 *
 * @example
 * const items = useMaterialsPanelItems(mesh, panelUi);
 *
 * <Point3D object={mesh} name={mesh.geometry.type}>
 *     <Point3DPanel items={items} />
 * </Point3D>
 */
import { useMemo } from 'react';

import { materialsPanelItems } from '../panels/materials/materialsPanel.js';
import { subPanel } from '../panels/subPanel.js';

const DEFAULT_PANEL_UI = {
    uvTexture: null,
    point: null,
    isDefault: false,
    constructor: {
        points: false,
        getPoint: () => null
    }
};

export function useMaterialsPanelItems(mesh, ui = null, options = undefined) {
    return useMemo(() => {
        if (!mesh) return [];

        // Mirrors the reference `Point3D.setContent()`, which wraps the
        // material inspector in a single `content` item rather than adding its
        // rows to the point's own panel.
        return [
            {
                type: 'content',
                callback: (value, item) => {
                    item.setContent(subPanel(materialsPanelItems(mesh, ui || DEFAULT_PANEL_UI, options)));
                }
            }
        ];
    }, [mesh, ui, options]);
}
