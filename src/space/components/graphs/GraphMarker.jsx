import { useEffect, useImperativeHandle, useMemo, useRef } from 'react';

import { Vector2 } from '@lib/math/Vector2.js';
import { clearTween } from '@lib/tween/Tween.js';

import './GraphMarker.css';

/**
 * Graph marker — an absolutely-positioned text label with optional drag
 * behaviour that sits on top of a graph canvas at a normalised x position.
 *
 * The component exposes a mutable imperative handle that the parent graph
 * (`Graph` or `GraphSegments`) writes to directly from its draw loop, which
 * avoids React re-renders for per-frame updates:
 *
 * - `handle.x` — normalised [0, 1] position; parent writes this on drag.
 * - `handle.multiplier` — opacity scale [0, 1]; parent tweens this.
 * - `handle.element` — the live DOM node; parent sets `style.left`/`top`.
 * - `handle.clearTween()` — stops any tween running against the handle.
 *
 * The `onUpdate` and `onClick` callbacks mirror the `events.emit('update')`
 * and `events.emit('click')` calls of the original class, receiving
 * `{ dragging, target }` and `{ target }` respectively where `target` is
 * this handle.
 *
 * @param {object}   props
 * @param {string}   props.name            Label text.
 * @param {boolean}  [props.noDrag=false]  Disables drag when true.
 * @param {function} [props.onUpdate]      `({ dragging, target }) => void`
 * @param {function} [props.onClick]       `({ target }) => void`
 * @param {object}   [props.ref]           Exposes the mutable handle described above.
 * @example
 * const markerRef = useRef(null);
 * <GraphMarker ref={markerRef} name="Marker 1" onUpdate={handleUpdate} />
 * // From parent's draw loop (no re-render):
 * markerRef.current.element.style.left = `${x}px`;
 * markerRef.current.multiplier = 0.5;
 */
export function GraphMarker({ name, noDrag = false, onUpdate, onClick, ref }) {
    const rootRef = useRef(null);

    // Keep prop callbacks in refs so the stable event-handler closures below
    // always call the latest version without needing to resubscribe.
    const onUpdateRef = useRef(onUpdate);
    const onClickRef = useRef(onClick);
    useEffect(() => {
        onUpdateRef.current = onUpdate;
        onClickRef.current = onClick;
    });

    // Drag tracking — purely mutable, never React state.
    const isDraggingRef = useRef(false);
    const mouseRef = useRef(new Vector2());
    const deltaRef = useRef(new Vector2());
    const lastTimeRef = useRef(0);
    const lastMouseRef = useRef(new Vector2());

    // Stable handle object. Its `x` and `multiplier` fields are written
    // directly by the parent graph component.
    const handle = useMemo(() => {
        const h = {
            get element() {
                return rootRef.current;
            },
            x: 0,
            multiplier: 0,
            clearTween: () => {
                clearTween(h);
            }
        };

        return h;
    }, []);

    useImperativeHandle(ref, () => handle, [handle]);

    // Stable pointermove / pointerup handlers stored in refs so they can be
    // added and removed from `window` without resubscribing on re-renders.
    const onPointerMoveRef = useRef(null);
    const onPointerUpRef = useRef(null);

    useEffect(() => {
        onPointerMoveRef.current = e => {
            mouseRef.current.copy({ x: e.clientX, y: e.clientY });
            deltaRef.current.subVectors(mouseRef.current, lastMouseRef.current);

            if (deltaRef.current.length()) {
                isDraggingRef.current = true;
                onUpdateRef.current?.({ dragging: true, target: handle });
            }
        };

        onPointerUpRef.current = () => {
            window.removeEventListener('pointermove', onPointerMoveRef.current);
            window.removeEventListener('pointerup', onPointerUpRef.current);

            isDraggingRef.current = false;
            onUpdateRef.current?.({ dragging: false, target: handle });

            if (performance.now() - lastTimeRef.current > 250 || deltaRef.current.length() > 50) {
                return;
            }

            onClickRef.current?.({ target: handle });
        };
    }, [handle]);

    // Persistent keyup listener — cancels an active drag on Escape.
    useEffect(() => {
        if (noDrag) return;

        const onKeyUp = e => {
            if (e.keyCode !== 27 || !isDraggingRef.current) {
                return;
            }

            window.removeEventListener('pointermove', onPointerMoveRef.current);
            window.removeEventListener('pointerup', onPointerUpRef.current);

            isDraggingRef.current = false;
            onUpdateRef.current?.({ dragging: false, target: handle });
        };

        window.addEventListener('keyup', onKeyUp);

        return () => window.removeEventListener('keyup', onKeyUp);
    }, [noDrag, handle]);

    // Ensure window drag listeners are removed if this component unmounts
    // while a drag is in progress.
    useEffect(() => () => {
        if (onPointerMoveRef.current) {
            window.removeEventListener('pointermove', onPointerMoveRef.current);
        }

        if (onPointerUpRef.current) {
            window.removeEventListener('pointerup', onPointerUpRef.current);
        }

        clearTween(handle);
    }, [handle]);

    const handlePointerDown = e => {
        if (noDrag) return;

        lastTimeRef.current = performance.now();
        lastMouseRef.current.set(e.clientX, e.clientY);
        mouseRef.current.copy({ x: e.clientX, y: e.clientY });
        deltaRef.current.set(0, 0);

        window.addEventListener('pointermove', onPointerMoveRef.current);
        window.addEventListener('pointerup', onPointerUpRef.current);
    };

    return (
        <div
            ref={rootRef}
            className={noDrag ? 'marker' : 'marker draggable'}
            onPointerDown={handlePointerDown}
        >
            {name}
        </div>
    );
}
