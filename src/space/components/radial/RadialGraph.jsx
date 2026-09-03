import { useEffect, useImperativeHandle, useRef, useState } from 'react';

import { Color } from '@lib/math/Color.js';
import { Easing } from '@lib/tween/Easing.js';
import { clearTween, delayedCall, tween } from '@lib/tween/Tween.js';
import { TwoPI, degToRad, mapLinear } from '@lib/utils/Utils.js';

import { useTicker } from '../../motion/useTicker.js';
import {
    buildCatmullRomPathData,
    buildRadialLookupPoints,
    buildRadialPoints,
    calculateLookup,
    createRadialGradient,
    drawCatmullRom,
    getCurvePoint
} from './geometry.js';

import './RadialGraph.css';

let markerIdCounter = 0;

/**
 * Standalone radial graph with its own canvas.  Mirrors `RadialGraph`.
 *
 * Animation state (`alpha`, `yMultiplier`, `progress`) is driven by the
 * library's own tween engine and composited on a 2× canvas every frame via
 * `useTicker`.  Because the entire draw loop is imperative, `animateIn` and
 * `animateOut` are exposed through `useImperativeHandle`.
 *
 * @param {object} props
 * @param {number[]} [props.value] Initial data array.
 * @param {number[]} [props.ghost] Initial ghost / previous data array.
 * @param {number} [props.width=300] Canvas width in CSS pixels.
 * @param {number} [props.height=300] Canvas height in CSS pixels.
 * @param {number} [props.start=0] Start angle in degrees.
 * @param {number} [props.graphHeight=60] Radial height of the graph band.
 * @param {number} [props.resolution=80] Default number of data points.
 * @param {number} [props.tension=6] Catmull-Rom tension.
 * @param {number} [props.precision=0] Decimal places shown in the info label.
 * @param {number} [props.lookupPrecision=0] Samples for hover-position lookup.
 * @param {Array} [props.markers=[]] Initial marker definitions `[angle, name]`.
 * @param {number} [props.range=1] Value range; data is normalised against this.
 * @param {number} [props.infoDistanceX=20] Horizontal clearance for the info label.
 * @param {number} [props.infoDistanceY=10] Vertical clearance for the info label.
 * @param {string} [props.suffix=''] Appended to formatted values.
 * @param {function} [props.format] Custom value formatter.
 * @param {boolean} [props.noHover=false] Disable hover interaction.
 * @param {boolean} [props.noMarker=false] Disable markers entirely.
 * @param {boolean} [props.noMarkerDrag=false] Disable marker dragging.
 * @param {boolean} [props.noGradient=false] Use a plain line instead of gradient.
 * @param {function} [props.onMarkerAdd] Called with `{ item, target }` when a
 *   marker is added interactively.
 * @param {function} [props.onMarkerRemove] Called with `{ item, target }` when a
 *   marker is removed.
 * @param {function} [props.onMarkerClick] Called when a marker is clicked.
 * @param {object} [props.ref] Exposes `animateIn`, `animateOut`, `update`,
 *   `setArray`, `setGhostArray`, `setRange`, `setSize`, `setMarkers`,
 *   `addMarker`, `removeMarker`.
 * @example
 * const graphRef = useRef();
 *
 * <RadialGraph
 *     ref={graphRef}
 *     value={Array.from({ length: 80 }, () => Math.random())}
 *     precision={2}
 *     lookupPrecision={200}
 * />
 *
 * graphRef.current.animateIn();
 */
