/**
 * @author Space.js React
 *
 * R3F provider that replaces the imperative `Point3D.init()` singleton.
 *
 * Mount inside `<Canvas>`. Pass `container` as the DOM element that receives
 * the shared line-drawing canvas and all per-instance overlays.
 *
 * @example
 * // Outside Canvas:
 * const [trackersEl, setTrackersEl] = useState(null);
 * <div ref={setTrackersEl} style={{ inset: 0, pointerEvents: 'none', position: 'absolute' }} />
 * <Canvas>
 *   <Points3D container={trackersEl}>
 *     <Point3D object={mesh} name="server" type="linux" />
 *   </Points3D>
 * </Canvas>
 */

import { createPortal } from 'react-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useStore } from '@react-three/fiber';
import { Raycaster, Vector2 } from 'three';

import { Stage } from '@lib/three.js';

import { Point3DContext } from './Point3DContext.js';

/**
 * Shared raycaster + pointer/keyboard/selection coordinator.
 *
 * @param {object}          props
 * @param {React.ReactNode} props.children            R3F scene content (including Point3D instances).
 * @param {Element|null}    props.container           DOM element for overlay portals.
 * @param {number}          [props.breakpoint=1000]   Width below which snap margins shrink.
 * @param {Element|null}    [props.dividerSnap=null]  Extra snap margin from UI divider element.
 * @param {boolean}         [props.headerSnap=false]  Extra snap top margin for header bar.
 * @param {boolean}         [props.debug=false]       Show tracker-sphere wireframes.
 */
