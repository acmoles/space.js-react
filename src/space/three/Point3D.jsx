/**
 * @author Space.js React
 *
 * Per-object R3F component that tracks a Three.js object and renders a 2-D
 * overlay: reticle, connecting line, label (Point) and tracker corners.
 *
 * Must be a direct or indirect descendant of `<Points3D>` so that the shared
 * raycaster, canvas and event system are available via `usePoint3DContext()`.
 *
 * @example
 * <Points3D container={overlayEl}>
 *   <Point3D object={serverMesh} name="Server-1" type="linux" ref={p3dRef} />
 * </Points3D>
 */

import { createPortal } from 'react-dom';
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { MeshBasicMaterial, Vector2 } from 'three';

import { getBoundingSphereWorld, getScreenSpaceBox } from '@lib/three.js';
import { Stage } from '@lib/three.js';
import { clearTween, delayedCall } from '@lib/tween/Tween.js';

import { LineCanvas, Point, ReticleCanvas, Tracker } from '../components/indicators/index.js';
import { RadialGraphTracker } from '../components/radial/index.js';

import { usePoint3DContext } from './Point3DContext.js';

/**
 * Tracks a Three.js object and renders a 2-D UI overlay.
 *
 * @param {object}       props
 * @param {import('three').Object3D} props.object    Three.js object to track.
 * @param {string}       [props.name='']     Label name.
 * @param {string}       [props.type='']     Label sub-title / type.
 * @param {object|null}  [props.graph]       RadialGraphContainer instance.
 * @param {boolean}      [props.noLine]      Suppress the connecting line.
 * @param {boolean}      [props.noPoint]     Suppress the label overlay.
 * @param {boolean}      [props.noTracker]   Suppress tracker corners.
 * @param {function}     [props.onHover]     Called with `{ type, index }`.
 * @param {function}     [props.onClick]     Called with `{ selected, index }`.
 * @param {object}       [props.ref]         Imperative handle (animateIn, etc.).
 */
