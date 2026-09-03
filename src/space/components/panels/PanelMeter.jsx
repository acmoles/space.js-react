import { useCallback, useEffect, useImperativeHandle, useRef } from 'react';

import { Color } from '@lib/math/Color.js';
import { Easing } from '@lib/tween/Easing.js';
import { defer } from '@lib/tween/Tween.js';
import { useTicker } from '../motion/index.js';

import './PanelMeter.css';

function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * A panel meter component with a horizontal bar drawn on a canvas and
 * optional ghost value. The actual meter view can be composed via `children`.
 *
 * NOTE: This component includes its own canvas drawing; the `children` prop
 * is reserved for future composition with standalone meter components from
 * `src/space/components/indicators/`.
 *
 * @param {object}   props
 * @param {string}   props.name           Label text.
 * @param {number}   [props.precision=0]  Display precision.
 * @param {number}   [props.range=1]      Horizontal range.
 * @param {string}   [props.suffix='']    Number suffix.
 * @param {function} [props.format]       Number formatter.
 * @param {number}   [props.value]        Initial value.
 * @param {number}   [props.ghost]        Initial ghost value.
 * @param {boolean}  [props.noText=false] Hide number labels.
 * @param {boolean}  [props.noGradient=false] Use flat line colour.
 * @param {function} [props.callback]     Called on each tick; return new value.
 * @param {React.ReactNode} [props.children] Reserved for embedded views.
 * @param {object}   [props.ref] Exposes `enable`, `disable`, `setRange`, `setValue`, `setGhostValue`.
 * @example
 * <PanelMeter name="Load" range={1} value={0.5} />
 */
