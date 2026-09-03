import { useCallback, useEffect, useImperativeHandle, useRef } from 'react';

import { Color } from '@lib/math/Color.js';
import { SVGPathProperties } from '@lib/path/SVGPathProperties.js';
import { Easing } from '@lib/tween/Easing.js';
import { clearTween, tween } from '@lib/tween/Tween.js';
import { clamp } from '@lib/utils/Utils.js';
import { useDelayedCall } from '../motion/index.js';
import { useTicker } from '../motion/index.js';

import './PanelGraph.css';

function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * A panel graph component with live canvas rendering, hover handle, and
 * optional FPS auto-measurement. The actual graph view is accepted via
 * `children` for future composition with standalone graph components.
 *
 * NOTE: This component includes its own canvas drawing; the `children` prop
 * is reserved for embedded views from `src/space/components/graphs/`.
 *
 * @param {object}   props
 * @param {string}   props.name              Label text.
 * @param {number}   [props.height=40]        Canvas height in px.
 * @param {number}   [props.resolution=80]    Array length for auto-FPS mode.
 * @param {number}   [props.precision=0]      Display precision.
 * @param {number}   [props.lookupPrecision=0] SVG path lookup precision for hover.
 * @param {number}   [props.range=1]          Y-axis range.
 * @param {string}   [props.suffix='']        Number suffix.
 * @param {function} [props.format]           Number formatter `(value) => string`.
 * @param {Array}    [props.value]            Initial data array.
 * @param {Array}    [props.ghost]            Initial ghost array.
 * @param {boolean}  [props.noText=false]     Hide number display.
 * @param {boolean}  [props.noHover=false]    Disable hover handle.
 * @param {boolean}  [props.noGradient=false] Use flat line colour instead of gradient.
 * @param {function} [props.callback]         Called on each tick; return new value.
 * @param {React.ReactNode} [props.children]  Reserved for embedded graph views.
 * @param {object}   [props.ref] Exposes `enable`, `disable`, `setRange`, `setArray`,
 *                               `setGhostArray`, `setValue`, `update`.
 * @example
 * <PanelGraph name="FPS" height={40} range={180} />
 */
