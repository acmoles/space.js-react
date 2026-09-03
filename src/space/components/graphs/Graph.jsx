import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';

import { Color } from '@lib/math/Color.js';
import { Vector2 } from '@lib/math/Vector2.js';
import { SVGPathProperties } from '@lib/path/SVGPathProperties.js';
import { Easing } from '@lib/tween/Easing.js';
import { clearTween, delayedCall, tween } from '@lib/tween/Tween.js';
import { clamp } from '@lib/utils/Utils.js';

import { useMotion, useTicker } from '../../motion/index.js';

import { GraphMarker } from './GraphMarker.jsx';

import './GraphLabel.css';
import './GraphMarker.css';
import './Graph.css';

// ─── Module-level pure helpers ────────────────────────────────────────────────

const COLOR_STEP = 1 / 3 / 5; // 5 interpolation steps per colour pair

/**
 * Builds a 16-stop linear gradient that matches the original's colour range.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x0
 * @param {number} y0
 * @param {number} x1
 * @param {number} y1
 * @param {Color[]} colorRange  Four `Color` instances.
 * @param {Color}   colorBuf   Scratch `Color` for lerp.
 * @param {number}  alpha      Global alpha baked into each stop.
 */
function buildGradient(ctx, x0, y0, x1, y1, colorRange, colorBuf, alpha) {
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    const toRGBA = c => `rgb(${Math.round(c.r * 255)} ${Math.round(c.g * 255)} ${Math.round(c.b * 255)} / ${alpha})`;
    let offset = 0;

    for (let i = 0; i < 3; i++) {
        for (let t = 0; t < 5; t++) {
            gradient.addColorStop(offset, toRGBA(colorBuf.lerpColors(colorRange[i], colorRange[i + 1], Easing.easeInOutSine(t / 5))));
            offset += COLOR_STEP;
        }
    }

    gradient.addColorStop(offset, toRGBA(colorRange[3]));

    return gradient;
}

/**
 * Re-sizes a canvas element to the given logical dimensions at dpr=2 (always
 * 2, matching the original library) and rescales the context.
 */
