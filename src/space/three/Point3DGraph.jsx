/**
 * @author Space.js React
 *
 * Radial graph composed as a child of `<Point3D>`.
 *
 * Wraps {@link RadialGraphContainer} and registers it with the enclosing
 * `<Point3D>`, which then drives its size, position and animation as the
 * tracked object moves.  Because the graph renders inside the `<Point3D>`
 * overlay, no DOM element has to be appended by hand and no geometry has to be
 * recomputed — `<Point3D>` reads `middle`, `halfWidth`, `startAngle` and
 * `graphHeight` straight off the container's own handle.
 *
 * @example
 * <Point3D object={mesh} name="Server-1">
 *     <Point3DGraph start={-90} graphHeight={40}>
 *         <RadialGraphCanvas ref={graphRef} value={data} />
 *     </Point3DGraph>
 * </Point3D>
 */

import { useCallback, useEffect, useImperativeHandle, useRef } from 'react';

import { RadialGraphContainer } from '../components/radial/index.js';

import { usePoint3DOverlayContext } from './Point3DOverlayContext.js';

/**
 * @param {object} props
 * @param {number} [props.start=0] Start angle in degrees.
 * @param {number} [props.graphHeight=60] Radial height of each graph band.
 * @param {React.RefObject[]} [props.graphRefs=[]] Refs of the child graph
 *   canvases, forwarded to `RadialGraphContainer`.
 * @param {function} [props.onCursor] Called with `{ cursor, target }` when a
 *   child emits a cursor change.  Called in addition to the `<Point3D>`
 *   cursor wiring, which is always applied.
 * @param {object} [props.ref] Exposes the underlying `RadialGraphContainer`
 *   handle, for callers that drive the data imperatively.
 * @param {React.ReactNode} [props.children] Graph canvases.
 */
export function Point3DGraph({
    start = 0,
    graphHeight = 60,
    graphRefs = [],
    onCursor,
    ref,
    children
}) {
    const overlay = usePoint3DOverlayContext();
    const containerRef = useRef(null);

    // Expose the container handle unchanged — this component adds registration,
    // not behaviour, so callers keep the full RadialGraphContainer API.
    useImperativeHandle(ref, () => containerRef.current, []);

    // Keep the latest onCursor and overlay in refs so that the cursor handler
    // passed down to RadialGraphContainer has a stable identity and does not
    // re-run the container's own effects when a caller passes an inline arrow.
    const onCursorRef = useRef(onCursor);
    const overlayRef = useRef(overlay);

    useEffect(() => { onCursorRef.current = onCursor; }, [onCursor]);
    useEffect(() => { overlayRef.current = overlay; }, [overlay]);

    const handleCursor = useCallback(e => {
        overlayRef.current?.setCursor(e.cursor);
        onCursorRef.current?.(e);
    }, []);

    // Register with the enclosing <Point3D>.  The registered value is a live
    // getter for the container handle rather than the handle itself, because
    // useImperativeHandle commits after this effect on the first mount.
    useEffect(() => {
        if (!overlay) return undefined;

        return overlay.registerGraph({
            get current() { return containerRef.current; }
        });
    }, [overlay]);

    // Hand the shared canvas context to the container once it is available.
    useEffect(() => {
        const c = overlay?.getCanvasCtx();

        if (!c) return;

        containerRef.current?.setContext(c);
    }, [overlay]);

    return (
        <RadialGraphContainer
            ref={containerRef}
            start={start}
            graphHeight={graphHeight}
            graphRefs={graphRefs}
            onCursor={handleCursor}
        >
            {children}
        </RadialGraphContainer>
    );
}

// Lets <Point3D> detect a graph child during render, before registration
// effects have run, so it can choose the radial tracker over the reticle and
// line on the very first commit.
Point3DGraph.__isPoint3DGraph = true;
