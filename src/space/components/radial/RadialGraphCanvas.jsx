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

import './RadialGraphCanvas.css';

let markerIdCounter = 0;

/**
 * Radial graph that draws into a shared external canvas context.
 * Mirrors `RadialGraphCanvas`.
 *
 * Unlike {@link RadialGraph} this component does not own a `<canvas>` element.
 * The context and canvas geometry are injected via the imperative handle's
 * `setContext` and `setSize` methods, matching the original library's pattern
 * where a parent panel provides the shared canvas.
 *
 * `useImperativeHandle` is used extensively here because the component
 * participates in a high-frequency draw loop driven by the parent, where
 * props-based updates would cause unacceptable overhead.
 *
 * @param {object} props
 * @param {number[]} [props.value] Initial data array.
 * @param {number[]} [props.ghost] Initial ghost data array.
 * @param {number} [props.start=0] Start angle in degrees.
 * @param {number} [props.graphHeight=60] Radial height of the graph band.
 * @param {number} [props.resolution=80] Default number of data points.
 * @param {number} [props.tension=6] Catmull-Rom tension.
 * @param {number} [props.precision=0] Decimal places in the info label.
 * @param {number} [props.lookupPrecision=0] Lookup table samples.
 * @param {Array} [props.markers=[]] Initial markers `[angle, name]`.
 * @param {number} [props.range=1] Value range.
 * @param {number} [props.infoDistanceX=20]
 * @param {number} [props.infoDistanceY=10]
 * @param {string} [props.suffix='']
 * @param {function} [props.format] Custom formatter.
 * @param {boolean} [props.noHover=false]
 * @param {boolean} [props.noMarker=false]
 * @param {boolean} [props.noMarkerDrag=false]
 * @param {boolean} [props.noGradient=false]
 * @param {function} [props.onCursor] Called with `{ cursor }` on cursor change.
 * @param {function} [props.onMarkerAdd]
 * @param {function} [props.onMarkerRemove]
 * @param {function} [props.onMarkerClick]
 * @param {object} [props.ref] Exposes `graphHeight`, `middle`, `halfWidth`,
 *   `startAngle`, `setContext`, `setPosition`, `setSize`, `setEnabled`,
 *   `setArray`, `setGhostArray`, `setRange`, `setMarkers`, `addMarker`,
 *   `removeMarker`, `update`, `animateIn`, `animateOut`.
 * @example
 * const graphRef = useRef();
 * const ctx = canvasElement.getContext('2d');
 *
 * <RadialGraphCanvas ref={graphRef} value={data} />
 *
 * graphRef.current.setContext(ctx);
 * graphRef.current.setSize(200, 200);
 * graphRef.current.animateIn();
 */