function resizeCanvas(canvas, w, h) {
    const dpr = 2;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.getContext('2d').scale(dpr, dpr);
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Line graph with optional hover scrub, marker pins, and ghost overlay.
 *
 * High-frequency per-frame value pushes (`graph.update(newValue)`) go through
 * the imperative handle rather than props to avoid triggering React re-renders
 * on every tick. Setting the full data array is done via the `value` prop.
 *
 * @param {object}    props
 * @param {number[]}  [props.value]              Initial data array.
 * @param {number[]}  [props.ghost]              Ghost (shadow) data array.
 * @param {number}    [props.width=300]
 * @param {number}    [props.height=60]
 * @param {number}    [props.resolution=80]      Array length when `value` is not an array.
 * @param {number}    [props.precision=0]        Decimal places in the info label.
 * @param {number}    [props.lookupPrecision=0]  SVG lookup table size (0 = skip lookup).
 * @param {Array[]}   [props.markers=[]]         `[[x, name], …]` initial markers.
 * @param {number}    [props.range=1]            Maximum value (sets y-axis scale).
 * @param {string}    [props.suffix='']          Appended to the info value string.
 * @param {function}  [props.format]             `value => string` formatter.
 * @param {boolean}   [props.noHover=false]
 * @param {boolean}   [props.noMarker=false]
 * @param {boolean}   [props.noMarkerDrag=false]
 * @param {boolean}   [props.noGradient=false]
 * @param {function}  [props.onMarkerAdd]        `({ item, target }) => void`
 * @param {function}  [props.onMarkerRemove]     `({ item, target }) => void`
 * @param {function}  [props.onMarkerClick]      `({ target }) => void`
 * @param {object}    [props.ref]
 *   Exposes `animateIn(fast?)`, `animateOut()`, and `update(value?)`.
 *   Use `update` for high-frequency per-frame pushes; set `value` prop for
 *   full-array replacements.
 * @example
 * const graphRef = useRef(null);
 *
 * useEffect(() => {
 *     graphRef.current.animateIn();
 * }, []);
 *
 * // Push a live value each frame:
 * useTicker(() => {
 *     graphRef.current.update(Math.random());
 * });
 *
 * <Graph ref={graphRef} value={[]} width={300} height={60} lookupPrecision={100} />
 */
export function Graph({
    value,
    ghost,
    width = 300,
    height = 60,
    resolution = 80,
    precision = 0,
    lookupPrecision = 0,
    markers: markersProp = [],
    range = 1,
    suffix = '',
    format,
    noHover = false,
    noMarker = false,
    noMarkerDrag = false,
    noGradient = false,
    onMarkerAdd,
    onMarkerRemove,
    onMarkerClick,
    ref
}) {
    const formatFn = format ?? (v => `${v}${suffix}`);

    // ── DOM refs ─────────────────────────────────────────────────────────────
    const rootRef = useRef(null);
    const canvasRef = useRef(null);
    const infoRef = useRef(null);

    // ── Canvas animation state ────────────────────────────────────────────────
    // alpha/yMultiplier/progress are plain JS objects that the tween engine
    // writes to directly; React never observes them.
    const motion = useMotion({ alpha: 0, yMultiplier: 0, progress: 0 });
    const handleMotion = useMotion({ alpha: 0 });

    // ── Color / gradient state ────────────────────────────────────────────────
    const lineColorsRef = useRef({ graph: '', bottom: '', handle: '' });
    const colorRangeRef = useRef(/** @type {Color[]} */([]));
    const colorBufRef = useRef(new Color());
    const strokeStyleRef = useRef(null);
    const fillStyleRef = useRef(null);

    // ── Data ──────────────────────────────────────────────────────────────────
    const arrayRef = useRef(/** @type {number[]} */([]));
    const ghostArrayRef = useRef(/** @type {number[]} */([]));
    const hasGhostRef = useRef(ghost !== undefined);
    const pathDataRef = useRef('');
    const lookupRef = useRef(/** @type {object[]} */([]));
    const rangeRef = useRef(range);
    const rangeHeightRef = useRef((height - 5) / range);

    // ── Interaction ───────────────────────────────────────────────────────────
    const mouseRef = useRef(new Vector2());
    const deltaRef = useRef(new Vector2());
    const lastTimeRef = useRef(0);
    const lastMouseRef = useRef(new Vector2());
    const mouseXRef = useRef(0);
    const boundsRef = useRef(/** @type {DOMRect|null} */(null));
    const mobileOffset = navigator.maxTouchPoints ? -50 : 0;
    const isDraggingRef = useRef(false);
    const isDraggingAwayRef = useRef(false);
    const animatedInRef = useRef(false);
    const hoveredInRef = useRef(false);
    const needsUpdateRef = useRef(false);
    const graphNeedsUpdateRef = useRef(false);
    const hoverTimeoutRef = useRef(null);
    const infoOpacityRef = useRef(0);

    // ── Marker state ──────────────────────────────────────────────────────────
    // markerDataRef drives the canvas draw loop. markerVersion increments to
    // trigger React re-renders when the marker list changes.
    const markerDataRef = useRef(/** @type {object[]} */([]));
    const [markerVersion, setMarkerVersion] = useState(0);

    // ─── Canvas initialisation ────────────────────────────────────────────────

    const rebuildGradients = useCallback(() => {
        const canvas = canvasRef.current;

        if (!canvas || colorRangeRef.current.length === 0) return;

        const ctx = canvas.getContext('2d');

        strokeStyleRef.current = buildGradient(ctx, 0, height, 0, 0, colorRangeRef.current, colorBufRef.current, 1);
        fillStyleRef.current = buildGradient(ctx, 0, height, 0, 0, colorRangeRef.current, colorBufRef.current, 0.07);
    }, [height]);

    // Read CSS custom properties and size the canvas once on mount.
    useLayoutEffect(() => {
        const rs = getComputedStyle(document.documentElement);

        lineColorsRef.current = {
            graph: rs.getPropertyValue('--ui-color-line').trim(),
            bottom: rs.getPropertyValue('--ui-color-graph-bottom-line').trim(),
            handle: rs.getPropertyValue('--ui-color').trim()
        };

        colorRangeRef.current = [
            new Color(rs.getPropertyValue('--ui-color-range-1').trim()),
            new Color(rs.getPropertyValue('--ui-color-range-2').trim()),
            new Color(rs.getPropertyValue('--ui-color-range-3').trim()),
            new Color(rs.getPropertyValue('--ui-color-range-4').trim())
        ];

        resizeCanvas(canvasRef.current, width, height);
        rebuildGradients();
        rangeHeightRef.current = (height - 5) / rangeRef.current;

        // Initial data
        setRange(range);
        setArray(value);

        if (hasGhostRef.current) {
            setGhostArray(ghost);
        }

        needsUpdateRef.current = true;
        graphNeedsUpdateRef.current = lookupPrecision > 0;

        if (!noMarker && markersProp.length) {
            markersProp.forEach(m => addMarker(m, true));
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Re-size canvas when dimensions change.
    useEffect(() => {
        if (colorRangeRef.current.length === 0) return;

        resizeCanvas(canvasRef.current, width, height);
        rebuildGradients();
        rangeHeightRef.current = (height - 5) / rangeRef.current;
        needsUpdateRef.current = true;

        if (lookupPrecision > 0) {
            graphNeedsUpdateRef.current = true;
        }
    }, [width, height, rebuildGradients, lookupPrecision]);

    // Sync `range` prop.
    useEffect(() => {
        if (colorRangeRef.current.length === 0) return;
        setRange(range);
    }, [range]); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync `value` prop.
    useEffect(() => {
        if (colorRangeRef.current.length === 0) return;
        setArray(value);
    }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync `ghost` prop.
    useEffect(() => {
        if (colorRangeRef.current.length === 0) return;
        setGhostArray(ghost);
    }, [ghost]);
    useLayoutEffect(() => {
        markerDataRef.current.forEach(marker => {
            if (marker.tweenPending) {
                marker.tweenPending = false;
                tween(marker, { multiplier: 1 }, 400, 'easeOutCubic', null, () => {
                    needsUpdateRef.current = true;
                    const h = marker.markerRef.current;

                    if (h?.element) {
                        h.element.style.opacity = marker.multiplier;
                    }
                });
            }
        });
    }, [markerVersion]);

    // ─── Data helpers ─────────────────────────────────────────────────────────

    function setRange(r) {
        rangeRef.current = r;
        rangeHeightRef.current = (height - 5) / r;
        needsUpdateRef.current = true;

        if (lookupPrecision > 0) {
            graphNeedsUpdateRef.current = true;
        }
    }

    function setArray(val) {
        arrayRef.current = Array.isArray(val)
            ? val
            : new Array(resolution).fill(0);

        needsUpdateRef.current = true;

        if (lookupPrecision > 0) {
            graphNeedsUpdateRef.current = true;
        }
    }

    function setGhostArray(val) {
        ghostArrayRef.current = Array.isArray(val)
            ? val
            : new Array(arrayRef.current.length).fill(0);

        needsUpdateRef.current = true;
    }

    // ─── Lookup table ─────────────────────────────────────────────────────────

    function calculateLookup() {
        const props = new SVGPathProperties(pathDataRef.current);
        const len = props.getTotalLength();
        const lookup = [];
        let i = 0;

        while (i <= 1) {
            lookup.push(props.getPointAtLength(i * len));
            i += 1 / lookupPrecision;
        }

        lookupRef.current = lookup;
    }

    function getCurveY(mX) {
        const lookup = lookupRef.current;
        const x = mX * width;
        const approxIndex = Math.floor(mX * lookupPrecision);
        let i = Math.max(1, approxIndex - Math.floor(lookupPrecision / 4));

        for (; i < lookupPrecision; i++) {
            if (lookup[i].x > x) break;
        }

        if (i === lookupPrecision) return lookup[lookupPrecision - 1].y;

        const lower = lookup[i - 1];
        const upper = lookup[i];
        const percent = (x - lower.x) / (upper.x - lower.x);

        return lower.y + (upper.y - lower.y) * percent;
    }

    // ─── Canvas drawing ───────────────────────────────────────────────────────

    function drawPath(ctx, w, h, array, ghost) {
        ctx.globalAlpha = ghost ? 0.35 : motion.values.alpha;

        ctx.lineWidth = 1.5;

        if (noGradient) {
            ctx.strokeStyle = lineColorsRef.current.graph;
        } else {
            ctx.strokeStyle = strokeStyleRef.current;
            ctx.fillStyle = fillStyleRef.current;
            ctx.shadowColor = 'rgb(255 255 255 / 0.2)';
            ctx.shadowBlur = 15;
        }

        ctx.beginPath();

        const p = motion.values;
        const l = array.length;

        for (let i = 0; i < l - 1; i++) {
            const x0 = (i / (l - 1)) * width;
            const x1 = ((i + 1) / (l - 1)) * width;
            const y0 = array[i] * rangeHeightRef.current;
            const y1 = array[i + 1] * rangeHeightRef.current;
            const mx = (x0 + x1) / 2;
            const my = (y0 + y1) / 2;
            const cpx0 = (mx + x0) / 2;
            const cpx1 = (mx + x1) / 2;

            if (i === 0) {
                if (graphNeedsUpdateRef.current && !ghost) {
                    pathDataRef.current = `M ${x0} ${h - y0}`;
                }

                if (p.progress === 1) {
                    ctx.moveTo(x0, h - y0 * p.yMultiplier - 1);
                }
            }

            if (graphNeedsUpdateRef.current && !ghost) {
                pathDataRef.current += ` Q ${cpx0} ${h - y0} ${mx} ${h - my} Q ${cpx1} ${h - y1} ${x1} ${h - y1}`;
            }

            if (p.progress === 1) {
                ctx.quadraticCurveTo(cpx0, h - y0 * p.yMultiplier - 1, mx, h - my * p.yMultiplier - 1);
                ctx.quadraticCurveTo(cpx1, h - y1 * p.yMultiplier - 1, x1, h - y1 * p.yMultiplier - 1);
            }
        }

        if (p.progress < 1) {
            ctx.moveTo(0, h);
            ctx.lineTo(w, h);
        }

        ctx.stroke();

        if (!noGradient && p.progress === 1) {
            ctx.shadowBlur = 0;
            ctx.lineTo(width, height);
            ctx.lineTo(0, height);
            ctx.fill();
        }
    }

    function drawGraph() {
        const p = motion.values;

        if (p.alpha <= 0) return;

        const canvas = canvasRef.current;

        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const w = width * p.progress;
        const h = height - 1;

        ctx.globalAlpha = p.alpha < 0.001 ? 0 : p.alpha;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Bottom line
        ctx.lineWidth = 1;
        ctx.strokeStyle = lineColorsRef.current.bottom;
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(w, h);
        ctx.stroke();

        // Ghost path
        if (ghostArrayRef.current.length) {
            drawPath(ctx, w, h, ghostArrayRef.current, true);
        }

        // Main path
        if (arrayRef.current.length) {
            drawPath(ctx, w, h, arrayRef.current, false);
        }

        // Marker lines
        if (!noMarker) {
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = lineColorsRef.current.graph;

            for (const marker of markerDataRef.current) {
                const x = clamp(marker.x * width, 0.5, width - 0.5);

                ctx.beginPath();
                ctx.moveTo(x, h - 0.5);
                ctx.lineTo(x, h - 0.5 - (h - 0.5) * marker.multiplier * p.yMultiplier);
                ctx.stroke();
            }

            if (!isDraggingAwayRef.current) {
                for (const marker of markerDataRef.current) {
                    const x = clamp(marker.x * width, 0.5, width - 0.5);
                    const h2 = marker.markerRef.current;

                    if (h2?.element) {
                        h2.element.style.left = `${x}px`;
                    }
                }
            }
        }

        // Hover handle
        if (!noHover && !isDraggingAwayRef.current) {
            if (graphNeedsUpdateRef.current) {
                calculateLookup();
                graphNeedsUpdateRef.current = false;
            }

            const arr = arrayRef.current;
            let index = Math.floor(mouseXRef.current * arr.length);

            if (index === arr.length) index = arr.length - 1;

            const val = arr[index];
            const x = clamp(mouseXRef.current * width, 0.5, width - 0.5);
            let y;

            if (lookupPrecision) {
                y = getCurveY(mouseXRef.current) - 1;
            } else {
                y = h - val * rangeHeightRef.current - 1;
            }

            const hp = handleMotion.values;
            ctx.globalAlpha = hp.alpha < 0.001 ? 0 : hp.alpha;
            ctx.lineWidth = 1;
            ctx.strokeStyle = lineColorsRef.current.handle;

            ctx.beginPath();
            ctx.moveTo(x, height);
            ctx.lineTo(x, y + 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.stroke();

            if (animatedInRef.current && infoRef.current) {
                infoRef.current.style.left = `${x}px`;
                infoRef.current.textContent = formatFn(val.toFixed(precision));
            }
        }
    }

    // ─── Ticker ───────────────────────────────────────────────────────────────

    useTicker(() => {
        if (needsUpdateRef.current || hoveredInRef.current || isDraggingRef.current) {
            drawGraph();
            needsUpdateRef.current = false;
        }
    });

    // ─── Hover ────────────────────────────────────────────────────────────────

    function hoverIn() {
        clearTween(handleMotion.values);

        tween(handleMotion.values, { alpha: 1 }, 275, 'easeInOutCubic', null, () => {
            needsUpdateRef.current = true;
        });

        if (infoRef.current) {
            clearTween(infoOpacityRef);
            infoRef.current.style.visibility = '';
            tween(infoOpacityRef, { current: 1 }, 275, 'easeInOutCubic', null, () => {
                if (infoRef.current) infoRef.current.style.opacity = infoOpacityRef.current;
            });
        }

        hoveredInRef.current = true;
    }

    function hoverOut(fast) {
        clearTween(handleMotion.values);

        if (infoRef.current) {
            clearTween(infoOpacityRef);
        }

        if (fast) {
            handleMotion.values.alpha = 0;
            needsUpdateRef.current = true;

            if (infoRef.current) {
                infoRef.current.style.opacity = '0';
                infoRef.current.style.visibility = 'hidden';
                infoOpacityRef.current = 0;
            }
        } else {
            tween(handleMotion.values, { alpha: 0 }, 275, 'easeInOutCubic', null, () => {
                needsUpdateRef.current = true;
            });

            if (infoRef.current) {
                tween(infoOpacityRef, { current: 0 }, 275, 'easeInOutCubic', () => {
                    if (infoRef.current) {
                        infoRef.current.style.visibility = 'hidden';
                    }
                }, () => {
                    if (infoRef.current) infoRef.current.style.opacity = infoOpacityRef.current;
                });
            }
        }

        hoveredInRef.current = false;
    }

    // ─── Marker helpers ───────────────────────────────────────────────────────

    function getMarkerName() {
        const names = markerDataRef.current.map(m => m.name);
        let count = 1;
        let name = `Marker ${count++}`;

        while (names.includes(name)) {
            name = `Marker ${count++}`;
        }

        return name;
    }

    function addMarker([x, name], fast) {
        const id = `${Date.now()}_${Math.random()}`;
        const markerRef = { current: null };
        const marker = {
            id,
            name,
            x,
            multiplier: 0,
            markerRef,
            tweenPending: false
        };

        markerDataRef.current.push(marker);
        setMarkerVersion(v => v + 1);

        if (animatedInRef.current) {
            if (fast) {
                marker.multiplier = 1;
                // Opacity set after mount in the useLayoutEffect above.
            } else {
                marker.tweenPending = true;
                onMarkerAdd?.({ item: marker, target: rootRef.current });
            }
        }
    }

    function removeMarker(marker) {
        const index = markerDataRef.current.indexOf(marker);

        if (~index) {
            markerDataRef.current.splice(index, 1);
            onMarkerRemove?.({ item: marker, target: rootRef.current });
            setMarkerVersion(v => v + 1);
        }
    }

    // ─── Pointer event handlers ───────────────────────────────────────────────

    const onHoverRef = useRef(null);
    const onPointerDownRef = useRef(null);
    const onPointerMoveRef = useRef(null);

    useEffect(() => {
        onHoverRef.current = ({ type }) => {
            if (isDraggingAwayRef.current) return;

            if (!animatedInRef.current) {
                hoveredInRef.current = type === 'mouseenter';

                return;
            }

            clearTween(hoverTimeoutRef);

            if (type === 'mouseenter') {
                hoverIn();
            } else {
                hoverTimeoutRef.current = delayedCall(200, () => hoverOut());
            }
        };

        onPointerMoveRef.current = e => {
            mouseRef.current.copy({ x: e.clientX, y: e.clientY });
            deltaRef.current.subVectors(mouseRef.current, lastMouseRef.current);
            boundsRef.current = rootRef.current?.getBoundingClientRect() ?? null;

            if (boundsRef.current) {
                mouseXRef.current = clamp((mouseRef.current.x - boundsRef.current.left) / width, 0, 1);
            }
        };

        onPointerDownRef.current = e => {
            if (rootRef.current?.contains(e.target)) {
                lastTimeRef.current = performance.now();
                lastMouseRef.current.set(e.clientX, e.clientY);

                if (onPointerMoveRef.current) onPointerMoveRef.current(e);

                window.addEventListener('pointerup', onPointerUpFn);

                hoverIn();
            } else {
                hoverOut();
            }
        };
    });

    const onPointerUpFn = useCallback(e => {
        window.removeEventListener('pointerup', onPointerUpFn);

        if (e.target !== rootRef.current) return;
        if (performance.now() - lastTimeRef.current > 250 || deltaRef.current.length() > 50) return;
        if (markerDataRef.current.find(m => m.x === mouseXRef.current)) return;

        if (!noMarker && !noMarkerDrag) {
            addMarker([mouseXRef.current, getMarkerName()]);
        }
    }, [noMarker, noMarkerDrag]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleMarkerUpdate = useCallback(({ dragging, target }) => {
        isDraggingRef.current = dragging;
        isDraggingAwayRef.current = Math.abs(deltaRef.current.y) > 50;

        if (dragging && isDraggingAwayRef.current) {
            if (boundsRef.current && target.element) {
                const originX = mouseRef.current.x - boundsRef.current.x;
                const originY = mouseRef.current.y - boundsRef.current.y;

                target.element.style.left = `${originX}px`;
                target.element.style.top = `${originY + mobileOffset}px`;
            }

            if (hoveredInRef.current) hoverOut();
        } else if (dragging) {
            // Find the marker data that owns this handle and sync x.
            const marker = markerDataRef.current.find(m => m.markerRef.current === target);

            if (marker) marker.x = mouseXRef.current;

            target.x = mouseXRef.current;

            if (target.element) target.element.style.top = '-12px';
        } else if (isDraggingAwayRef.current) {
            isDraggingAwayRef.current = false;

            const marker = markerDataRef.current.find(m => m.markerRef.current === target);

            if (marker) removeMarker(marker);
        }

        needsUpdateRef.current = true;
    }, [mobileOffset]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleMarkerClickInternal = useCallback(e => {
        onMarkerClick?.(e);
    }, [onMarkerClick]);

    // Attach / detach pointer listeners (added after first animateIn call, just
    // like the original's addListeners/removeListeners, but we keep them live
    // and gate behaviour with animatedInRef instead).
    useEffect(() => {
        if (noHover) return;

        const root = rootRef.current;

        const onEnter = e => onHoverRef.current?.(e);
        const onLeave = e => onHoverRef.current?.(e);
        const onDown = e => onPointerDownRef.current?.(e);
        const onMove = e => onPointerMoveRef.current?.(e);

        root.addEventListener('mouseenter', onEnter);
        root.addEventListener('mouseleave', onLeave);
        window.addEventListener('pointerdown', onDown);
        window.addEventListener('pointermove', onMove);

        return () => {
            root.removeEventListener('mouseenter', onEnter);
            root.removeEventListener('mouseleave', onLeave);
            window.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onPointerUpFn);
        };
    }, [noHover, onPointerUpFn]);

    // ─── Cleanup ──────────────────────────────────────────────────────────────

    useEffect(() => () => {
        clearTween(hoverTimeoutRef);
        clearTween(infoOpacityRef);
        markerDataRef.current.forEach(m => clearTween(m));
    }, []);

    // ─── Imperative handle ────────────────────────────────────────────────────

    useImperativeHandle(ref, () => ({
        /**
         * Plays the entry animation. If `fast` is true the graph is shown
         * instantly without tweening.
         * @param {boolean} [fast=false]
         */
        animateIn: (fast = false) => {
            const p = motion.values;

            clearTween(p);
            markerDataRef.current.forEach(m => clearTween(m));

            if (fast) {
                p.alpha = 1;
                p.yMultiplier = 1;
                p.progress = 1;
                animatedInRef.current = true;
                needsUpdateRef.current = true;

                if (hoveredInRef.current) hoverIn();

                markerDataRef.current.forEach(m => {
                    m.multiplier = 1;
                    const h = m.markerRef.current;

                    if (h?.element) h.element.style.opacity = '1';
                });
            } else {
                p.alpha = 0;
                p.yMultiplier = 0;
                p.progress = 0;

                tween(p, { alpha: 1 }, 500, 'easeOutSine');

                tween(p, { progress: 1 }, 500, 'easeInOutCubic', () => {
                    tween(p, { yMultiplier: 1 }, 400, 'easeOutCubic', () => {
                        animatedInRef.current = true;

                        if (hoveredInRef.current) hoverIn();

                        if (!noMarker) {
                            markerDataRef.current.forEach(m => {
                                tween(m, { multiplier: 1 }, 400, 'easeOutCubic', null, () => {
                                    needsUpdateRef.current = true;
                                    const h = m.markerRef.current;

                                    if (h?.element) h.element.style.opacity = m.multiplier;
                                });
                            });
                        }
                    }, () => {
                        needsUpdateRef.current = true;
                    });
                }, () => {
                    needsUpdateRef.current = true;
                });
            }
        },

        /** Plays the exit animation. */
        animateOut: () => {
            const p = motion.values;

            clearTween(p);
            markerDataRef.current.forEach(m => clearTween(m));

            animatedInRef.current = false;
            hoverOut(true);

            tween(p, { alpha: 0 }, 300, 'easeOutSine');

            tween(p, { yMultiplier: 0 }, 300, 'easeOutCubic', null, () => {
                needsUpdateRef.current = true;

                if (!noMarker) {
                    markerDataRef.current.forEach(m => {
                        m.multiplier = p.yMultiplier;
                        const h = m.markerRef.current;

                        if (h?.element) h.element.style.opacity = m.multiplier;
                    });
                }
            });
        },

        /**
         * Called every tick to push a new value into the rolling data buffer.
         * Passing an array replaces the full buffer.
         * This is intentionally imperative to avoid a React re-render per frame.
         *
         * @param {number|number[]} [val]
         */
        update: val => {
            if (val !== undefined) {
                if (Array.isArray(val)) {
                    setArray(val);
                } else {
                    if (hasGhostRef.current) {
                        const ghost2 = arrayRef.current.shift();
                        arrayRef.current.push(val);
                        ghostArrayRef.current.shift();
                        ghostArrayRef.current.push(ghost2);
                    } else {
                        arrayRef.current.shift();
                        arrayRef.current.push(val);
                    }

                    needsUpdateRef.current = true;

                    if (lookupPrecision > 0) {
                        graphNeedsUpdateRef.current = true;
                    }
                }
            }
        }
    }), [noMarker, lookupPrecision]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div
            ref={rootRef}
            className="graph"
            style={{ width, height }}
        >
            <canvas ref={canvasRef} />
            {!noHover && (
                <span
                    ref={infoRef}
                    className="info"
                    style={{ opacity: 0, visibility: 'hidden' }}
                />
            )}
            {!noMarker && markerDataRef.current.map(marker => (
                <GraphMarker
                    key={marker.id}
                    ref={marker.markerRef}
                    name={marker.name}
                    noDrag={noMarkerDrag}
                    onUpdate={handleMarkerUpdate}
                    onClick={handleMarkerClickInternal}
                />
            ))}
        </div>
    );
}
