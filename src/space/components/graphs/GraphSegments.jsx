import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Color } from '@lib/math/Color.js';
import { Vector2 } from '@lib/math/Vector2.js';
import { SVGPathProperties } from '@lib/path/SVGPathProperties.js';
import { Easing } from '@lib/tween/Easing.js';
import { clearTween, delayedCall, tween } from '@lib/tween/Tween.js';
import { clamp, mapLinear } from '@lib/utils/Utils.js';

import { useMotion, useTicker } from '../../motion/index.js';

import { GraphLabel } from './GraphLabel.jsx';
import { GraphMarker } from './GraphMarker.jsx';

import './GraphLabel.css';
import './GraphMarker.css';
import './GraphSegments.css';

// ─── Module-level pure helpers ────────────────────────────────────────────────

const COLOR_STEP = 1 / 3 / 5;

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
 * Multi-segment line graph with per-segment axes, optional hover scrub,
 * segment labels, marker pins, and a ghost overlay.
 *
 * Per-frame value pushes go through the imperative handle (`update`), which
 * avoids React re-renders every tick.  Full array replacement uses the `value`
 * prop.
 *
 * @param {object}    props
 * @param {number[]}  [props.value]                    Initial data array.
 * @param {number[]}  [props.ghost]                    Ghost data array.
 * @param {number}    [props.width=300]
 * @param {number}    [props.height=60]
 * @param {number}    [props.resolution=80]
 * @param {number}    [props.precision=0]
 * @param {number|number[]} [props.lookupPrecision=0]  Per-segment or shared lookup size.
 * @param {number[]}  [props.segments=[]]              Lengths of each segment.
 * @param {number[]}  [props.ratio=[]]                 X-axis ratio overrides per segment.
 * @param {string[]}  [props.labels=[]]                Segment label strings.
 * @param {Array[]}   [props.markers=[]]               `[[x, name], …]` initial markers.
 * @param {number|number[]} [props.range=1]            Per-segment or shared y-axis max.
 * @param {string}    [props.suffix='']
 * @param {function}  [props.format]
 * @param {Array[]}   [props.data]                     Per-segment data arrays for cursor label.
 * @param {boolean}   [props.hoverLabels=false]        Show segment labels only on hover.
 * @param {boolean}   [props.noHover=false]
 * @param {boolean}   [props.noMarker=false]
 * @param {boolean}   [props.noMarkerDrag=false]
 * @param {boolean}   [props.noGradient=false]
 * @param {function}  [props.onMarkerAdd]
 * @param {function}  [props.onMarkerRemove]
 * @param {function}  [props.onMarkerClick]
 * @param {object}    [props.ref]
 *   Exposes `animateIn(fast?)`, `animateOut()`, `animateLabelsIn()`,
 *   `animateLabelsOut()`, and `update(value?)`.
 * @example
 * const graphRef = useRef(null);
 * <GraphSegments
 *     ref={graphRef}
 *     segments={[5, 5]}
 *     labels={['Left', 'Right']}
 *     lookupPrecision={100}
 * />
 */