export function RadialGraphCanvas({
    value,
    ghost,
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
    onCursor,
    onMarkerAdd,
    onMarkerRemove,
    onMarkerClick,
    ref
}) {
    const formatFn = format ?? (v => `${v}${suffix}`);

    const rootRef = useRef(null);
    const infoRef = useRef(null);

    const [markerList, setMarkerList] = useState([]);
    const markerListRef = useRef([]);
    const markerDataRef = useRef({});
    const handleMarkerPointerDownRef = useRef(null);

    const sRef = useRef({
        context: null,
        position: { x: 0, y: 0 },
        objectWidth: 0,
        objectHeight: 0,
        width: 0,
        height: 0,
        halfWidth: 0,
        halfHeight: 0,
        middle: 0,
        radius: 0,
        distance: 0,
        rangeHeight: 0,
        range,
        startAngle: (() => {
            let a = degToRad(start);

            if (a < 0) {
                a += TwoPI;
            }

            return a;
        })(),
        array: [],
        ghostArray: [],
        points: [],
        pathData: '',
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
        isResizing: false,
        animatedIn: false,
        hoveredIn: false,
        graphNeedsUpdate: false,
        initialized: false,
        enabled: true,
        strokeStyle: null,
        fillStyle: null,
        lineColors: { graph: '', bottom: '', handle: '' },
        colorRange: [],
        color: new Color(),
        props: { alpha: 0, yMultiplier: 0, progress: 0 },
        handleProps: { alpha: 0 },
        infoProps: { alpha: 0 },
        timeout: null
    });

    const onCursorRef = useRef(onCursor);

    useEffect(() => {
        onCursorRef.current = onCursor;
    }, [onCursor]);

    const onPointerDownRef = useRef(null);
    const onPointerMoveRef = useRef(null);
    const onPointerUpRef = useRef(null);

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

        if (!s.context) {
            return;
        }

        s.strokeStyle = createRadialGradient(
            s.context, s.colorRange, s.color, Easing,
            s.middle, s.middle, s.radius, s.middle, s.middle, s.middle, 1
        );
        s.fillStyle = createRadialGradient(
            s.context, s.colorRange, s.color, Easing,
            s.middle, s.middle, s.radius, s.middle, s.middle, s.middle, 0.07
        );
    }

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

        ctx.save();
        ctx.translate(s.position.x - s.halfWidth, s.position.y - s.halfHeight);

        const h = graphHeight - 1;
        ctx.globalAlpha = s.props.alpha < 0.001 ? 0 : s.props.alpha;

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
            onPointerMoveRef.current?.();
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

        // Handle
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

        ctx.restore();
    }

    function hoverIn() {
        const s = sRef.current;

        clearTween(s.handleProps);
        tween(s.handleProps, { alpha: 1 }, 275, 'easeInOutCubic');

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
                s.infoProps.alpha = 0;
                infoRef.current.style.opacity = '0';
                infoRef.current.style.visibility = 'hidden';
            } else {
                tween(s.handleProps, { alpha: 0 }, 275, 'easeInOutCubic');
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

            if (onCursorRef.current) {
                onCursorRef.current({ cursor });
            }
        }
    }

    function buildPointerHandlers() {
        const s = sRef.current;

        onPointerMoveRef.current = e => {
            if (s.isResizing) {
                return;
            }

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
        };

        onPointerUpRef.current = () => {
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

    useTicker(() => {
        const s = sRef.current;

        if (!s.initialized || !s.enabled) {
            return;
        }

        drawGraph();
    });

    useImperativeHandle(ref, () => {
        const s = sRef.current;

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

            setContext(context) {
                s.context = context;
                refreshGradients();
            },

            setPosition(x, y) {
                s.position.x = x;
                s.position.y = y;
            },

            setEnabled(enabled) {
                s.enabled = enabled;

                if (rootRef.current) {
                    rootRef.current.style.visibility = enabled ? '' : 'hidden';
                }
            },

            setSize(width, height) {
                if (width !== s.objectWidth) {
                    s.objectWidth = width;
                    s.objectHeight = height;
                    s.width = s.objectWidth + graphHeight * 4;
                    s.height = s.objectHeight + graphHeight * 4;
                    s.halfWidth = Math.round(s.width / 2);
                    s.halfHeight = Math.round(s.height / 2);
                    s.middle = s.width / 2;
                    s.radius = s.middle - graphHeight;
                    s.distance = s.radius - graphHeight;
                    s.rangeHeight = getRangeHeight(s.range);
                    refreshGradients();

                    s.isResizing = true;

                    if (!noHover && s.animatedIn) {
                        hoverOut(true);
                    }

                    clearTween(s.timeout);
                    s.timeout = delayedCall(200, () => {
                        s.isResizing = false;

                        if (!noHover && lookupPrecision) {
                            s.graphNeedsUpdate = true;
                        }
                    });
                }

                if (rootRef.current) {
                    rootRef.current.style.left = `${s.position.x - s.halfWidth}px`;
                    rootRef.current.style.top = `${s.position.y - s.halfHeight}px`;
                    rootRef.current.style.width = `${s.width}px`;
                    rootRef.current.style.height = `${s.height}px`;
                }
            },

            setArray(val) {
                s.array = Array.isArray(val) ? val : new Array(resolution).fill(0);
                s.segmentsRatio = [];

                if (!noHover && lookupPrecision) {
                    s.graphNeedsUpdate = true;
                }
            },

            setGhostArray(val) {
                s.ghostArray = Array.isArray(val) ? val : new Array(s.array.length).fill(0);
            },

            setRange(r) {
                s.range = r;
                s.rangeHeight = getRangeHeight(r);

                if (!noHover && lookupPrecision) {
                    s.graphNeedsUpdate = true;
                }
            },

            setMarkers(ms, fast) {
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
            },

            update(v) {
                if (!s.enabled) {
                    return;
                }

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

                        if (!noHover && lookupPrecision) {
                            s.graphNeedsUpdate = true;
                        }
                    }
                }

                if (s.initialized) {
                    drawGraph();
                }
            },

            animateIn(fast) {
                buildPointerHandlers();
                addListeners();
                clearTween(s.props);

                if (!s.initialized) {
                    s.initialized = true;
                }

                if (fast) {
                    s.props.alpha = 1;
                    s.props.yMultiplier = 1;
                    s.props.progress = 1;
                    s.animatedIn = true;

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
                                            if (md.el) {
                                                md.el.style.opacity = String(md.multiplier);
                                            }
                                        });
                                    }
                                }
                            }
                        });
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
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const s = sRef.current;
        initColors();
        buildPointerHandlers();

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
        <div ref={rootRef} className="radial-graph-canvas">
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