export function PanelGraph({
    name,
    height = 40,
    resolution = 80,
    precision = 0,
    lookupPrecision = 0,
    range: initialRange = 1,
    suffix = '',
    format,
    value: initialValue,
    ghost: initialGhost,
    noText = false,
    noHover = false,
    noGradient = false,
    callback,
    children,
    ref
}) {
    const fmt = format || (v => `${v}${suffix}`);

    // Mutable data refs
    const arrayRef = useRef(Array.isArray(initialValue) ? (callback ? [...initialValue] : initialValue) : new Array(resolution).fill(0));
    const ghostArrayRef = useRef(null);
    const rangeRef = useRef(initialRange);
    const rangeHeightRef = useRef(0);
    const pathDataRef = useRef('');
    const lookupRef = useRef([]);
    const boundsRef = useRef(null);
    const mouseXRef = useRef(0);
    const animatedInRef = useRef(false);
    const hoveredInRef = useRef(false);
    const needsUpdateRef = useRef(true);
    const graphNeedsUpdateRef = useRef(false);

    // FPS mode
    const fpsStateRef = useRef(null);
    if (!callback && initialValue === undefined) {
        fpsStateRef.current = fpsStateRef.current || {
            last: performance.now(), time: 0, delta: 0,
            count: 0, prev: 0, fps: 0,
            refreshRate120: 1000 / 90, refreshRate240: 1000 / 180
        };
    }

    // Handle alpha for hover indicator
    const handlePropsRef = useRef({ alpha: 0 });

    // Canvas
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const widthRef = useRef(0);
    const strokeStyleRef = useRef(null);
    const fillStyleRef = useRef(null);

    // Info text
    const infoRef = useRef(null);
    const numberRef = useRef(null);

    const hoverInRef = useRef(false);
    const hoverTween = useRef(null);
    const delay = useDelayedCall();

    // Colours (read once after mount)
    const colorsRef = useRef(null);
    const ensureColors = () => {
        if (!colorsRef.current) {
            colorsRef.current = {
                graph: getCSSVar('--ui-color-line'),
                bottom: getCSSVar('--ui-color-graph-bottom-line'),
                handle: getCSSVar('--ui-color'),
                range: [
                    new Color(getCSSVar('--ui-color-range-1')),
                    new Color(getCSSVar('--ui-color-range-2')),
                    new Color(getCSSVar('--ui-color-range-3')),
                    new Color(getCSSVar('--ui-color-range-4'))
                ]
            };
        }
        return colorsRef.current;
    };

    const colorStep = 1 / 3 / 5;
    const helperColor = useRef(new Color());

    const toRGBA = (c, alpha) =>
        `rgb(${Math.round(c.r * 255)} ${Math.round(c.g * 255)} ${Math.round(c.b * 255)} / ${alpha})`;

    const createGradient = useCallback((x0, y0, x1, y1, alpha = 1) => {
        if (!ctxRef.current) return null;
        const { range: colorRange } = ensureColors();
        const gradient = ctxRef.current.createLinearGradient(x0, y0, x1, y1);
        let offset = 0;
        for (let i = 0; i < 3; i++) {
            for (let t = 0; t < 5; t++) {
                gradient.addColorStop(offset, toRGBA(helperColor.current.lerpColors(colorRange[i], colorRange[i + 1], Easing.easeInOutSine(t / 5)), alpha));
                offset += colorStep;
            }
        }
        gradient.addColorStop(offset, toRGBA(colorRange[3], alpha));
        return gradient;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const setRange = useCallback(r => {
        rangeRef.current = r;
        rangeHeightRef.current = (height - 5) / r;
        needsUpdateRef.current = true;
    }, [height]);

    const calculateLookup = useCallback(() => {
        const props = new SVGPathProperties(pathDataRef.current);
        const len = props.getTotalLength();
        const lookup = [];
        let i = 0;
        while (i <= 1) {
            lookup.push(props.getPointAtLength(i * len));
            i += 1 / lookupPrecision;
        }
        lookupRef.current = lookup;
    }, [lookupPrecision]);

    const getCurveY = useCallback(mx => {
        const lookup = lookupRef.current;
        const w = widthRef.current;
        const x = mx * w;
        const approxIndex = Math.floor(mx * lookupPrecision);
        let i = Math.max(1, approxIndex - Math.floor(lookupPrecision / 4));
        for (; i < lookupPrecision; i++) {
            if (lookup[i].x > x) break;
        }
        if (i === lookupPrecision) return lookup[lookupPrecision - 1].y;
        const lower = lookup[i - 1];
        const upper = lookup[i];
        const pct = (x - lower.x) / (upper.x - lower.x);
        return lower.y + (upper.y - lower.y) * pct;
    }, [lookupPrecision]);

    const drawPath = useCallback((h, arr, ghost) => {
        const ctx = ctxRef.current;
        if (!ctx) return;
        const { graph, range: colorRange } = ensureColors();

        ctx.globalAlpha = ghost ? 0.35 : 1;
        ctx.lineWidth = 1.5;

        if (noGradient) {
            ctx.strokeStyle = graph;
        } else {
            ctx.strokeStyle = strokeStyleRef.current;
            ctx.fillStyle = fillStyleRef.current;
            ctx.shadowColor = 'rgb(255 255 255 / 0.2)';
            ctx.shadowBlur = 15;
        }

        const l = arr.length;
        const w = widthRef.current;
        const doLookup = graphNeedsUpdateRef.current && !ghost;

        ctx.beginPath();

        for (let i = 0; i < l - 1; i++) {
            const x0 = (i / (l - 1)) * w;
            const x1 = ((i + 1) / (l - 1)) * w;
            const y0 = h - arr[i] * rangeHeightRef.current;
            const y1 = h - arr[i + 1] * rangeHeightRef.current;
            const mx = (x0 + x1) / 2;
            const my = (y0 + y1) / 2;
            const cpx0 = (mx + x0) / 2;
            const cpx1 = (mx + x1) / 2;

            if (i === 0) {
                if (doLookup) pathDataRef.current = `M ${x0} ${y0}`;
                ctx.moveTo(x0, y0 - 1);
            }
            if (doLookup) pathDataRef.current += ` Q ${cpx0} ${y0} ${mx} ${my} Q ${cpx1} ${y1} ${x1} ${y1}`;
            ctx.quadraticCurveTo(cpx0, y0 - 1, mx, my - 1);
            ctx.quadraticCurveTo(cpx1, y1 - 1, x1, y1 - 1);
        }

        ctx.stroke();

        if (!noGradient) {
            ctx.shadowBlur = 0;
            ctx.lineTo(w, height);
            ctx.lineTo(0, height);
            ctx.fill();
        }

        void colorRange; // used in createGradient
    }, [height, noGradient]);

    const drawGraph = useCallback(() => {
        const ctx = ctxRef.current;
        const canvas = canvasRef.current;
        if (!ctx || !canvas) return;
        const { bottom, handle } = ensureColors();
        const w = widthRef.current;
        const h = height - 1;

        ctx.globalAlpha = 1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Bottom line
        ctx.lineWidth = 1;
        ctx.strokeStyle = bottom;
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(w, h);
        ctx.stroke();

        if (ghostArrayRef.current && ghostArrayRef.current.length) drawPath(h, ghostArrayRef.current, true);
        if (arrayRef.current && arrayRef.current.length) drawPath(h, arrayRef.current, false);

        if (!noHover) {
            if (graphNeedsUpdateRef.current) {
                calculateLookup();
                graphNeedsUpdateRef.current = false;
            }

            const arr = arrayRef.current;
            let idx = Math.floor(mouseXRef.current * arr.length);
            if (idx >= arr.length) idx = arr.length - 1;
            const val = arr[idx];
            const x = clamp(mouseXRef.current * w, 0.5, w - 0.5);
            const y = lookupPrecision ? getCurveY(mouseXRef.current) - 1 : h - val * rangeHeightRef.current - 1;

            const alpha = handlePropsRef.current.alpha;
            ctx.globalAlpha = alpha < 0.001 ? 0 : alpha;
            ctx.lineWidth = 1;
            ctx.strokeStyle = handle;
            ctx.beginPath();
            ctx.moveTo(x, height);
            ctx.lineTo(x, y + 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.stroke();

            if (animatedInRef.current && infoRef.current) {
                infoRef.current.style.left = `${x}px`;
                infoRef.current.textContent = fmt(val.toFixed(precision));
            }
        }
    }, [height, noHover, precision, fmt, drawPath, calculateLookup, getCurveY]); // eslint-disable-line react-hooks/exhaustive-deps

    const doResize = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !ctxRef.current) return;
        const dpr = 2;
        canvas.width = Math.round(widthRef.current * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${widthRef.current}px`;
        canvas.style.height = `${height}px`;
        ctxRef.current.scale(dpr, dpr);
        strokeStyleRef.current = createGradient(0, height, 0, 0);
        fillStyleRef.current = createGradient(0, height, 0, 0, 0.07);
        needsUpdateRef.current = true;
    }, [height, createGradient]);

    // Mount: init canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        ctxRef.current = canvas.getContext('2d');
        const w = parseFloat(getCSSVar('--ui-panel-width')) || 100;
        widthRef.current = w;
        setRange(rangeRef.current);

        if (Array.isArray(initialValue)) {
            arrayRef.current = callback ? [...initialValue] : initialValue;
        }
        if (initialGhost !== undefined) {
            ghostArrayRef.current = Array.isArray(initialGhost) ? initialGhost : new Array(arrayRef.current.length).fill(0);
        }

        doResize();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Ticker update
    useTicker(useCallback(() => {
        const fps = fpsStateRef.current;
        if (fps) {
            fps.time = performance.now();
            fps.delta = fps.time - fps.last;
            fps.last = fps.time;
            if (fps.time - 1000 > fps.prev) {
                fps.fps = Math.round(fps.count * 1000 / (fps.time - fps.prev));
                fps.prev = fps.time;
                fps.count = 0;
                if (fps.delta < fps.refreshRate240) setRange(720);
                else if (fps.delta < fps.refreshRate120) setRange(360);
                else setRange(180);
            }
            fps.count++;
            if (numberRef.current) numberRef.current.textContent = fps.fps.toFixed(precision);
            const arr = arrayRef.current;
            if (ghostArrayRef.current) {
                const g = arr.shift();
                arr.push(fps.fps);
                ghostArrayRef.current.shift();
                ghostArrayRef.current.push(g);
            } else {
                arr.shift();
                arr.push(fps.fps);
            }
            needsUpdateRef.current = true;
            if (!noHover && lookupPrecision) graphNeedsUpdateRef.current = true;
        } else if (callback) {
            const newVal = callback(undefined, null);
            if (newVal !== undefined) {
                if (Array.isArray(newVal)) {
                    arrayRef.current = newVal;
                    needsUpdateRef.current = true;
                    if (!noHover && lookupPrecision) graphNeedsUpdateRef.current = true;
                } else {
                    const arr = arrayRef.current;
                    if (ghostArrayRef.current) {
                        const g = arr.shift();
                        arr.push(newVal);
                        ghostArrayRef.current.shift();
                        ghostArrayRef.current.push(g);
                    } else {
                        arr.shift();
                        arr.push(newVal);
                    }
                    needsUpdateRef.current = true;
                    if (!noHover && lookupPrecision) graphNeedsUpdateRef.current = true;
                    if (numberRef.current) numberRef.current.textContent = newVal.toFixed(precision);
                }
            }
        }

        if (needsUpdateRef.current || hoveredInRef.current) {
            drawGraph();
            needsUpdateRef.current = false;
        }
    }, [drawGraph, setRange, precision, noHover, lookupPrecision, callback]));

    // NOTE: useTicker above runs unconditionally; enable/disable is handled by animatedIn flag
    // The original only attaches the ticker when enabled, so we mirror that by only drawing when animatedIn

    const hoverIn = useCallback(() => {
        clearTween(hoverTween.current);
        hoverTween.current = tween(handlePropsRef.current, { alpha: 1 }, 275, 'easeInOutCubic', null, () => {
            needsUpdateRef.current = true;
        });
        if (infoRef.current) {
            infoRef.current.style.visibility = 'visible';
            tween({ opacity: 0 }, { opacity: 1 }, 275, 'easeInOutCubic', null, ({ opacity }) => {
                if (infoRef.current) infoRef.current.style.opacity = opacity;
            });
        }
        hoverInRef.current = true;
    }, []);

    const hoverOut = useCallback(() => {
        clearTween(hoverTween.current);
        hoverTween.current = tween(handlePropsRef.current, { alpha: 0 }, 275, 'easeInOutCubic', null, () => {
            needsUpdateRef.current = true;
        });
        if (infoRef.current) {
            tween({ opacity: 1 }, { opacity: 0 }, 275, 'easeInOutCubic', null, ({ opacity }) => {
                if (infoRef.current) {
                    infoRef.current.style.opacity = opacity;
                    if (opacity < 0.001) infoRef.current.style.visibility = 'hidden';
                }
            });
        }
        hoverInRef.current = false;
    }, []);

    const handleHover = useCallback(e => {
        if (!animatedInRef.current) {
            hoveredInRef.current = e.type === 'mouseenter';
            return;
        }
        if (e.type === 'mouseenter') {
            hoverIn();
        } else {
            delay(200, () => hoverOut());
        }
    }, [hoverIn, hoverOut, delay]);

    const handlePointerDown = useCallback(e => {
        if (!animatedInRef.current) return;
        if (canvasRef.current && canvasRef.current.parentElement.contains(e.target)) {
            boundsRef.current = canvasRef.current.getBoundingClientRect();
            mouseXRef.current = clamp((e.clientX - boundsRef.current.left) / widthRef.current, 0, 1);
            hoverIn();
        } else {
            hoverOut();
        }
    }, [hoverIn, hoverOut]);

    const handlePointerMove = useCallback(e => {
        if (!animatedInRef.current) return;
        boundsRef.current = canvasRef.current ? canvasRef.current.getBoundingClientRect() : null;
        if (boundsRef.current) {
            mouseXRef.current = clamp((e.clientX - boundsRef.current.left) / widthRef.current, 0, 1);
        }
    }, []);

    // Window pointerdown listener
    useEffect(() => {
        const handler = e => handlePointerDown(e);
        window.addEventListener('pointerdown', handler);
        return () => window.removeEventListener('pointerdown', handler);
    }, [handlePointerDown]);

    useImperativeHandle(ref, () => ({
        enable() {
            animatedInRef.current = true;
        },
        disable() {
            animatedInRef.current = false;
        },
        setRange(r) { setRange(r); },
        setArray(v) {
            if (Array.isArray(v)) {
                arrayRef.current = callback ? [...v] : v;
            } else {
                arrayRef.current = new Array(resolution).fill(0);
            }
            needsUpdateRef.current = true;
            if (!noHover && lookupPrecision) graphNeedsUpdateRef.current = true;
        },
        setGhostArray(v) {
            ghostArrayRef.current = Array.isArray(v) ? v : new Array(arrayRef.current.length).fill(0);
            needsUpdateRef.current = true;
        },
        setValue(v) {
            if (v === undefined || !numberRef.current) return;
            numberRef.current.textContent = v.toFixed(precision);
        },
        update(v) {
            if (v !== undefined) {
                if (Array.isArray(v)) {
                    arrayRef.current = v;
                } else {
                    const arr = arrayRef.current;
                    if (ghostArrayRef.current) {
                        const g = arr.shift(); arr.push(v);
                        ghostArrayRef.current.shift(); ghostArrayRef.current.push(g);
                    } else {
                        arr.shift(); arr.push(v);
                    }
                }
                needsUpdateRef.current = true;
                if (!noHover && lookupPrecision) graphNeedsUpdateRef.current = true;
            }
            drawGraph();
        }
    }), [setRange, drawGraph, precision, resolution, noHover, lookupPrecision, callback]);

    useEffect(() => () => {
        clearTween(hoverTween.current);
    }, []);

    return (
        <div
            className="panel-graph"
            style={{ height }}
            onMouseEnter={noHover ? undefined : handleHover}
            onMouseLeave={noHover ? undefined : handleHover}
            onPointerMove={noHover ? undefined : handlePointerMove}
        >
            <div className="container">
                <span className="content">{name}</span>
                {!noText && <span ref={numberRef} className="number" />}
            </div>
            {!noHover && (
                <div
                    ref={infoRef}
                    className="info"
                    style={{ visibility: 'hidden', opacity: 0 }}
                />
            )}
            <canvas ref={canvasRef} />
            {children}
        </div>
    );
}
