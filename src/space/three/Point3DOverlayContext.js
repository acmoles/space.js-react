/**
 * @author Space.js React
 *
 * Context published by `<Point3D>` to the overlay subtree it renders.
 *
 * `<Point3D>` renders its children into a plain DOM overlay that sits above the
 * WebGL canvas, so a panel or graph written as a React component can simply be
 * composed as a child instead of being constructed imperatively and handed over
 * as a prop:
 *
 * ```jsx
 * <Point3D object={mesh} name="Server-1">
 *     <Point3DGraph value={data} />
 * </Point3D>
 * ```
 *
 * Children announce themselves through {@link registerGraph} / {@link registerPanel}
 * so that `<Point3D>` can drive their animation and geometry without knowing how
 * they are implemented.  Registration is imperative on purpose: `<Point3D>`
 * reads geometry every frame from inside the R3F render loop, where a React
 * state round-trip per frame would be far too expensive.
 */

import { createContext, useContext } from 'react';

/**
 * @typedef {object} Point3DOverlayContextValue
 * @property {function(object): function} registerGraph Registers the graph
 *   handle used for hit testing, geometry and animation.  Returns an
 *   unregister function suitable for returning from an effect.
 * @property {function(object): function} registerPanel Registers the panel
 *   handle used for animation and value get/set.  Returns an unregister
 *   function suitable for returning from an effect.
 * @property {function(string): void} setCursor Sets the cursor on the shared
 *   canvas, used by graphs that highlight segments on hover.
 * @property {function(): object|null} getCanvasCtx Returns the shared canvas
 *   2-D context, or `null` before the canvas has been committed.
 */

export const Point3DOverlayContext = createContext(null);

/**
 * Returns the overlay context published by the nearest `<Point3D>` ancestor.
 *
 * @returns {Point3DOverlayContextValue|null} `null` when rendered outside a
 *   `<Point3D>`, which lets components such as `<Point3DPanel>` degrade to
 *   plain standalone rendering rather than throwing.
 */
export function usePoint3DOverlayContext() {
    return useContext(Point3DOverlayContext);
}