export function Points3D({
    children,
    container,
    breakpoint = 1000,
    dividerSnap = null,
    headerSnap = false,
    debug = false
}) {
    const store = useStore();

    // Stable Three.js objects — never recreated across renders.
    const [raycaster] = useState(() => {
        const r = new Raycaster();
        r.layers.enable(31);
        return r;
    });

    // Single mutable state bag — mutations do NOT trigger React re-renders.
    const [s] = useState(() => ({
        enabled: true,
        hoverEnabled: true,
        hover: null,
        click: null,
        multiple: [],
        index: null,
        lastIndex: null,
        mouse: new Vector2(-1, -1),
        delta: new Vector2(),
        coords: new Vector2(-1, -1),
        lastTime: 0,
        lastMouse: new Vector2(),
        lastCursor: '',
        width: 0,
        height: 0,
        dpr: 1,
        halfScreen: new Vector2(),
        windowSnapMarginTop: 30,
        windowSnapMarginLeft: 30,
        windowSnapTop: headerSnap ? 29 : 0,
        openColor: null,
        isDragging: false,
        lastRaycast: 0,
        raycastInterval: 1 / 10
    }));

    const registry = useRef({ objects: [], points: [] });
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    // Throttled pointer-move is rebuilt inside useEffect; stored in ref so
    // useFrame can call the latest version.
    const pmoveRef = useRef(null);

    // Lazy canvas-context getter.  Point3D instances call this once after
    // mount so the canvas element has time to be committed to the DOM.
    const getCanvasCtx = useCallback(() => {
        if (!ctxRef.current && canvasRef.current) {
            ctxRef.current = canvasRef.current.getContext('2d');
        }
        return ctxRef.current;
    }, []);

    // --- Registry helpers ---

    const setIndexes = useCallback(() => {
        registry.current.points.forEach((p, i) => p._setIndex(i));
    }, []);

    const setCursor = useCallback(cursor => {
        const c = cursor ?? '';
        const ui = registry.current.points.find(p => p._lastCursor);
        const next = (!c && ui) ? ui._lastCursor : c;
        if (next !== s.lastCursor) {
            s.lastCursor = next;
            document.documentElement.style.cursor = next;
        }
    }, [s]);

    const getSelected = useCallback(
        () => registry.current.points.filter(p => p._selected),
        []
    );

    const getMoved = useCallback(
        () => registry.current.points.filter(p => p._pointIsMove),
        []
    );

    const getSnapped = useCallback(
        () => registry.current.points.filter(p => p._snapped),
        []
    );

    const getSnappedSorted = useCallback(
        () => getSnapped().sort((a, b) => a._pointOriginPositionX - b._pointOriginPositionX),
        [getSnapped]
    );

    const animateOutAll = useCallback(() => {
        registry.current.points.forEach(p => {
            if (p._isMultiple) {
                p._onClick();
            } else if (p === s.hover && p._pointIsOpen) {
                p._onClick();
            } else if (p._animatedIn) {
                p._animateOut(true);
                p._deactivate();
            }
        });

        const selected = getSelected();
        if (!selected.length && s.hover) {
            s.hover._onHover({ type: 'out' });
            s.hover = null;
            setCursor();
        }
    }, [getSelected, s, setCursor]);

    const register = useCallback(pointApi => {
        registry.current.objects.push(pointApi._trackerMesh);
        registry.current.points.push(pointApi);
        setIndexes();
    }, [setIndexes]);

    const unregister = useCallback(pointApi => {
        const { objects, points } = registry.current;
        const i = points.indexOf(pointApi);
        if (~i) {
            objects.splice(i, 1);
            points.splice(i, 1);
        }
        if (pointApi === s.hover) {
            s.hover._onHover({ type: 'out' });
            s.hover = null;
            setCursor();
        }
        setIndexes();
    }, [s, setCursor, setIndexes]);

    // --- Canvas / resize ---

    useEffect(() => {
        const onResize = () => {
            const w = document.documentElement.clientWidth;
            const h = document.documentElement.clientHeight;
            s.width = w;
            s.height = h;
            s.dpr = window.devicePixelRatio;
            s.halfScreen.set(w / 2, h / 2);

            if (canvasRef.current) {
                canvasRef.current.width = Math.round(w * s.dpr);
                canvasRef.current.height = Math.round(h * s.dpr);
                canvasRef.current.style.width = `${w}px`;
                canvasRef.current.style.height = `${h}px`;
                if (ctxRef.current) ctxRef.current.scale(s.dpr, s.dpr);
            }

            s.windowSnapMarginTop = w < breakpoint ? 20 : 30;
            s.windowSnapMarginLeft = w < breakpoint ? 20 : 30;

            if (dividerSnap) {
                const cs = getComputedStyle(dividerSnap);
                s.windowSnapMarginLeft += parseFloat(cs.left) || 0;
            }

            getSnappedSorted().forEach((p, i) => {
                if (i !== 0) {
                    const prev = getSnappedSorted()[i - 1];
                    const gap = p._trackerLocked ? 48 : 20;
                    p._setPointOriginX(prev._pointOriginPositionX + prev._pointBoundsWidth + gap);
                }
                p._snap();
            });

            getMoved().forEach(p => p._snap());
        };

        window.addEventListener('resize', onResize);
        onResize();

        return () => window.removeEventListener('resize', onResize);
    }, [breakpoint, dividerSnap, getMoved, getSnappedSorted, s]);

    // --- Pointer / keyboard events ---

    useEffect(() => {
        const onPointerMove = e => {
            if (!s.enabled) return;

            if (e) {
                s.mouse.set(e.clientX, e.clientY);
                s.coords.set(
                    (e.clientX / s.width) * 2 - 1,
                    1 - (e.clientY / s.height) * 2
                );
            }

            // Always read the latest camera from the store so setCamera() works.
            const { camera } = store.getState();
            const { objects, points } = registry.current;
            const hit0 = document.elementFromPoint(s.mouse.x, s.mouse.y);

            if (hit0 instanceof HTMLCanvasElement) {
                raycaster.setFromCamera(s.coords, camera);
                const hit = raycaster.intersectObjects(objects)[0];

                if (hit) {
                    s.index = hit.instanceId !== undefined ? hit.instanceId : hit.index;
                    const obj = points[objects.indexOf(hit.object)];

                    if (!s.hover || s.index !== s.lastIndex) {
                        s.lastIndex = s.index;
                        s.hover = obj;
                        obj._onHover({ type: 'over' });
                        setCursor('pointer');
                    } else if (s.hover !== obj) {
                        s.hover._onHover({ type: 'out' });
                        s.hover = obj;
                        obj._onHover({ type: 'over' });
                        setCursor('pointer');
                    }
                } else if (s.hover) {
                    s.hover._onHover({ type: 'out' });
                    s.hover = null;
                    setCursor();
                }
            } else if (s.hover) {
                s.hover._onHover({ type: 'out' });
                s.hover = null;
                setCursor();
            }

            s.delta.subVectors(s.mouse, s.lastMouse);
        };

        pmoveRef.current = onPointerMove;

        const onPointerDown = e => {
            if (!s.enabled) return;
            s.lastTime = performance.now();
            s.lastMouse.set(e.clientX, e.clientY);
            onPointerMove(e);
            if (s.hover) s.click = s.hover;
        };

        const onPointerUp = e => {
            if (!s.enabled) return;
            if (performance.now() - s.lastTime > 250 || s.delta.length() > 50) {
                s.click = null;
                return;
            }

            const cursorHolder = registry.current.points.find(p => p._lastCursor);

            if (s.click && s.click === s.hover) {
                if (!e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
                    registry.current.points.forEach(p => {
                        if (p !== s.click && p._animatedIn) {
                            p._animateOut(true);
                            p._deactivate();
                        }
                    });
                }
                s.click._onClick(e.shiftKey);
            } else if (s.openColor && !s.openColor.element?.contains(e.target)) {
                Stage.events.emit('color_picker', { open: false });
            } else if (cursorHolder?._graphOnPointerUp) {
                cursorHolder._graphOnPointerUp();
            } else if (document.elementFromPoint(s.mouse.x, s.mouse.y) instanceof HTMLCanvasElement) {
                animateOutAll();
            }

            s.click = null;
        };

        const onKeyUp = e => {
            if (e.ctrlKey) return;

            if (e.keyCode >= 49 && e.keyCode <= 57) {
                const sel = registry.current.points[e.keyCode - 49];
                if (sel) {
                    if (!e.shiftKey && !e.altKey && !e.metaKey) {
                        registry.current.points.forEach(p => {
                            if (p !== sel && p._animatedIn) {
                                p._animateOut(true);
                                p._deactivate();
                            }
                        });
                    }
                    sel._onHover({ type: 'over' });
                    sel._onClick(e.shiftKey);
                } else {
                    animateOutAll();
                }
            } else if (e.keyCode === 27 && !s.isDragging) {
                animateOutAll();
            }
        };

        const onColorPicker = ({ open, target }) => { s.openColor = open ? target : null; };
        const onInvert = () => registry.current.points.forEach(p => p._theme?.());
        const onThumbnailDragging = ({ dragging }) => { s.isDragging = dragging; };

        Stage.events.on('color_picker', onColorPicker);
        Stage.events.on('invert', onInvert);
        Stage.events.on('thumbnail_dragging', onThumbnailDragging);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);

        return () => {
            Stage.events.off('color_picker', onColorPicker);
            Stage.events.off('invert', onInvert);
            Stage.events.off('thumbnail_dragging', onThumbnailDragging);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };
    }, [animateOutAll, raycaster, s, setCursor, store]);

    // --- Frame loop: clear canvas → update all instances → throttled raycast ---

    useFrame(({ clock }) => {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        registry.current.points.forEach(p => p._update());

        const t = clock.elapsedTime;
        if (!navigator.maxTouchPoints && t - s.lastRaycast > s.raycastInterval) {
            pmoveRef.current?.();
            s.lastRaycast = t;
        }
    });

    // --- Context value -------------------------------------------------------

    const ctxValue = useMemo(() => ({
        animateOutAll,
        container,
        debug,
        getCanvasCtx,
        getMoved,
        getSelected,
        getSnapped,
        getSnappedSorted,
        register,
        setCursor,
        setIndexes,
        state: s,
        unregister
    }), [animateOutAll, container, debug, getCanvasCtx, getMoved, getSelected, getSnapped, getSnappedSorted, register, s, setCursor, setIndexes, unregister]);

    return (
        <>
            <Point3DContext value={ctxValue}>
                {children}
            </Point3DContext>
            {container && createPortal(
                <canvas
                    ref={canvasRef}
                    style={{ left: 0, pointerEvents: 'none', position: 'absolute', top: 0 }}
                />,
                container
            )}
        </>
    );
}