export function Point3D({
    object,
    name = '',
    type = '',
    graph = null,
    noLine = false,
    noPoint = false,
    noTracker = false,
    onHover: onHoverProp = null,
    onClick: onClickProp = null,
    ref
}) {
    const ctx = usePoint3DContext();

    // Prop refs — always hold the latest prop so stable api closures stay fresh.
    const graphRef = useRef(graph);
    const namePropRef = useRef(name);
    const typePropRef = useRef(type);
    const onHoverPropRef = useRef(onHoverProp);
    const onClickPropRef = useRef(onClickProp);

    useEffect(() => { graphRef.current = graph; }, [graph]);
    useEffect(() => { onHoverPropRef.current = onHoverProp; }, [onHoverProp]);
    useEffect(() => { onClickPropRef.current = onClickProp; }, [onClickProp]);
    useEffect(() => { namePropRef.current = name; }, [name]);
    useEffect(() => { typePropRef.current = type; }, [type]);

    // Context ref — lets stable api closures see the latest ctx value.
    const ctxRef = useRef(ctx);
    useEffect(() => { ctxRef.current = ctx; }, [ctx]);

    // Scene refs
    const groupRef = useRef(null);
    const sphereRef = useRef(null);

    // Overlay refs
    const cameraRef = useRef(null);
    const graphTrackerRef = useRef(null);
    const lineRef = useRef(null);
    const overlayDivRef = useRef(null);
    const pointRef = useRef(null);
    const reticleRef = useRef(null);
    const trackerContainerRef = useRef(null);
    const trackerRef = useRef(null);

    // Mutable animation / selection flags (no React state — avoid re-renders)
    const animatedInRef = useRef(false);
    const indexRef = useRef(0);
    const isMultipleRef = useRef(false);
    const originPositionXRef = useRef(0);
    const selectedRef = useRef(false);
    const snappedRef = useRef(false);
    const timeoutRef = useRef(null);

    // Per-frame scratch vectors (avoid allocations)
    const posRef = useRef({ centerX: 0, centerY: 0, halfHeight: 6, halfWidth: 6, height: 12, width: 12 });
    const vRef = useRef(new Vector2());

    // React state — only what must drive re-renders of child props.
    // Name and type are initialised from props; _setData() updates them
    // imperatively (from callbacks, not effect bodies — no cascading render).
    const [nameState, setNameState] = useState(name);
    const [targetNumbers, setTargetNumbers] = useState([1]);
    const [typeState, setTypeState] = useState(type);

    // Stable Three.js objects (created once, disposed on unmount)
    const [sphereRadius] = useState(() => {
        if (object.isMesh && !object.isInstancedMesh) {
            return getBoundingSphereWorld(object).radius;
        }
        return 1;
    });

    const [sphereMaterial] = useState(() => new MeshBasicMaterial({ visible: false }));

    useEffect(() => () => sphereMaterial.dispose(), [sphereMaterial]);

    // Sphere layer — must be on layer 31 so the shared raycaster hits it.
    useEffect(() => {
        if (sphereRef.current) {
            sphereRef.current.layers.set(31);
        }
    }, []);

    // Canvas context — wire imperatively so no setState cascade is needed.
    // Both effects re-run when ctx (the context value) changes, which happens
    // once the Points3D canvas is committed to the container portal.
    useEffect(() => {
        const c = ctx.getCanvasCtx();
        if (!c) return;
        reticleRef.current?.setContext(c);
        lineRef.current?.setContext(c);
    }, [ctx]);

    // Graph element lifecycle — append/remove graph.element from our overlay div.
    useEffect(() => {
        const g = graphRef.current;
        const el = overlayDivRef.current; // capture before async cleanup
        if (!g || !el) return undefined;

        const c = ctx.getCanvasCtx();
        if (!c) return undefined;

        const handleCursor = ({ cursor }) => {
            ctxRef.current.setCursor(cursor);
        };

        g.events.on('cursor', handleCursor);
        g.setContext(c);
        el.appendChild(g.element);

        return () => {
            g.events.off('cursor', handleCursor);
            if (el?.contains(g.element)) {
                el.removeChild(g.element);
            }
        };
    }, [ctx]); // graph is stable — accessed via graphRef

    // --- Stable API object registered with Points3D ---------------------------
    const apiRef = useRef(null);

    useEffect(() => {
        const animateIn = reverse => {
            const g = graphRef.current;
            if (!animatedInRef.current) {
                if (g) {
                    g.animateIn();
                    trackerRef.current?.open();
                } else {
                    reticleRef.current?.animateIn();
                    if (!noLine) lineRef.current?.animateIn(reverse);
                }
                animatedInRef.current = true;
            } else if (g?.animateLabelsIn) {
                g.animateLabelsIn();
            }
            if (pointRef.current && !pointRef.current.animatedIn) {
                pointRef.current.animateIn();
            }
        };

        const animateOut = (fast, cb) => {
            const g = graphRef.current;
            if (g) {
                if (fast) {
                    g.animateOut();
                    trackerRef.current?.close();
                    trackerRef.current?.animateOut();
                    animatedInRef.current = false;
                } else if (g.animateLabelsOut) {
                    g.animateLabelsOut();
                }
                pointRef.current?.animateOut(true);
            } else {
                reticleRef.current?.animateOut();
                if (!noLine) lineRef.current?.animateOut(fast, cb);
                trackerRef.current?.animateOut();
                pointRef.current?.animateOut();
                animatedInRef.current = false;
            }
        };

        const deactivate = () => {
            isMultipleRef.current = false;
            selectedRef.current = false;
            const g = graphRef.current;
            if (!g) {
                reticleRef.current?.animateIn();
                if (!noLine) lineRef.current?.animateIn(true);
            }
            trackerRef.current?.animateOut();
            if (pointRef.current) {
                pointRef.current.enable?.();
                pointRef.current.close(true);
                pointRef.current.activate?.();
            }
        };

        const setInitialPosition = () => {
            if (pointRef.current) {
                pointRef.current.position.x = pointRef.current.target.x;
                pointRef.current.position.y = pointRef.current.target.y;
            }
        };

        const togglePoint = (show, multiple) => {
            const c = ctxRef.current;
            if (show) {
                if (!graphRef.current) {
                    reticleRef.current?.animateOut();
                    if (!noLine) lineRef.current?.animateOut(true);
                }
                trackerRef.current?.animateIn?.();

                const selected = c.getSelected();

                if (multiple && selected.length > 1) {
                    if (!c.state.current.multiple.length) {
                        const other = selected.find(u => u !== api);
                        if (other) c.state.current.multiple.push(other);
                    }
                    c.state.current.multiple.push(api);
                    if (!noLine) lineRef.current?.deactivate?.();
                    pointRef.current?.deactivate?.();

                    // Update combined labels
                    if (c.state.current.multiple.length > 1) {
                        const first = c.state.current.multiple[0];
                        const count = c.state.current.multiple.length;
                        first._setData?.({ name: `${count}\u00a0Objects`, type: '' });
                        first._setTargetNumbers?.(c.state.current.multiple.map((_, i) => i + 1));
                        first._setMultiple(true);
                    }
                } else {
                    pointRef.current?.open?.();
                }
            } else {
                if (!graphRef.current) {
                    reticleRef.current?.animateIn();
                    if (!noLine) lineRef.current?.animateIn(true);
                }
                trackerRef.current?.animateOut();

                if (isMultipleRef.current) {
                    c.state.current.multiple.forEach(u => {
                        if (u !== api) {
                            u._animateOut(true);
                            u._deactivate();
                        }
                    });
                    c.state.current.multiple.length = 0;
                    isMultipleRef.current = false;
                    setNameState(namePropRef.current);
                    setTypeState(typePropRef.current);
                    setTargetNumbers([indexRef.current + 1]);
                }

                if (pointRef.current) {
                    pointRef.current.enable?.();
                    pointRef.current.close();
                    pointRef.current.activate?.();
                }
            }
        };

        const api = {
            // Getters for Points3D internal use
            get _animatedIn() { return animatedInRef.current; },
            get _graphOnPointerUp() {
                const g = graphRef.current;
                return g ? () => g.onPointerUp?.() : null;
            },
            get _isMultiple() { return isMultipleRef.current; },
            get _lastCursor() { return ''; }, // set via graph cursor events
            get _pointBoundsWidth() { return pointRef.current?.bounds?.width ?? 0; },
            get _pointIsMove() { return false; }, // Point.isMove not exposed
            get _pointIsOpen() { return pointRef.current?.isOpen ?? false; },
            get _pointOriginPositionX() { return originPositionXRef.current; },
            get _selected() { return selectedRef.current; },
            get _snapped() { return snappedRef.current; },
            get _trackerLocked() { return trackerRef.current?.locked ?? false; },
            get _trackerMesh() { return sphereRef.current; },

            // Internal accessors used during multiple-selection label combining
            get _type() { return typePropRef.current; },
            _setData: data => {
                if (data.name !== undefined) setNameState(data.name);
                if (data.type !== undefined) setTypeState(data.type);
            },
            _setMultiple: v => { isMultipleRef.current = v; },
            _setTargetNumbers: nums => setTargetNumbers(nums),

            // Called by Points3D raycaster
            _onHover: ({ isPoint, type: hoverType }) => {
                const c = ctxRef.current;
                if (!c.state.current.hoverEnabled && !isPoint) return;
                clearTween(timeoutRef.current);

                if (selectedRef.current) {
                    if (hoverType === 'over') trackerRef.current?.show();
                    else trackerRef.current?.hide();
                    if (isPoint && isMultipleRef.current) {
                        c.state.current.multiple.forEach(u => {
                            if (u !== api) u._onHover({ isPoint, type: hoverType });
                        });
                    }
                    return;
                }

                Stage.events.emit('hover', { index: c.state.current.index, target: api, type: hoverType });
                onHoverPropRef.current?.({ index: c.state.current.index, type: hoverType });

                if (hoverType === 'over') {
                    if (!animatedInRef.current) setInitialPosition();
                    animateIn();
                } else {
                    timeoutRef.current = delayedCall(2000, () => animateOut());
                }
            },

            _onClick: multiple => {
                clearTween(timeoutRef.current);
                selectedRef.current = !selectedRef.current;

                if (selectedRef.current) togglePoint(true, multiple);
                else togglePoint(false, multiple);

                const c = ctxRef.current;
                const selected = c.getSelected();
                Stage.events.emit('change', { index: c.state.current.index, selected, target: api });
                onClickPropRef.current?.({ index: c.state.current.index, selected });
            },

            _animateOut: (fast, cb) => animateOut(fast, cb),
            _deactivate: () => deactivate(),
            _setIndex: i => { indexRef.current = i; },

            _update: () => {
                const cam = cameraRef.current;
                const c = ctxRef.current;
                if (!cam || !sphereRef.current || !c) return;

                const hs = c.state.current.halfScreen;
                if (!hs.x) return;

                // Project sphere to screen space
                const box = getScreenSpaceBox(sphereRef.current, cam);
                const pos = posRef.current;
                const center = vRef.current;

                box.getCenter(center).multiply(hs);
                pos.centerX = hs.x + center.x;
                pos.centerY = hs.y - center.y;

                box.getSize(center).multiply(hs);
                pos.width = Math.max(12, Math.round(center.x));
                pos.height = Math.max(12, Math.round(center.y));
                pos.halfWidth = Math.round(pos.width / 2);
                pos.halfHeight = Math.round(pos.height / 2);

                const g = graphRef.current;
                if (g) {
                    const sz = Math.min(pos.width, pos.height);
                    g.position?.set(pos.centerX, pos.centerY);
                    g.setSize?.(sz, sz);
                    if (graphTrackerRef.current && g.graphHeight !== undefined) {
                        graphTrackerRef.current.setGraphHeight(-g.graphHeight * 2);
                    }
                    if (pointRef.current && g.middle !== undefined) {
                        pointRef.current.target.x = pos.centerX + (g.halfWidth ?? 0) - 38;
                        pointRef.current.target.y = pos.centerY + g.middle * Math.sin(g.startAngle ?? 0);
                        pointRef.current.update();
                    }
                    g.update?.();
                } else {
                    if (reticleRef.current) {
                        reticleRef.current.position.x = pos.centerX;
                        reticleRef.current.position.y = pos.centerY;
                        reticleRef.current.update();
                    }
                    if (pointRef.current) {
                        pointRef.current.target.x = pos.centerX + pos.halfWidth;
                        pointRef.current.target.y = pos.centerY - pos.halfHeight;
                        pointRef.current.update();
                    }
                    if (!noLine && lineRef.current && reticleRef.current && pointRef.current) {
                        const p0 = reticleRef.current.position;
                        const p1 = pointRef.current.position;
                        const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
                        vRef.current.set(p0.x + 3 * Math.cos(angle), p0.y + 3 * Math.sin(angle));
                        lineRef.current.setStartPoint(vRef.current);
                        lineRef.current.setEndPoint(p1);
                        lineRef.current.update();
                    }
                }

                // Tracker container — sets size/position so Tracker fills it.
                if (trackerContainerRef.current) {
                    const el = trackerContainerRef.current;
                    el.style.left = `${pos.centerX}px`;
                    el.style.top = `${pos.centerY}px`;
                    el.style.width = `${pos.width}px`;
                    el.style.height = `${pos.height}px`;
                    el.style.marginLeft = `-${pos.halfWidth}px`;
                    el.style.marginTop = `-${pos.halfHeight}px`;
                }
                trackerRef.current?.update();
            },

            _theme: () => {
                if (!graphRef.current) {
                    reticleRef.current?.theme?.();
                    if (!noLine) lineRef.current?.theme?.();
                }
            },

            _snap: () => {
                // Full snap-during-drag requires Point.originPosition (not exposed).
                // On resize, reset the label target to the projected position.
                if (!animatedInRef.current || !pointRef.current) return;
                const pos = posRef.current;
                pointRef.current.target.x = pos.centerX + pos.halfWidth;
                pointRef.current.target.y = pos.centerY - pos.halfHeight;
                pointRef.current.update?.();
            },

            _setPointOriginX: x => { originPositionXRef.current = x; }
        };

        apiRef.current = api;

        // Lazy camera — the R3F store camera is not available here; it will be
        // set on the first `_update()` frame if not provided via setCamera().
        const storeCamera = ctxRef.current.state?.current?.camera;
        if (storeCamera) cameraRef.current = storeCamera;

        ctxRef.current.register(api);

        return () => ctxRef.current.unregister(api);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Stable API — prop changes propagate via *Ref refs

    // --- Public handle --------------------------------------------------------
    useImperativeHandle(ref, () => ({
        get animatedIn() { return animatedInRef.current; },
        get isMultiple() { return isMultipleRef.current; },
        get mesh() { return sphereRef.current; },
        get point() { return pointRef.current; },
        get selected() { return selectedRef.current; },
        animateIn: reverse => apiRef.current?._onHover({ type: 'over', reverse }),
        animateOut: (fast, cb) => apiRef.current?._animateOut(fast, cb),
        deactivate: () => apiRef.current?._deactivate(),
        onClick: multiple => apiRef.current?._onClick(multiple),
        onHover: e => apiRef.current?._onHover(e),
        setCamera: cam => { cameraRef.current = cam; },
        setData: data => apiRef.current?._setData(data),
        setIndex: i => apiRef.current?._setIndex(i),
        setInitialPosition: () => {
            if (pointRef.current) {
                pointRef.current.position.x = pointRef.current.target.x;
                pointRef.current.position.y = pointRef.current.target.y;
            }
        }
    }), []);

    // Stable callbacks passed down to Point so it never sees a new function ref.
    const handlePointHover = useCallback(({ isPoint, type: hoverType }) => {
        apiRef.current?._onHover({ isPoint, type: hoverType });
    }, []);

    const handleUiHide = useCallback(() => trackerRef.current?.hide(), []);
    const handleUiLock = useCallback(() => trackerRef.current?.lock(), []);
    const handleUiShow = useCallback(() => trackerRef.current?.show(), []);
    const handleUiUnlock = useCallback(() => trackerRef.current?.unlock(), []);
    // snapFn: Point calls this during drag but Point.originPosition is not
    // exposed, so we cannot implement full snap — see limitations in index.js.
    const snapFn = useCallback(() => {}, []);

    const isInstanced = !!object.isInstancedMesh;
    const isPointCloud = !!object.isPoints;

    return (
        <>
            <group ref={groupRef}>
                <mesh ref={sphereRef} visible={false}>
                    <sphereGeometry args={[sphereRadius, 8, 6]} />
                    <primitive attach="material" object={sphereMaterial} />
                </mesh>
            </group>
            {ctx?.container && createPortal(
                <div ref={overlayDivRef}>
                    {!graph && (
                        <ReticleCanvas ref={reticleRef} />
                    )}
                    {!graph && !noLine && (
                        <LineCanvas ref={lineRef} />
                    )}
                    {!noTracker && (
                        graph
                            ? <RadialGraphTracker ref={graphTrackerRef} />
                            : (
                                <div
                                    ref={trackerContainerRef}
                                    style={{ pointerEvents: 'none', position: 'absolute' }}
                                >
                                    <Tracker
                                        noCorners={isInstanced || isPointCloud}
                                        ref={trackerRef}
                                        style={{ height: '100%', left: 0, position: 'absolute', top: 0, width: '100%' }}
                                    />
                                </div>
                            )
                    )}
                    {!noPoint && (
                        <Point
                            data={{ name: nameState, type: typeState }}
                            onHover={handlePointHover}
                            onUiHide={handleUiHide}
                            onUiLock={handleUiLock}
                            onUiShow={handleUiShow}
                            onUiUnlock={handleUiUnlock}
                            ref={pointRef}
                            snapFn={snapFn}
                            targetNumbers={targetNumbers}
                            trackerRef={trackerRef}
                        />
                    )}
                </div>,
                ctx.container
            )}
        </>
    );
}
