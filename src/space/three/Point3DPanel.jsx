/**
 * @author Space.js React
 *
 * Panel composed as a child of `<Point3D>`.
 *
 * Wraps the React {@link Panel} and registers it with the enclosing
 * `<Point3D>`, which animates it in and out as the tracked object is hovered
 * and selected, and routes `getPanelValue` / `setPanelValue` calls to it.
 *
 * Prefer this over the imperative `panel` prop of `<Point3D>`.  That prop
 * remains for panels whose contents are defined by the vanilla
 * `lib/three/panels/` inspectors, which build their rows from the vanilla
 * `Panel` and `PanelItem` primitives.
 *
 * @example
 * <Point3D object={mesh} name="Server-1">
 *     <Point3DPanel
 *         items={[{ type: 'slider', name: 'Speed', min: 0, max: 10, value: 5 }]}
 *         onChange={handleChange}
 *     />
 * </Point3D>
 */

import { useEffect, useImperativeHandle, useRef } from 'react';

import { Panel } from '../components/panels/index.js';

import { usePoint3DOverlayContext } from './Point3DOverlayContext.js';

/**
 * @param {object}   props
 * @param {object[]} [props.items=[]] Item descriptors, as for `Panel`.
 * @param {function} [props.onChange] Called when any child item emits an update.
 * @param {object}   [props.ref] Exposes the underlying `Panel` handle.
 */
export function Point3DPanel({ items = [], onChange, ref }) {
    const overlay = usePoint3DOverlayContext();
    const panelRef = useRef(null);

    // Expose the Panel handle unchanged — this component adds registration,
    // not behaviour.
    useImperativeHandle(ref, () => panelRef.current, []);

    // Register with the enclosing <Point3D>.  As in Point3DGraph, the
    // registered value is a live getter because useImperativeHandle commits
    // after this effect on the first mount.
    useEffect(() => {
        if (!overlay) return undefined;

        return overlay.registerPanel({
            get current() { return panelRef.current; }
        });
    }, [overlay]);

    return (
        <Panel
            ref={panelRef}
            items={items}
            onChange={onChange}
        />
    );
}

// Lets <Point3D> detect a panel child during render, before registration
// effects have run.
Point3DPanel.__isPoint3DPanel = true;
