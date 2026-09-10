/**
 * @author Space.js React
 *
 * Shared context for the Points3D / Point3D subsystem.
 *
 * Consumed by Point3D components to register themselves, get the shared
 * canvas context, and access global hover/selection state.
 */

import { createContext, useContext } from 'react';

/**
 * @typedef {object} Point3DContextValue
 * @property {function} animateOutAll    Close / deactivate all open overlays.
 * @property {Element|null} container    DOM element that receives overlay portals.
 * @property {boolean}  debug            Debug mode — show tracker sphere wireframes.
 * @property {function} getCanvasCtx     Returns the shared 2D canvas context.
 * @property {function} getMoved         Returns apis whose label has been dragged.
 * @property {function} getSelected      Returns selected Point3D apis.
 * @property {function} getSnapped       Returns snapped Point3D apis.
 * @property {function} getSnappedSorted Snapped apis sorted by x position.
 * @property {function} register         Register a Point3D instance api.
 * @property {function} setCursor        Set document cursor string.
 * @property {function} setIndexes       Re-index all registered instances.
 * @property {object}   state            Shared mutable state (hover, index, multiple…).
 * @property {function} unregister       Unregister a Point3D instance api.
 */

export const Point3DContext = createContext(null);

/**
 * Hook to access the Point3DContext.
 * Must be used inside a Points3D provider.
 *
 * @returns {Point3DContextValue}
 */
export function usePoint3DContext() {
    return useContext(Point3DContext);
}