export function PanelMeter({
    name,
    precision = 0,
    range: initialRange = 1,
    suffix = '',
    format,
    value: initialValue,
    ghost: initialGhost,
    noText = false,
    noGradient = false,
    callback,
    children,
    ref
}) {
    const fmt = format || (v => `${v}${suffix}`);
    const height = noText ? 20 : 40;

    const rangeRef = useRef(initialRange);
    const rangeWidthRef = useRef(0);
    const valueRef = useRef(initialValue);
    const ghostRef = useRef(initialGhost !== undefined ? initialGhost : (initialValue !== undefined ? initialValue : undefined));
    const needsUpdateRef = useRef(true);
    const animatedInRef = useRef(false);

    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const widthRef = useRef(0);
    const strokeStyleRef = useRef(null);
    const numberRef = useRef(null);
    const infoRef = useRef(null);
    const infoWidthRef = useRef(0);

    const colorsRef = useRef(null);
    const helperColor = useRef(new Color());
    const colorStep = 1 / 3 / 5;

    const ensureColors = () => {
        if (!colorsRef.current) {
            colorsRef.current = {
                graph: getCSSVar('--ui-color-line'),
                bottom: getCSSVar('--ui-color-graph-bottom-line'),
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

    const toRGBA = (c, alpha) =>
        `rgb(${Math.round(c.r * 255)} ${Math.round(c.g * 255)} ${Math.round(c.b * 255)} / ${alpha})`;

    const createGradient = useCallback((x0, y0, x1, y1) => {
        if (!ctxRef.current) return null;
        const { range: colorRange } = ensureColors();
        const gradient = ctxRef.current.createLinearGradient(x0, y0, x1, y1);
        let offset = 0;
        for (let i = 0; i < 3; i++) {
            for (let t = 0; t < 5; t++) {
                gradient.addColorStop(offset, toRGBA(helperColor.current.lerpColors(colorRange[i], colorRange[i + 1], Easing.easeInOutSine(t / 5)), 1));
                offset += colorStep;
            }
        }
        gradient.addColorStop(offset, toRGBA(colorRange[3], 1));
        return gradient;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const setRange = useCallback(r => {
        rangeRef.current = r;
        rangeWidthRef.current = widthRef.current / r;
        if (numberRef.current) numberRef.current.textContent = fmt(r.toFixed(precision));
        needsUpdateRef.current = true;
    }, [fmt, precision]);

    const drawPath = useCallback((y, val, ghost) => {
        const ctx = ctxRef.current;
        if (!ctx) return;
        const { graph } = ensureColors();
        ctx.globalAlpha = ghost ? 0.35 : 1;
        ctx.lineWidth = 1.5;
        if (noGradient) {
            ctx.strokeStyle = graph;
        } else {
            ctx.strokeStyle = strokeStyleRef.current;
            ctx.shadowColor = 'rgb(255 255 255 / 0.2)';
            ctx.shadowBlur = 15;
        }
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(val * rangeWidthRef.current, y);
        ctx.stroke();
    }, [noGradient]); // eslint-disable-line react-hooks/exhaustive-deps

    const drawGraph = useCallback(() => {
        const ctx = ctxRef.current;
        const canvas = canvasRef.current;
        if (!ctx || !canvas) return;
        const { bottom } = ensureColors();
        const y = 19;

        ctx.globalAlpha = 1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.lineWidth = 1;
        ctx.strokeStyle = bottom;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(widthRef.current, y);
        ctx.stroke();

        if (ghostRef.current !== undefined) drawPath(y, ghostRef.current, true);
        if (valueRef.current !== undefined) drawPath(y, valueRef.current, false);
    }, [drawPath]); // eslint-disable-line react-hooks/exhaustive-deps

    const updateValue = useCallback(v => {
        if (v === undefined) return;
        valueRef.current = v;

        if (infoRef.current && infoWidthRef.current > 0) {
            let x = widthRef.current - v * rangeWidthRef.current;
            if (x + infoWidthRef.current > widthRef.current) x = widthRef.current - infoWidthRef.current;
            infoRef.current.style.right = `${x}px`;
            infoRef.current.textContent = fmt(v.toFixed(precision));
        }

        needsUpdateRef.current = true;
    }, [fmt, precision]);

    // FPS state
    const fpsStateRef = useRef(null);
    if (!callback && initialValue === undefined) {
        fpsStateRef.current = fpsStateRef.current || {
            last: performance.now(), time: 0, delta: 0,
            count: 0, prev: 0, fps: 0,
            refreshRate120: 1000 / 90, refreshRate240: 1000 / 180
        };
    }

    useTicker(useCallback(() => {
        if (!animatedInRef.current) return;
        const fps = fpsStateRef.current;
        if (fps) {
            fps.time = performance.now();
            fps.delta = fps.time - fps.last;
            fps.last = fps.time;
            if (fps.time - 1000 > fps.prev) {
                fps.fps = Math.round(fps.count * 1000 / (fps.time - fps.prev));
                fps.prev = fps.time;
                fps.count = 0;
                if (fps.delta < fps.refreshRate240) setRange(240);
                else if (fps.delta < fps.refreshRate120) setRange(120);
                else setRange(60);
            }
            fps.count++;
            updateValue(fps.fps);
        } else if (callback) {
            const newVal = callback(valueRef.current, null);
            if (newVal !== undefined) {
                if (ghostRef.current !== undefined) ghostRef.current = valueRef.current;
                updateValue(newVal);
            }
        }
        if (needsUpdateRef.current) {
            drawGraph();
            needsUpdateRef.current = false;
        }
    }, [drawGraph, setRange, updateValue, callback])); // eslint-disable-line react-hooks/exhaustive-deps

    useImperativeHandle(ref, () => ({
        enable() {
            animatedInRef.current = true;
        },
        disable() {
            animatedInRef.current = false;
        },
        setRange(r) { setRange(r); },
        setGhostValue(v) {
            ghostRef.current = !isNaN(v) ? v : valueRef.current;
            needsUpdateRef.current = true;
        },
        setValue(v) { updateValue(v); }
    }), [setRange, updateValue]);

    // Mount
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        ctxRef.current = canvas.getContext('2d');
        const w = parseFloat(getCSSVar('--ui-panel-width')) || 100;
        widthRef.current = w;

        const dpr = 2;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${height}px`;
        ctxRef.current.scale(dpr, dpr);

        strokeStyleRef.current = createGradient(0, 0, w, 0);
        setRange(rangeRef.current);

        if (initialValue !== undefined) updateValue(initialValue);

        // Measure info width after layout
        if (infoRef.current) {
            defer().then(() => {
                if (infoRef.current) {
                    infoWidthRef.current = infoRef.current.getBoundingClientRect().width;
                    updateValue(valueRef.current);
                }
            });
        }

        drawGraph();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="panel-meter" style={{ height }}>
            <div className="container">
                <span className="content">{name}</span>
                {!noText && <span ref={numberRef} className="number" />}
            </div>
            {!noText && (
                <div
                    ref={infoRef}
                    className="info"
                    style={{ position: 'absolute', right: 0, bottom: 3 }}
                >
                    {fmt(Number(0).toFixed(precision))}
                </div>
            )}
            <canvas ref={canvasRef} />
            {children}
        </div>
    );
}
