/**
 * @author Space.js React
 *
 * Creates a lib RadialGraphCanvas instance and disposes it on unmount.
 * The returned ref is suitable for the `graph` prop of `<Point3D>`.
 *
 * @param {object} options   Passed to the RadialGraphCanvas constructor.
 * @returns {React.RefObject}  graphRef
 */
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

import { RadialGraphCanvas as LibRadialGraphCanvas } from '@lib/three.js';

export function useRadialGraphCanvas(options) {
    const graphRef = useRef(null);
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
        const graph = new LibRadialGraphCanvas(options);
        graphRef.current = graph;
        notify();

        return () => {
            if (graphRef.current === graph) {
                graphRef.current = null;
                notify();
            }

            graph.destroy?.();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // options is read once on mount

    return graphRef;
}
