import { useEffect, useImperativeHandle, useRef } from 'react';

import { clearTween, tween } from '@lib/tween/Tween.js';

import './RadialGraphTracker.css';

/**
 * An absolutely-positioned tracker overlay that slides horizontally when the
 * parent radial graph is opened or closed.  Mirrors `RadialGraphTracker`.
 *
 * @param {object} props
 * @param {object} [props.ref] Exposes `update`, `lock`, `unlock`, `open`,
 *   `close`, `animateIn`, `animateOut`, `setData`, and `setGraphHeight`.
 * @example
 * const trackerRef = useRef();
 * <RadialGraphTracker ref={trackerRef} />
 * trackerRef.current.animateIn();
 */
export function RadialGraphTracker({ ref, children }) {
    const rootRef = useRef(null);

    // Mutable state – never drives React re-renders.
    const stateRef = useRef({
        position: { x: 0, y: 0 },
        origin: { x: 0, y: 0 },
        originPosition: { x: 0, y: 0 },
        graphHeight: 0,
        locked: false,
        animatedIn: false,
        isVisible: false,
        isOpen: false
    });

    useEffect(() => {
        const s = stateRef.current;

        return () => {
            clearTween(s.origin);
        };
    }, []);

    useImperativeHandle(ref, () => {
        const s = stateRef.current;
        const el = () => rootRef.current;

        return {
            /**
             * Recalculates the DOM position from `origin` and `position`.
             * Call every frame while the tracker is visible.
             */
            update() {
                s.originPosition.x = s.origin.x + s.position.x;
                s.originPosition.y = s.origin.y + s.position.y;

                if (el()) {
                    el().style.left = `${s.originPosition.x}px`;
                    el().style.top = `${s.originPosition.y}px`;
                }
            },

            /** Sets the tracker position anchor without animation. */
            setPosition(x, y) {
                s.position.x = x;
                s.position.y = y;
            },

            /** Stores the graph height used for the open/close animation. */
            setGraphHeight(graphHeight) {
                s.graphHeight = graphHeight;
            },

            lock() {
                s.locked = true;
            },

            unlock() {
                s.locked = false;
            },

            show() {
                s.animatedIn = true;
            },

            hide() {
                if (s.locked) {
                    return;
                }

                s.animatedIn = false;
            },

            open() {
                clearTween(s.origin);
                tween(s.origin, { x: s.graphHeight }, 400, 'easeOutCubic');
                s.isOpen = true;
            },

            close() {
                clearTween(s.origin);
                tween(s.origin, { x: 0 }, 400, 'easeOutCubic', 200);
                s.isOpen = false;
            },

            animateIn() {
                s.animatedIn = true;
                s.isVisible = true;
            },

            animateOut(callback) {
                s.animatedIn = false;
                s.isVisible = false;

                if (callback) {
                    callback();
                }
            }
        };
    }, []);

    return (
        <div ref={rootRef} className="tracker">
            {children}
        </div>
    );
}
