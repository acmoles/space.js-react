import { useEffect, useImperativeHandle, useRef } from 'react';

import { TwoPI, degToRad } from '@lib/utils/Utils.js';

/**
 * Manages a set of {@link RadialGraphCanvas} (or {@link RadialGraphSegmentsCanvas})
 * components that share a canvas context.  Mirrors `RadialGraphContainer`.
 *
 * The container does not render DOM of its own beyond `<div
 * class="radial-graph-container">` — it delegates sizing and lifecycle to the
 * graph refs passed via `graphRefs`.
 *
 * @param {object} props
 * @param {number} [props.start=0] Start angle in degrees.
 * @param {number} [props.graphHeight=60] Radial height of each graph band.
 * @param {React.RefObject[]} [props.graphRefs=[]] Refs for child graph
 *   components.  Each ref must expose the imperative handle of
 *   `RadialGraphCanvas` or `RadialGraphSegmentsCanvas`.
 * @param {function} [props.onCursor] Called with `{ cursor, target }` when any
 *   child emits a cursor-change event.
 * @param {object} [props.ref] Exposes `graphHeight`, `middle`, `halfWidth`,
 *   `startAngle`, `setSize`, `setIndex`, `setContext`, `setArray`,
 *   `setGhostArray`, `update`, `animateIn`, `animateOut`, `animateLabelsIn`,
 *   `animateLabelsOut`, `setPosition`, `getSize`.
 * @param {React.ReactNode} [props.children]
 * @example
 * const containerRef = useRef();
 * const graphRef = useRef();
 *
 * <RadialGraphContainer ref={containerRef} graphRefs={[graphRef]}>
 *     <RadialGraphCanvas ref={graphRef} value={data} start={0} />
 * </RadialGraphContainer>
 *
 * containerRef.current.setSize(400, 400);
 * containerRef.current.setIndex(0);
 * containerRef.current.animateIn();
 */
export function RadialGraphContainer({
    start = 0,
    graphHeight = 60,
    graphRefs = [],
    onCursor,
    ref,
    children
}) {
    const rootRef = useRef(null);

    // Geometry mirrors the original's constructor fields.
    const stateRef = useRef({
        position: { x: 0, y: 0 },
        objectWidth: 0,
        objectHeight: 0,
        width: 0,
        height: 0,
        halfWidth: 0,
        halfHeight: 0,
        middle: 0,
        startAngle: (() => {
            let a = degToRad(start);

            if (a < 0) {
                a += TwoPI;
            }

            return a;
        })(),
        index: 0,
        activeRef: null
    });

    const onCursorRef = useRef(onCursor);

    useEffect(() => {
        onCursorRef.current = onCursor;
    }, [onCursor]);

    useImperativeHandle(ref, () => {
        const s = stateRef.current;
        const graphs = () => graphRefs;

        return {
            get graphHeight() {
                return graphHeight;
            },

            get middle() {
                return s.middle;
            },

            get halfWidth() {
                return s.halfWidth;
            },

            get startAngle() {
                return s.startAngle;
            },

            /** Sets the offset of the container's centre inside the shared canvas. */
            setPosition(x, y) {
                s.position.x = x;
                s.position.y = y;
                graphs().forEach(gr => gr.current?.setPosition(x, y));
            },

            /** Returns the computed outer dimensions `{ width, height }`. */
            getSize() {
                return { width: s.width, height: s.height };
            },

            /**
             * Resizes all child graphs.  Geometry is recalculated only when
             * `width` changes, matching the original behaviour.
             */
            setSize(width, height) {
                if (width !== s.objectWidth) {
                    s.objectWidth = width;
                    s.objectHeight = height;
                    s.width = s.objectWidth + graphHeight * 4;
                    s.height = s.objectHeight + graphHeight * 4;
                    s.halfWidth = Math.round(s.width / 2);
                    s.halfHeight = Math.round(s.height / 2);
                    s.middle = s.width / 2;
                }

                graphs().forEach(gr => {
                    gr.current?.setPosition(s.position.x, s.position.y);
                    gr.current?.setSize(width, height);
                });

                if (rootRef.current) {
                    rootRef.current.style.width = `${s.width}px`;
                    rootRef.current.style.height = `${s.height}px`;
                }
            },

            /** Passes the shared canvas context to all child graphs. */
            setContext(context) {
                graphs().forEach(gr => gr.current?.setContext(context));
            },

            /**
             * Activates graph at `index`, hiding the rest.
             * Each hidden graph has its `enabled` flag cleared.
             */
            setIndex(index) {
                s.index = index;
                s.activeRef = graphs()[index] ?? null;

                graphs().forEach((gr, i) => {
                    gr.current?.setEnabled(i === index);
                });

                this.update();
            },

            setArray(value, index = 0) {
                graphs()[index]?.current?.setArray(value);
            },

            setGhostArray(value, index = 0) {
                graphs()[index]?.current?.setGhostArray(value);
            },

            update() {
                graphs().forEach(gr => gr.current?.update());
            },

            animateLabelsIn() {
                graphs().forEach(gr => gr.current?.animateLabelsIn?.());
            },

            animateLabelsOut() {
                graphs().forEach(gr => gr.current?.animateLabelsOut?.());
            },

            animateIn(fast) {
                graphs().forEach(gr => gr.current?.animateIn(fast));
            },

            animateOut() {
                graphs().forEach(gr => gr.current?.animateOut());
            }
        };
    }, [graphRefs, graphHeight]);

    return (
        <div ref={rootRef} className="radial-graph-container">
            {children}
        </div>
    );
}