export function RadialGraph({
    value,
    ghost,
    width = 300,
    height = 300,
    start = 0,
    graphHeight = 60,
    resolution = 80,
    tension = 6,
    precision = 0,
    lookupPrecision = 0,
    markers: initialMarkers = [],
    range = 1,
    infoDistanceX = 20,
    infoDistanceY = 10,
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

    const rootRef = useRef(null);
    const canvasRef = useRef(null);
    const infoRef = useRef(null);

    // Marker list for rendering (state) and internal logic (ref in sync).
    const [markerList, setMarkerList] = useState([]);
    const markerListRef = useRef([]);
    const markerDataRef = useRef({}); // { [id]: { angle, multiplier, el } }
    const handleMarkerPointerDownRef = useRef(null);

    // Mutable animation and geometry state.  Never causes React re-renders.
    const sRef = useRef({
        width,
        height,
        startAngle: (() => {
            let a = degToRad(start);

            if (a < 0) {
                a += TwoPI;
            }

            return a;
        })(),
        middle: 0,
        radius: 0,
        distance: 0,
        rangeHeight: 0,
        range,
        array: [],
        ghostArray: [],
        points: [],
        pathData: '',
        length: 0,
        lookup: [],
        bounds: null,
        offset: { x: 0, y: 0 },
        mouse: { x: 0, y: 0 },
        delta: { x: 0, y: 0 },
        lastMouse: { x: 0, y: 0 },
        lastTime: 0,
        mouseAngle: 0,
        lastHover: 'out',
        lastCursor: '',
        mobileOffset: navigator.maxTouchPoints ? -50 : 0,
        isDragging: false,
        isDraggingAway: false,
        animatedIn: false,
        hoveredIn: false,
        needsUpdate: false,
        graphNeedsUpdate: false,
        strokeStyle: null,
        fillStyle: null,
        lineColors: { graph: '', bottom: '', handle: '' },
        colorRange: [],
        color: new Color(),
        props: { alpha: 0, yMultiplier: 0, progress: 0 },
        handleProps: { alpha: 0 },
        infoProps: { alpha: 0 },
        timeout: null,
        context: null,
        initialized: false
    });

    // Stable callback refs for pointer handlers so we can add/remove them.
    const onPointerDownRef = useRef(null);
    const onPointerMoveRef = useRef(null);
    const onPointerUpRef = useRef(null);

    // --- helpers ---

    function getRangeHeight(r) {
        return (graphHeight - 5) / r;
    }

    function getTextOffset(mouseAngle, distX) {
        if (mouseAngle >= 0 && mouseAngle < 0.25) {
            return mapLinear(mouseAngle, 0, 0.25, distX, infoDistanceY);
        } else if (mouseAngle >= 0.25 && mouseAngle < 0.5) {
            return mapLinear(mouseAngle, 0.25, 0.5, infoDistanceY, distX);
        } else if (mouseAngle >= 0.5 && mouseAngle < 0.75) {
            return mapLinear(mouseAngle, 0.5, 0.75, distX, infoDistanceY);
        }

        return mapLinear(mouseAngle, 0.75, 1, infoDistanceY, distX);
    }

    function initColors() {
        const s = sRef.current;
        const rootStyle = getComputedStyle(document.querySelector(':root'));
        s.lineColors.graph = rootStyle.getPropertyValue('--ui-color-line').trim();
        s.lineColors.bottom = rootStyle.getPropertyValue('--ui-color-graph-bottom-line').trim();
        s.lineColors.handle = rootStyle.getPropertyValue('--ui-color').trim();
        s.colorRange = [
            new Color(rootStyle.getPropertyValue('--ui-color-range-1').trim()),
            new Color(rootStyle.getPropertyValue('--ui-color-range-2').trim()),
            new Color(rootStyle.getPropertyValue('--ui-color-range-3').trim()),
            new Color(rootStyle.getPropertyValue('--ui-color-range-4').trim())
        ];
    }

    function refreshGradients() {
        const s = sRef.current;
        const ctx = s.context;

        if (!ctx) {
            return;
        }

        s.strokeStyle = createRadialGradient(
            ctx, s.colorRange, s.color, Easing,
            s.middle, s.middle, s.radius, s.middle, s.middle, s.middle, 1
        );
        s.fillStyle = createRadialGradient(
            ctx, s.colorRange, s.color, Easing,
            s.middle, s.middle, s.radius, s.middle, s.middle, s.middle, 0.07
        );
    }

    function applySize(w, h) {
        const s = sRef.current;
        s.width = w;
        s.height = h;
        s.middle = w / 2;
        s.radius = s.middle - graphHeight;
        s.distance = s.radius - graphHeight;
        s.rangeHeight = getRangeHeight(s.range);

        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const dpr = 2; // Always 2, matching the original
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        s.context = canvas.getContext('2d');
        s.context.scale(dpr, dpr);
        refreshGradients();
        s.needsUpdate = true;

        if (!noHover && lookupPrecision) {
            s.graphNeedsUpdate = true;
        }
    }

    // --- draw ---

    function drawPath(h, array, ghost) {
        const s = sRef.current;
        const ctx = s.context;

        if (ghost) {
            ctx.globalAlpha = 0.35;
        } else {
            ctx.globalAlpha = s.props.alpha;
        }

        ctx.lineWidth = 1.5;

        if (noGradient) {
            ctx.strokeStyle = s.lineColors.graph;
        } else {
            ctx.strokeStyle = s.strokeStyle;
            ctx.fillStyle = s.fillStyle;
            ctx.shadowColor = 'rgb(255 255 255 / 0.2)';
            ctx.shadowBlur = 15;
        }

        if (!noHover && s.graphNeedsUpdate && !ghost) {
            const lookPts = buildRadialLookupPoints(array, s.middle, graphHeight, s.rangeHeight, s.startAngle);
            s.pathData = buildCatmullRomPathData(lookPts, tension);
        }

        const pts = buildRadialPoints(array, s.middle, h, s.rangeHeight, s.props.yMultiplier, s.startAngle);

        ctx.beginPath();

        if (s.props.progress === 1) {
            drawCatmullRom(ctx, pts, tension);
        } else {
            ctx.arc(s.middle, s.middle, s.middle - h, s.startAngle, s.startAngle + TwoPI * s.props.progress);
        }

        ctx.stroke();

        if (!noGradient && s.props.progress === 1) {
            const innerRadius = s.middle - h;
            const fx = s.middle + innerRadius * Math.cos(s.startAngle);
            const fy = s.middle + innerRadius * Math.sin(s.startAngle);

            ctx.shadowBlur = 0;
            ctx.moveTo(fx, fy);
            ctx.arc(s.middle, s.middle, innerRadius, 0, TwoPI, true);
            ctx.fill();
        }
    }

    function drawGraph() {
        const s = sRef.current;
        const ctx = s.context;

        if (!ctx || s.props.alpha <= 0) {
            return;
        }

        const h = graphHeight - 1;
        ctx.globalAlpha = s.props.alpha < 0.001 ? 0 : s.props.alpha;
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        // Inner circle
        ctx.lineWidth = 1;
        ctx.strokeStyle = s.lineColors.bottom;
        ctx.beginPath();
        ctx.arc(s.middle, s.middle, s.middle - h, s.startAngle, s.startAngle + TwoPI * s.props.progress);
        ctx.stroke();

        // Start line
        const cs = Math.cos(s.startAngle);
        const ss = Math.sin(s.startAngle);
        const r0sl = s.middle - (h - 0.5);
        const r1sl = s.middle - (h - 0.5 - (h - 0.5) * s.props.yMultiplier);
        ctx.beginPath();
        ctx.moveTo(s.middle + r0sl * cs, s.middle + r0sl * ss);
        ctx.lineTo(s.middle + r1sl * cs, s.middle + r1sl * ss);
        ctx.stroke();

        // Paths
        if (s.ghostArray.length) {
            drawPath(h, s.ghostArray, true);
        }

        if (s.array.length) {
            drawPath(h, s.array, false);
        }

        if (s.graphNeedsUpdate && !noHover) {
            const { lookup } = calculateLookup(s.pathData, lookupPrecision, s.middle, s.startAngle);
            s.lookup = lookup;
            s.graphNeedsUpdate = false;
        }

        // Marker lines
        if (!noMarker) {
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = s.lineColors.graph;

            for (const m of markerListRef.current) {
                const md = markerDataRef.current[m.id];

                if (!md) {
                    continue;
                }

                const mAngle = md.angle * TwoPI;
                const mc = Math.cos(mAngle);
                const ms = Math.sin(mAngle);
                const mr0 = s.middle - (h - 0.5);
                const mr1 = s.middle - (h - 0.5 - (h - 0.5) * md.multiplier * s.props.yMultiplier);
                const mWidth = md.el ? md.el.getBoundingClientRect().width : 0;
                const mr2 = s.middle + getTextOffset(md.angle, mWidth / 2 + 10);

                ctx.beginPath();
                ctx.moveTo(s.middle + mr0 * mc, s.middle + mr0 * ms);
                ctx.lineTo(s.middle + mr1 * mc, s.middle + mr1 * ms);
                ctx.stroke();

                if (!s.isDraggingAway && md.el) {
                    md.el.style.left = `${s.middle + mr2 * mc}px`;
                    md.el.style.top = `${s.middle + mr2 * ms}px`;
                }
            }
        }

        // Handle line and circle
        if (!noHover && !s.isDraggingAway) {
            let angle = (-s.startAngle + Math.atan2(s.offset.y, s.offset.x)) % TwoPI;

            if (angle < 0) {
                angle += TwoPI;
            }

            const mouseAngle = angle / TwoPI;
            const val = s.array[Math.floor(mouseAngle * s.array.length)] ?? 0;

            let hRadius;

            if (lookupPrecision && s.lookup.length) {
                const pt = getCurvePoint(s.lookup, lookupPrecision, mouseAngle);
                const dx = pt.x - s.middle;
                const dy = pt.y - s.middle;
                hRadius = s.middle - (h - (Math.sqrt(dx * dx + dy * dy) - s.radius) - 1);
            } else {
                hRadius = s.middle - (h - val * s.rangeHeight - 1);
            }

            angle = s.mouseAngle * TwoPI;

            const hc = Math.cos(angle);
            const hs = Math.sin(angle);
            const hr0 = s.radius - getTextOffset(s.mouseAngle, infoDistanceX);
            const hr1 = s.radius;
            const hr2 = hRadius - 2;
            const hr3 = hRadius;

            ctx.globalAlpha = s.handleProps.alpha < 0.001 ? 0 : s.handleProps.alpha;
            ctx.lineWidth = 1;
            ctx.strokeStyle = s.lineColors.handle;

            ctx.beginPath();
            ctx.moveTo(s.middle + hr1 * hc, s.middle + hr1 * hs);
            ctx.lineTo(s.middle + hr2 * hc, s.middle + hr2 * hs);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(s.middle + hr3 * hc, s.middle + hr3 * hs, 2.5, 0, TwoPI);
            ctx.stroke();

            if (s.animatedIn && infoRef.current) {
                infoRef.current.style.left = `${s.middle + hr0 * hc}px`;
                infoRef.current.style.top = `${s.middle + hr0 * hs}px`;
                infoRef.current.textContent = formatFn(val.toFixed(precision));
            }
        }
    }

    // --- hover ---

    function hoverIn() {
        const s = sRef.current;

        clearTween(s.handleProps);
        tween(s.handleProps, { alpha: 1 }, 275, 'easeInOutCubic', null, () => {
            s.needsUpdate = true;
        });

        if (!noHover && infoRef.current) {
            clearTween(s.infoProps);
            infoRef.current.style.visibility = '';
            tween(s.infoProps, { alpha: 1 }, 275, 'easeInOutCubic', null, () => {
                if (infoRef.current) {
                    infoRef.current.style.opacity = String(s.infoProps.alpha);
                }
            });
        }

        s.hoveredIn = true;
    }

    function hoverOut(fast) {
        const s = sRef.current;
        s.lastHover = 'out';
        clearTween(s.handleProps);

        if (!noHover && infoRef.current) {
            clearTween(s.infoProps);

            if (fast) {
                s.handleProps.alpha = 0;
                s.needsUpdate = true;
                s.infoProps.alpha = 0;
                infoRef.current.style.opacity = '0';
                infoRef.current.style.visibility = 'hidden';
            } else {
                tween(s.handleProps, { alpha: 0 }, 275, 'easeInOutCubic', null, () => {
                    s.needsUpdate = true;
                });
                tween(s.infoProps, { alpha: 0 }, 275, 'easeInOutCubic', () => {
                    if (infoRef.current) {
                        infoRef.current.style.visibility = 'hidden';
                    }
                }, () => {
                    if (infoRef.current) {
                        infoRef.current.style.opacity = String(s.infoProps.alpha);
                    }
                });
            }
        }

        s.hoveredIn = false;
    }

    function setHover(type = 'out') {
        const s = sRef.current;

        if (s.isDraggingAway) {
            return;
        }

        if (type !== s.lastHover) {
            s.lastHover = type;

            if (!s.animatedIn) {
                s.hoveredIn = type === 'over';
                return;
            }

            clearTween(s.timeout);

            if (type === 'over') {
                hoverIn();
            } else {
                s.timeout = delayedCall(200, () => {
                    hoverOut();
                });
            }
        }
    }

    function setCursor(cursor = '') {
        const s = sRef.current;

        if (cursor !== s.lastCursor) {
            s.lastCursor = cursor;

            if (rootRef.current) {
                rootRef.current.style.cursor = cursor;
            }
        }
    }

    // --- pointer handlers ---

    function buildPointerHandlers() {
        const s = sRef.current;

        onPointerMoveRef.current = e => {
            if (e) {
                s.mouse.x = e.clientX;
                s.mouse.y = e.clientY;
                s.delta.x = s.mouse.x - s.lastMouse.x;
                s.delta.y = s.mouse.y - s.lastMouse.y;
                s.bounds = rootRef.current?.getBoundingClientRect() ?? null;

                if (s.bounds) {
                    s.offset.x = s.mouse.x - (s.bounds.left + s.middle);
                    s.offset.y = s.mouse.y - (s.bounds.top + s.middle);
                }
            }

            const dist = Math.sqrt(s.offset.x * s.offset.x + s.offset.y * s.offset.y);
            const rawAngle = Math.atan2(s.offset.y, s.offset.x);
            s.mouseAngle = ((rawAngle % TwoPI) + TwoPI) % TwoPI / TwoPI;

            if (dist > s.distance && dist < s.middle) {
                setHover('over');
                setCursor('crosshair');
            } else {
                setHover();
                setCursor();
            }
        };

        onPointerDownRef.current = e => {
            s.lastTime = performance.now();
            s.lastMouse.x = e.clientX;
            s.lastMouse.y = e.clientY;
            onPointerMoveRef.current(e);
            window.addEventListener('pointerup', onPointerUpRef.current);
        };

        onPointerUpRef.current = e => {
            window.removeEventListener('pointerup', onPointerUpRef.current);

            if (e.target !== rootRef.current) {
                return;
            }

            if (performance.now() - s.lastTime > 250) {
                return;
            }

            const dLen = Math.sqrt(s.delta.x * s.delta.x + s.delta.y * s.delta.y);

            if (dLen > 50) {
                return;
            }

            const existing = markerListRef.current.find(m => markerDataRef.current[m.id]?.angle === s.mouseAngle);

            if (existing) {
                return;
            }

            if (!noMarker && !noMarkerDrag) {
                addMarkerInternal([s.mouseAngle, getMarkerName()]);
            }
        };
    }

    function addListeners() {
        if (!noHover) {
            window.addEventListener('pointerdown', onPointerDownRef.current);
            window.addEventListener('pointermove', onPointerMoveRef.current);
        }
    }

    function removeListeners() {
        if (!noHover) {
            window.removeEventListener('pointerdown', onPointerDownRef.current);
            window.removeEventListener('pointermove', onPointerMoveRef.current);
        }

        window.removeEventListener('pointerup', onPointerUpRef.current);
    }

    // --- marker helpers ---

    function getMarkerName() {
        const names = markerListRef.current.map(m => m.name);
        let count = 1;
        let name = `Marker ${count++}`;

        while (names.includes(name)) {
            name = `Marker ${count++}`;
        }

        return name;
    }

    function addMarkerInternal([angle, name], fast) {
        const id = markerIdCounter++;
        const noDrag = noMarkerDrag;

        markerDataRef.current[id] = { angle, multiplier: 0, el: null };
        markerListRef.current = [...markerListRef.current, { id, name, noDrag }];
        setMarkerList([...markerListRef.current]);

        const md = markerDataRef.current[id];
        const s = sRef.current;

        if (s.animatedIn) {
            if (fast) {
                md.multiplier = 1;

                if (md.el) {
                    md.el.style.opacity = '1';
                }
            } else {
                tween(md, { multiplier: 1 }, 400, 'easeOutCubic', null, () => {
                    s.needsUpdate = true;

                    if (md.el) {
                        md.el.style.opacity = String(md.multiplier);
                    }
                });

                if (onMarkerAdd) {
                    onMarkerAdd({ item: { id, name, angle: md.angle }, target: rootRef.current });
                }
            }
        }
    }

    function removeMarkerInternal(id) {
        const md = markerDataRef.current[id];

        if (!md) {
            return;
        }

        if (onMarkerRemove) {
            const m = markerListRef.current.find(x => x.id === id);
            onMarkerRemove({ item: { id, name: m?.name, angle: md.angle }, target: rootRef.current });
        }

        delete markerDataRef.current[id];
        markerListRef.current = markerListRef.current.filter(m => m.id !== id);
        setMarkerList([...markerListRef.current]);
    }

    // --- ticker ---

    useTicker(() => {
        const s = sRef.current;

        if (!s.initialized) {
            return;
        }

        drawGraph();
    });

    // --- imperative handle ---

    useImperativeHandle(ref, () => {
        const s = sRef.current;

        return {
            animateIn(fast) {
                buildPointerHandlers();
                addListeners();
                clearTween(s.props);

                if (fast) {
                    s.props.alpha = 1;
                    s.props.yMultiplier = 1;
                    s.props.progress = 1;
                    s.animatedIn = true;
                    s.needsUpdate = true;

                    if (s.hoveredIn) {
                        hoverIn();
                    }

                    for (const m of markerListRef.current) {
                        const md = markerDataRef.current[m.id];

                        if (md) {
                            md.multiplier = 1;

                            if (md.el) {
                                md.el.style.opacity = '1';
                            }
                        }
                    }
                } else {
                    s.props.alpha = 0;
                    s.props.yMultiplier = 0;
                    s.props.progress = 0;

                    tween(s.props, { alpha: 1 }, 500, 'easeOutSine');

                    tween(s.props, { progress: 1 }, 500, 'easeInOutCubic', () => {
                        tween(s.props, { yMultiplier: 1 }, 400, 'easeOutCubic', () => {
                            s.animatedIn = true;

                            if (s.hoveredIn) {
                                hoverIn();
                            }

                            if (!noMarker) {
                                for (const m of markerListRef.current) {
                                    const md = markerDataRef.current[m.id];

                                    if (md) {
                                        tween(md, { multiplier: 1 }, 400, 'easeOutCubic', null, () => {
                                            s.needsUpdate = true;

                                            if (md.el) {
                                                md.el.style.opacity = String(md.multiplier);
                                            }
                                        });
                                    }
                                }
                            }
                        }, () => {
                            s.needsUpdate = true;
                        });
                    }, () => {
                        s.needsUpdate = true;
                    });
                }
            },

            animateOut() {
                removeListeners();
                clearTween(s.props);
                s.animatedIn = false;
                hoverOut(true);
                setCursor();

                tween(s.props, { alpha: 0 }, 300, 'easeOutSine');

                tween(s.props, { yMultiplier: 0 }, 300, 'easeOutCubic', null, () => {
                    s.needsUpdate = true;

                    if (!noMarker) {
                        for (const m of markerListRef.current) {
                            const md = markerDataRef.current[m.id];

                            if (md) {
                                md.multiplier = s.props.yMultiplier;

                                if (md.el) {
                                    md.el.style.opacity = String(md.multiplier);
                                }
                            }
                        }
                    }
                });
            },

            update(v) {
                if (v !== undefined) {
                    if (Array.isArray(v)) {
                        this.setArray(v);
                    } else {
                        if (ghost !== undefined) {
                            const g = s.array.pop();
                            s.array.unshift(v);
                            s.ghostArray.pop();
                            s.ghostArray.unshift(g);
                        } else {
                            s.array.pop();
                            s.array.unshift(v);
                        }

                        s.needsUpdate = true;

                        if (!noHover && lookupPrecision) {
                            s.graphNeedsUpdate = true;
                        }
                    }
                }

                if (s.needsUpdate || s.hoveredIn || s.isDragging) {
                    drawGraph();
                    s.needsUpdate = false;
                }
            },

            setArray(val) {
                s.array = Array.isArray(val) ? val : new Array(resolution).fill(0);
                s.needsUpdate = true;

                if (!noHover && lookupPrecision) {
                    s.graphNeedsUpdate = true;
                }
            },

            setGhostArray(val) {
                s.ghostArray = Array.isArray(val) ? val : new Array(s.array.length).fill(0);
                s.needsUpdate = true;
            },

            setRange(r) {
                s.range = r;
                s.rangeHeight = getRangeHeight(r);
                s.needsUpdate = true;

                if (!noHover && lookupPrecision) {
                    s.graphNeedsUpdate = true;
                }
            },

            setSize(w, h) {
                if (rootRef.current) {
                    rootRef.current.style.width = `${w}px`;
                    rootRef.current.style.height = `${h}px`;
                }

                applySize(w, h);
                s.needsUpdate = true;
            },

            setMarkers(ms, fast) {
                // Clear existing markers
                for (const m of markerListRef.current) {
                    clearTween(markerDataRef.current[m.id]);
                }

                markerListRef.current = [];
                markerDataRef.current = {};
                setMarkerList([]);

                for (const data of ms) {
                    addMarkerInternal(data, fast);
                }
            },

            addMarker(data, fast) {
                addMarkerInternal(data, fast);
            },

            removeMarker(id) {
                removeMarkerInternal(id);
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // --- mount / unmount ---

    useEffect(() => {
        const s = sRef.current;
        initColors();
        buildPointerHandlers();
        applySize(width, height);

        s.array = Array.isArray(value) ? value : new Array(resolution).fill(0);
        s.rangeHeight = getRangeHeight(range);

        if (ghost !== undefined) {
            s.ghostArray = Array.isArray(ghost) ? ghost : new Array(s.array.length).fill(0);
        }

        if (!noMarker && initialMarkers.length) {
            for (const data of initialMarkers) {
                addMarkerInternal(data);
            }
        }

        s.initialized = true;
        s.needsUpdate = true;

        return () => {
            s.initialized = false;
            removeListeners();
            clearTween(s.props);
            clearTween(s.handleProps);
            clearTween(s.infoProps);
            clearTween(s.timeout);

            for (const m of markerListRef.current) {
                clearTween(markerDataRef.current[m.id]);
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Keep the marker drag handler current so it always closes over the
    // latest props (onMarkerClick, onMarkerRemove) without needing a
    // full effect dep array.  Runs after every render (no deps).
    useEffect(() => {
        handleMarkerPointerDownRef.current = (id, e) => {
            const md = markerDataRef.current[id];

            if (!md) {
                return;
            }

            const s = sRef.current;
            const lastTime = performance.now();
            const lastMouse = { x: e.clientX, y: e.clientY };
            let delta = { x: 0, y: 0 };

            const onMove = ev => {
                delta = { x: ev.clientX - lastMouse.x, y: ev.clientY - lastMouse.y };
                const dLen = Math.sqrt(delta.x * delta.x + delta.y * delta.y);

                if (dLen) {
                    s.isDragging = true;
                    s.isDraggingAway = Math.sqrt(s.offset.x * s.offset.x + s.offset.y * s.offset.y) > s.middle + 50;

                    if (s.isDragging && s.isDraggingAway) {
                        if (s.hoveredIn) {
                            hoverOut();
                        }

                        if (md.el && s.bounds) {
                            md.el.style.left = `${s.mouse.x - s.bounds.left}px`;
                            md.el.style.top = `${s.mouse.y - s.bounds.top + s.mobileOffset}px`;
                        }
                    } else {
                        md.angle = s.mouseAngle;
                    }

                    s.needsUpdate = true;
                }
            };

            const onUp = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);

                const wasDraggingAway = s.isDraggingAway;
                s.isDragging = false;
                s.isDraggingAway = false;

                if (wasDraggingAway) {
                    removeMarkerInternal(id);
                    return;
                }

                if (performance.now() - lastTime > 250) {
                    return;
                }

                const dLen = Math.sqrt(delta.x * delta.x + delta.y * delta.y);

                if (dLen > 50) {
                    return;
                }

                if (onMarkerClick) {
                    onMarkerClick({ id, target: rootRef.current });
                }
            };

            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
        };
    });

    return (
        <div
            ref={rootRef}
            className="radial-graph"
            style={{ width, height }}
        >
            <canvas ref={canvasRef} />
            {!noHover && (
                <span ref={infoRef} className="info" />
            )}
            {markerList.map(m => (
                <div
                    key={m.id}
                    className={m.noDrag ? 'marker' : 'marker draggable'}
                    ref={el => {
                        if (markerDataRef.current[m.id]) {
                            markerDataRef.current[m.id].el = el;
                        }
                    }}
                    onPointerDown={!m.noDrag ? e => handleMarkerPointerDownRef.current?.(m.id, e) : undefined}
                >
                    {m.name}
                </div>
            ))}
        </div>
    );
}
