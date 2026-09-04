/**
 * @author Space.js React
 *
 * Creates a lib MaterialsPanel instance, calls animateIn(true), and disposes
 * it on unmount. Returns a stable ref to the panel.
 *
 * Pass the returned `panelRef` as the `panel` prop to `<Point3D>`.
 *
 * @param {import('three').Mesh|null} mesh
 * @returns {React.RefObject}  panelRef
 */
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

import { MaterialsPanel } from '@lib/three.js';

const DEFAULT_PANEL_UI = {
    uvTexture: null,
    point: null,
    isDefault: false,
    constructor: {
        points: false,
        getPoint: () => null
    }
};

export function useMaterialsPanel(mesh, ui = null) {
    const panelRef = useRef(null);
    const storeRef = useRef({
        listeners: new Set(),
        version: 0
    });

    const notify = useCallback(() => {
        storeRef.current.version += 1;
        storeRef.current.listeners.forEach(listener => listener());
    }, []);

    const subscribe = useCallback(listener => {
        storeRef.current.listeners.add(listener);

        return () => {
            storeRef.current.listeners.delete(listener);
        };
    }, []);

    const getSnapshot = useCallback(() => storeRef.current.version, []);

    useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    useEffect(() => {
        if (!mesh) {
            if (panelRef.current) {
                panelRef.current = null;
                notify();
            }

            return undefined;
        }

        const panel = new MaterialsPanel(mesh, ui || DEFAULT_PANEL_UI);
        panel.animateIn(true);
        panelRef.current = panel;
        notify();

        return () => {
            if (panelRef.current === panel) {
                panelRef.current = null;
                notify();
            }

            panel.destroy?.();
        };
    }, [mesh, notify, ui]);

    return panelRef;
}