export function GraphSegments({
    value,
    ghost,
    width = 300,
    height = 60,
    resolution = 80,
    precision = 0,
    lookupPrecision = 0,
    segments = [],
    ratio = [],
    labels: labelsProp = [],
    markers: markersProp = [],
    range = 1,
    suffix = '',
    format,
    data,
    hoverLabels = false,
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

    // Normalise lookupPrecision to an array of one entry per segment.
    const lookupPrecisions = useMemo(
        () => Array.isArray(lookupPrecision)
            ? lookupPrecision
            : new Array(segments.length).fill(lookupPrecision),
        [lookupPrecision, segments.length]
    );

    // ── DOM refs ─────────────────────────────────────────────────────────────
    const rootRef = useRef(null);
    const canvasRef = useRef(null);
    const infoRef = useRef(null);
    const dataLabelRef = useRef(null);

    // ── Animation props ───────────────────────────────────────────────────────
    const motion = useMotion({ alpha: 0, yMultiplier: 0, progress: 0 });
    const handleMotion = useMotion({ alpha: 0 });

    // ── Color / gradient ──────────────────────────────────────────────────────
    const lineColorsRef = useRef({ graph: '', bottom: '', handle: '' });
    const colorRangeRef = useRef(/** @type {Color[]} */([]));
    const colorBufRef = useRef(new Color());
    const strokeStyleRef = useRef(null);
    const fillStyleRef = useRef(null);

    // ── Data ──────────────────────────────────────────────────────────────────
    const arrayRef = useRef(/** @type {number[]} */([]));
    const ghostArrayRef = useRef(/** @type {number[]} */([]));
    const hasGhostRef = useRef(ghost !== undefined);
    const segmentsRatioRef = useRef(/** @type {number[]} */([]));
    const rangeHeightsRef = useRef(/** @type {number[]} */([]));
    const graphsRef = useRef(/** @type {object[]} */([]));
    const dataRef = useRef(data ?? null);

    // ── Interaction ───────────────────────────────────────────────────────────
    const mouseRef = useRef(new Vector2());
    const deltaRef = useRef(new Vector2());
    const lastTimeRef = useRef(0);
    const lastMouseRef = useRef(new Vector2());
    const mouseXRef = useRef(0);
    const boundsRef = useRef(null);
    const mobileOffset = navigator.maxTouchPoints ? -50 : 0;
    const isDraggingRef = useRef(false);
    const isDraggingAwayRef = useRef(false);
    const animatedInRef = useRef(false);
    const labelsAnimatedInRef = useRef(false);
    const hoveredInRef = useRef(false);
    const labelHoveredInRef = useRef(false);
    const needsUpdateRef = useRef(false);
    const graphNeedsUpdateRef = useRef(false);
    const hoverTimeoutRef = useRef(null);
    const infoOpacityRef = useRef(0);
    const dataLabelOpacityRef = useRef(0);

    // ── Label refs: one plain ref-like object per label, stable after mount ──
    const labelRefsArr = useMemo(
        () => labelsProp.map(() => ({ current: null })),
        [] // eslint-disable-line react-hooks/exhaustive-deps
    );

    // ── Marker state ──────────────────────────────────────────────────────────
    const markerDataRef = useRef(/** @type {object[]} */([]));
    const [markerVersion, setMarkerVersion] = useState(0);

    // ── Helpers ───────────────────────────────────────────────────────────────

    function getRangeHeights(r) {
        if (Array.isArray(r)) {
            return r.map(rv => (height - 5) / rv);
        }

        return new Array(segments.length).fill((height - 5) / r);
    }

    function getSegmentsRatio(rat) {
        if (rat.length) {
            return segments.map((len, i) => (arrayRef.current.length * rat[i]) / len);
        }

        return segments.map(() => 1);
    }

    // ── Canvas initialisation ─────────────────────────────────────────────────

    const rebuildGradients = useCallback(() => {
        const canvas = canvasRef.current;

        if (!canvas || colorRangeRef.current.length === 0) return;

        const ctx = canvas.getContext('2d');

        strokeStyleRef.current = buildGradient(ctx, 0, height, 0, 0, colorRangeRef.current, colorBufRef.current, 1);
        fillStyleRef.current = buildGradient(ctx, 0, height, 0, 0, colorRangeRef.current, colorBufRef.current, 0.07);
    }, [height]);

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

        // Per-segment lookup graph objects (only needed when hovering).
        if (!noHover && lookupPrecisions.some(lp => lp > 0)) {
            graphsRef.current = segments.map((_, i) => ({
                pathData: '',
                lookup: [],
                lookupPrecision: lookupPrecisions[i]
            }));
        }

        resizeCanvas(canvasRef.current, width, height);
        rebuildGradients();
        setRange(range);
        setArray(value);

        if (hasGhostRef.current) setGhostArray(ghost);

        rangeHeightsRef.current = getRangeHeights(range);

        needsUpdateRef.current = true;
        graphNeedsUpdateRef.current = lookupPrecisions.some(lp => lp > 0);

        if (!noMarker && markersProp.length) {
            markersProp.forEach(m => addMarker(m, true));
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (colorRangeRef.current.length === 0) return;

        resizeCanvas(canvasRef.current, width, height);
        rebuildGradients();
        rangeHeightsRef.current = getRangeHeights(range);
        needsUpdateRef.current = true;

        if (lookupPrecisions.some(lp => lp > 0)) {
            graphNeedsUpdateRef.current = true;
        }
    }, [width, height, rebuildGradients]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (colorRangeRef.current.length === 0) return;
        setRange(range);
    }, [range]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (colorRangeRef.current.length === 0) return;
        setArray(value);
    }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (colorRangeRef.current.length === 0) return;
        setGhostArray(ghost);
    }, [ghost]);

    useEffect(() => {
        dataRef.current = data ?? null;
    }, [data]);

    // Start tweens for newly added markers.
    useLayoutEffect(() => {
        markerDataRef.current.forEach(marker => {
            if (marker.tweenPending) {
                marker.tweenPending = false;
                tween(marker, { multiplier: 1 }, 400, 'easeOutCubic', null, () => {
                    needsUpdateRef.current = true;
                    const h = marker.markerRef.current;

                    if (h?.element) h.element.style.opacity = marker.multiplier;
                });
            }
        });
    }, [markerVersion]);

    // ─── Data helpers ─────────────────────────────────────────────────────────

    function setRange(r) {
        rangeHeightsRef.current = getRangeHeights(r);
        needsUpdateRef.current = true;

        if (lookupPrecisions.some(lp => lp > 0)) {
            graphNeedsUpdateRef.current = true;
        }
    }

    function setArray(val) {
        arrayRef.current = Array.isArray(val)
            ? val
            : new Array(resolution).fill(0);

        segmentsRatioRef.current = getSegmentsRatio(ratio);
        needsUpdateRef.current = true;

        if (lookupPrecisions.some(lp => lp > 0)) {
            graphNeedsUpdateRef.current = true;
        }
    }

    function setGhostArray(val) {
        ghostArrayRef.current = Array.isArray(val)
            ? val
            : new Array(arrayRef.current.length).fill(0);

        needsUpdateRef.current = true;
    }

    // ─── Lookup ───────────────────────────────────────────────────────────────

    function calculateLookupForGraph(graph) {
        const props2 = new SVGPathProperties(graph.pathData);
        const len = props2.getTotalLength();
        const lookup = [];
        let i = 0;

        while (i <= 1) {
            lookup.push(props2.getPointAtLength(i * len));
            i += 1 / graph.lookupPrecision;
        }

        graph.lookup = lookup;
    }

    function getCurveY(graph, mX, segW) {
        const { lookup, lookupPrecision: lp } = graph;
        const x = mX * segW * width;
        const approxIndex = Math.floor(mX * lp);
        let i = Math.max(1, approxIndex - Math.floor(lp / 4));

        for (; i < lp; i++) {
            if (lookup[i].x > x) break;
        }

        if (i === lp) return lookup[lp - 1].y;

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

        const p = motion.values;
        const l = array.length;
        let end = 0;
        let endX = 0;

        for (let i = 0; i < segments.length; i++) {
            const start = end;
            end += segments[i];

            const startX = endX;
            const segmentWidth = (segments[i] / l) * segmentsRatioRef.current[i] * width;
            endX += segmentWidth;

            if (p.progress === 1) {
                ctx.beginPath();
            }

            for (let j = 0; j < segments[i] - 1; j++) {
                const x0 = (j / (segments[i] - 1)) * segmentWidth;
                const x1 = ((j + 1) / (segments[i] - 1)) * segmentWidth;
                const y0 = array[start + j] * rangeHeightsRef.current[i];
                const y1 = array[start + j + 1] * rangeHeightsRef.current[i];
                const mx = (x0 + x1) / 2;
                const my = (y0 + y1) / 2;
                const cpx0 = (mx + x0) / 2;
                const cpx1 = (mx + x1) / 2;

                if (j === 0) {
                    if (graphNeedsUpdateRef.current && !ghost && graphsRef.current[i]) {
                        graphsRef.current[i].pathData = `M ${x0} ${h - y0}`;
                    }

                    if (p.progress === 1) {
                        ctx.moveTo(startX + x0, h - y0 * p.yMultiplier - 1);
                    }
                }

                if (graphNeedsUpdateRef.current && !ghost && graphsRef.current[i]) {
                    graphsRef.current[i].pathData += ` Q ${cpx0} ${h - y0} ${mx} ${h - my} Q ${cpx1} ${h - y1} ${x1} ${h - y1}`;
                }

                if (p.progress === 1) {
                    ctx.quadraticCurveTo(startX + cpx0, h - y0 * p.yMultiplier - 1, startX + mx, h - my * p.yMultiplier - 1);
                    ctx.quadraticCurveTo(startX + cpx1, h - y1 * p.yMultiplier - 1, startX + x1, h - y1 * p.yMultiplier - 1);
                }
            }

            if (p.progress === 1) {
                ctx.stroke();

                if (!noGradient) {
                    ctx.shadowBlur = 0;
                    ctx.lineTo(endX, height);
                    ctx.lineTo(startX, height);
                    ctx.fill();
                }
            }
        }

        if (p.progress < 1) {
            ctx.beginPath();
            ctx.moveTo(0, h);
            ctx.lineTo(w, h);
            ctx.stroke();
        }
    }

    function drawGraph() {
        const p = motion.values;

        if (p.alpha <= 0) return;

        const canvas = canvasRef.current;

        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const l = arrayRef.current.length;
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

        // Segment divider lines + label positioning
        let segEnd = 0;

        for (let i = 0; i < segments.length; i++) {
            const segStart = segEnd;
            const segW = (segments[i] / l) * segmentsRatioRef.current[i];
            segEnd += segW;

            const x = segEnd * width;

            if (i < segments.length - 1) {
                ctx.beginPath();
                ctx.moveTo(x, h - 0.5);
                ctx.lineTo(x, h - 0.5 - (h - 0.5) * p.yMultiplier);
                ctx.stroke();
            }

            if (labelRefsArr[i]?.current?.css) {
                const lx = clamp((segStart + segW / 2) * width, 0.5, width - 0.5);

                labelRefsArr[i].current.css({ left: lx });
            }
        }

        // Ghost and main paths
        if (ghostArrayRef.current.length) {
            drawPath(ctx, w, h, ghostArrayRef.current, true);
        }

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
                    const mh = marker.markerRef.current;

                    if (mh?.element) mh.element.style.left = `${x}px`;
                }
            }
        }

        // Hover handle
        if (!noHover && !isDraggingAwayRef.current) {
            if (graphNeedsUpdateRef.current) {
                graphsRef.current.forEach(g => calculateLookupForGraph(g));
                graphNeedsUpdateRef.current = false;
            }

            const segLen = segments.length;
            let si = 0;
            let siStart = 0;
            let siWidth = 0;
            let siEnd = 0;
            let siStartX = 0;
            let siEndX = 0;

            for (; si < segLen; si++) {
                siStart = siEnd;
                siWidth = segments[si] / l;
                siEnd += siWidth;
                siStartX = siEndX;
                siEndX += siWidth * segmentsRatioRef.current[si];

                if (mouseXRef.current >= siStartX && mouseXRef.current <= siEndX) break;
            }

            if (si === segLen) si = segLen - 1;

            const segmentX = clamp(mapLinear(mouseXRef.current, siStartX, siEndX, 0, 1), 0, 1);
            let index = Math.floor(siStart * l + segmentX * segments[si]);

            if (index === l) index = l - 1;

            const val = arrayRef.current[index];
            const x = clamp(mouseXRef.current * width, 0.5, width - 0.5);
            let y;

            const graph = graphsRef.current[si];

            if (graph?.lookupPrecision) {
                y = getCurveY(graph, segmentX, siWidth * segmentsRatioRef.current[si]) - 1;
            } else {
                y = h - val * rangeHeightsRef.current[si] - 1;
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

            if (animatedInRef.current) {
                if (infoRef.current) {
                    infoRef.current.style.left = `${x}px`;
                    infoRef.current.textContent = formatFn(val.toFixed(precision));
                }

                if (dataLabelRef.current && dataRef.current) {
                    const segData = dataRef.current[si];

                    if (segData?.length) {
                        const dVal = segData[Math.floor(segmentX * segData.length)];

                        dataLabelRef.current.style.left = `${x}px`;
                        dataLabelRef.current.textContent = dVal;

                        if (hoveredInRef.current && !labelHoveredInRef.current) {
                            hoverDataLabelIn();
                        }
                    } else if (hoveredInRef.current && labelHoveredInRef.current) {
                        hoverDataLabelOut();
                    }
                }
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

        tween(handleMotion.values, { alpha: 1 }, 275, 'easeInOutCubic');

        if (infoRef.current) {
            clearTween(infoOpacityRef);
            infoRef.current.style.visibility = '';
            tween(infoOpacityRef, { current: 1 }, 275, 'easeInOutCubic', null, () => {
                if (infoRef.current) infoRef.current.style.opacity = infoOpacityRef.current;
            });
        }

        if (dataLabelRef.current && dataRef.current) {
            hoverDataLabelIn();
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

            if (infoRef.current) {
                infoRef.current.style.opacity = '0';
                infoRef.current.style.visibility = 'hidden';
                infoOpacityRef.current = 0;
            }
        } else {
            tween(handleMotion.values, { alpha: 0 }, 275, 'easeInOutCubic');

            if (infoRef.current) {
                tween(infoOpacityRef, { current: 0 }, 275, 'easeInOutCubic', () => {
                    if (infoRef.current) infoRef.current.style.visibility = 'hidden';
                }, () => {
                    if (infoRef.current) infoRef.current.style.opacity = infoOpacityRef.current;
                });
            }
        }

        if (dataLabelRef.current) {
            hoverDataLabelOut(fast);
        }

        hoveredInRef.current = false;
    }

    function hoverDataLabelIn() {
        if (!dataLabelRef.current) return;

        clearTween(dataLabelOpacityRef);
        dataLabelRef.current.style.visibility = '';
        tween(dataLabelOpacityRef, { current: 1 }, 275, 'easeInOutCubic', null, () => {
            if (dataLabelRef.current) dataLabelRef.current.style.opacity = dataLabelOpacityRef.current;
        });

        labelHoveredInRef.current = true;
    }

    function hoverDataLabelOut(fast) {
        if (!dataLabelRef.current) return;

        clearTween(dataLabelOpacityRef);

        if (fast) {
            dataLabelOpacityRef.current = 0;
            dataLabelRef.current.style.opacity = '0';
            dataLabelRef.current.style.visibility = 'hidden';
        } else {
            tween(dataLabelOpacityRef, { current: 0 }, 275, 'easeInOutCubic', () => {
                if (dataLabelRef.current) dataLabelRef.current.style.visibility = 'hidden';
            }, () => {
                if (dataLabelRef.current) dataLabelRef.current.style.opacity = dataLabelOpacityRef.current;
            });
        }

        labelHoveredInRef.current = false;
    }

    // ─── Label animation ──────────────────────────────────────────────────────

    function animateLabelsIn() {
        labelRefsArr.forEach(lr => {
            lr.current?.clearTween().tween({ opacity: 1 }, 400, 'easeOutCubic', 200);
        });

        labelsAnimatedInRef.current = true;
    }

    function animateLabelsOut() {
        labelRefsArr.forEach(lr => {
            lr.current?.clearTween().tween({ opacity: 0 }, 300, 'easeOutSine');
        });

        labelsAnimatedInRef.current = false;
    }

    // ─── Marker helpers ───────────────────────────────────────────────────────

    function getMarkerName() {
        const names = markerDataRef.current.map(m => m.name);
        let count = 1;
        let name = `Marker ${count++}`;

        while (names.includes(name)) name = `Marker ${count++}`;

        return name;
    }

    function addMarker([x, name], fast) {
        const id = `${Date.now()}_${Math.random()}`;
        const markerRef = { current: null };
        const marker = { id, name, x, multiplier: 0, markerRef, tweenPending: false };

        markerDataRef.current.push(marker);
        setMarkerVersion(v => v + 1);

        if (animatedInRef.current) {
            if (fast) {
                marker.multiplier = 1;
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

    // ─── Pointer handlers ─────────────────────────────────────────────────────

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
        clearTween(dataLabelOpacityRef);
        markerDataRef.current.forEach(m => clearTween(m));
        labelRefsArr.forEach(lr => lr.current?.clearTween());
    }, [labelRefsArr]);

    // ─── Imperative handle ────────────────────────────────────────────────────

    useImperativeHandle(ref, () => ({
        /** @param {boolean} [fast=false] */
        animateIn: (fast = false) => {
            const p = motion.values;

            clearTween(p);
            labelRefsArr.forEach(lr => lr.current?.clearTween());
            markerDataRef.current.forEach(m => clearTween(m));

            if (fast) {
                p.alpha = 1;
                p.yMultiplier = 1;
                p.progress = 1;
                animatedInRef.current = true;
                needsUpdateRef.current = true;

                if (hoveredInRef.current) hoverIn();

                labelRefsArr.forEach(lr => lr.current?.css({ opacity: 1 }));

                markerDataRef.current.forEach(m => {
                    m.multiplier = 1;
                    const mh = m.markerRef.current;

                    if (mh?.element) mh.element.style.opacity = '1';
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

                        if (!hoverLabels) {
                            labelRefsArr.forEach(lr => {
                                lr.current?.clearTween().tween({ opacity: 1 }, 500, 'easeOutSine');
                            });
                        }

                        if (!noMarker) {
                            markerDataRef.current.forEach(m => {
                                tween(m, { multiplier: 1 }, 400, 'easeOutCubic', null, () => {
                                    needsUpdateRef.current = true;
                                    const mh = m.markerRef.current;

                                    if (mh?.element) mh.element.style.opacity = m.multiplier;
                                });
                            });
                        }
                    }, () => {
                        needsUpdateRef.current = true;
                    });
                }, () => {
                    needsUpdateRef.current = true;
                });

                if (hoverLabels) {
                    animateLabelsIn();
                }
            }
        },

        animateOut: () => {
            const p = motion.values;

            clearTween(p);
            labelRefsArr.forEach(lr => lr.current?.clearTween());
            markerDataRef.current.forEach(m => clearTween(m));

            animatedInRef.current = false;
            hoverOut(true);

            tween(p, { alpha: 0 }, 300, 'easeOutSine');

            tween(p, { yMultiplier: 0 }, 300, 'easeOutCubic', null, () => {
                needsUpdateRef.current = true;

                if (!noMarker) {
                    markerDataRef.current.forEach(m => {
                        m.multiplier = p.yMultiplier;
                        const mh = m.markerRef.current;

                        if (mh?.element) mh.element.style.opacity = m.multiplier;
                    });
                }
            });

            animateLabelsOut();
        },

        /** Show segment labels (called separately when `hoverLabels` is true). */
        animateLabelsIn,

        /** Hide segment labels. */
        animateLabelsOut,

        /**
         * Push a live value into the rolling buffer each frame.
         * @param {number|number[]} [val]
         */
        update: val => {
            if (val !== undefined) {
                if (Array.isArray(val)) {
                    setArray(val);
                } else {
                    if (hasGhostRef.current) {
                        const g = arrayRef.current.shift();
                        arrayRef.current.push(val);
                        ghostArrayRef.current.shift();
                        ghostArrayRef.current.push(g);
                    } else {
                        arrayRef.current.shift();
                        arrayRef.current.push(val);
                    }

                    needsUpdateRef.current = true;

                    if (lookupPrecisions.some(lp => lp > 0)) {
                        graphNeedsUpdateRef.current = true;
                    }
                }
            }
        },

        /** Replace the full data array without triggering a re-render. */
        setArray: val => setArray(val),
        /** Replace the full ghost array without triggering a re-render. */
        setGhostArray: val => setGhostArray(val),
        /** Update the y-axis scale. */
        setRange: r => setRange(r)
    }), [noMarker, hoverLabels, labelRefsArr, lookupPrecisions]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div
            ref={rootRef}
            className="graph-segments"
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
            {!noHover && data && (
                <span
                    ref={dataLabelRef}
                    className="data-label"
                    style={{ opacity: 0, visibility: 'hidden' }}
                />
            )}
            {labelsProp.map((labelName, i) => (
                <GraphLabel
                    key={i}
                    ref={labelRefsArr[i]}
                    name={labelName}
                />
            ))}
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
