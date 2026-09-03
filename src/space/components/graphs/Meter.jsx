import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react';

import { Color } from '@lib/math/Color.js';
import { Easing } from '@lib/tween/Easing.js';
import { clearTween, tween } from '@lib/tween/Tween.js';

import { useAnimation, useMotion, useTicker } from '../../motion/index.js';

import './Meter.css';

// ─── Pure helpers ─────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Horizontal meter bar.
 *
 * A thin filled bar whose length encodes a scalar value relative to a range.
 * Supports ghost (previous value) overlay, an optional range label, and an
 * optional current-value readout.
 *
 * Per-frame value pushes use the imperative `update` handle to avoid
 * re-renders on every tick.
 *
 * @param {object}   props
 * @param {number}   [props.value]           Initial value.
 * @param {number}   [props.ghost]           Initial ghost value.
 * @param {number}   [props.width=300]
 * @param {number}   [props.precision=0]
 * @param {number}   [props.range=1]
 * @param {string}   [props.suffix='']
 * @param {function} [props.format]
 * @param {boolean}  [props.noRange=false]   Hides the max-value label.
 * @param {boolean}  [props.noText=false]    Hides all text.
 * @param {boolean}  [props.noGradient=false]
 * @param {object}   [props.ref]
 *   Exposes `animateIn(fast?)`, `animateOut()`, and `update(value?)`.
 *   Use `update` for per-frame live values.
 * @example
 * const meterRef = useRef(null);
 * <Meter ref={meterRef} value={0.5} precision={2} width={300} />
 * // Drive it live:
 * useTicker(() => meterRef.current.update(Math.random()));
 */
export function Meter({
    value,
    ghost,
    width = 300,
    precision = 0,
    range = 1,
    suffix = '',
    format,
    noRange = false,
    noText = false,
    noGradient = false,
    ref
}) {
    const formatFn = useMemo(() => format ?? (v => `${v}${suffix}`), [format, suffix]);
    const meterHeight = noRange ? 20 : noText ? 15 : 40;

    // ── DOM refs ─────────────────────────────────────────────────────────────
    const [rootRef, root] = useAnimation({ opacity: 0 });
    const canvasRef = useRef(null);
    const numberRef = useRef(null);
    const infoRef = useRef(null);

    // ── Animation props ───────────────────────────────────────────────────────
    const motion = useMotion({ xMultiplier: 0, progress: 0 });

    // ── Color / gradient ──────────────────────────────────────────────────────
    const lineColorsRef = useRef({ graph: '', bottom: '' });
    const colorRangeRef = useRef(/** @type {Color[]} */([]));
    const colorBufRef = useRef(new Color());
    const strokeStyleRef = useRef(null);

    // ── Data ──────────────────────────────────────────────────────────────────
    const valueRef = useRef(value ?? 0);
    const ghostRef = useRef(ghost ?? undefined);
    const rangeRef = useRef(range);
    const rangeWidthRef = useRef(width / range);
    const infoWidthRef = useRef(0);
    const animatedInRef = useRef(false);
    const needsUpdateRef = useRef(false);

    // ── Canvas init ───────────────────────────────────────────────────────────

    useLayoutEffect(() => {
        const rs = getComputedStyle(document.documentElement);

        lineColorsRef.current = {
            graph: rs.getPropertyValue('--ui-color-line').trim(),
            bottom: rs.getPropertyValue('--ui-color-graph-bottom-line').trim()
        };

        colorRangeRef.current = [
            new Color(rs.getPropertyValue('--ui-color-range-1').trim()),
            new Color(rs.getPropertyValue('--ui-color-range-2').trim()),
            new Color(rs.getPropertyValue('--ui-color-range-3').trim()),
            new Color(rs.getPropertyValue('--ui-color-range-4').trim())
        ];

        initWidth(width);

        // Set initial number text
        if (numberRef.current) {
            numberRef.current.textContent = formatFn(range.toFixed(precision));
        }

        // Set initial value
        applyValue(value ?? 0);

        // Measure info element width (deferred to next microtask like original's defer()).
        if (infoRef.current && !noRange) {
            Promise.resolve().then(() => {
                if (infoRef.current) {
                    infoWidthRef.current = infoRef.current.getBoundingClientRect().width;
                    // Reposition now that we have the width.
                    applyValue(valueRef.current);
                }
            });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (colorRangeRef.current.length === 0) return;
        initWidth(width);
    }, [width]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (colorRangeRef.current.length === 0) return;
        rangeRef.current = range;
        rangeWidthRef.current = width / range;

        if (numberRef.current) {
            numberRef.current.textContent = formatFn(range.toFixed(precision));
        }

        needsUpdateRef.current = true;
    }, [range, width, precision, formatFn]);

    useEffect(() => {
        if (colorRangeRef.current.length === 0) return;
        applyValue(value ?? 0);
    }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        ghostRef.current = ghost ?? undefined;
        needsUpdateRef.current = true;
    }, [ghost]);

    function initWidth(w) {
        const canvas = canvasRef.current;

        if (!canvas || colorRangeRef.current.length === 0) return;

        const dpr = 2;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(meterHeight * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${meterHeight}px`;
        canvas.getContext('2d').scale(dpr, dpr);

        rangeWidthRef.current = w / rangeRef.current;
        strokeStyleRef.current = buildGradient(canvas.getContext('2d'), 0, 0, w, 0, colorRangeRef.current, colorBufRef.current, 1);

        needsUpdateRef.current = true;
    }

    // ─── Value helpers ────────────────────────────────────────────────────────

    function applyValue(val) {
        valueRef.current = val;

        if (infoRef.current) {
            if (!noRange) {
                let x = width - val * rangeWidthRef.current;

                if (x + infoWidthRef.current > width) {
                    x = width - infoWidthRef.current;
                }

                infoRef.current.style.right = `${x}px`;
            }

            infoRef.current.textContent = formatFn(val.toFixed(precision));
        }

        needsUpdateRef.current = true;
    }

    // ─── Canvas drawing ───────────────────────────────────────────────────────

    const drawCallback = useCallback(() => {
        const canvas = canvasRef.current;

        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const p = motion.values;
        const y = noText ? 7 : 19;

        ctx.globalAlpha = 1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Bottom line
        ctx.lineWidth = 1;
        ctx.strokeStyle = lineColorsRef.current.bottom;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width * p.progress, y);
        ctx.stroke();

        // Ghost bar
        if (ghostRef.current !== undefined) {
            ctx.globalAlpha = 0.35;
            ctx.lineWidth = 1.5;

            if (noGradient) {
                ctx.strokeStyle = lineColorsRef.current.graph;
            } else {
                ctx.strokeStyle = strokeStyleRef.current;
                ctx.shadowColor = 'rgb(255 255 255 / 0.2)';
                ctx.shadowBlur = 15;
            }

            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(ghostRef.current * rangeWidthRef.current * p.xMultiplier, y);
            ctx.stroke();
        }

        // Main bar
        if (valueRef.current !== undefined) {
            ctx.globalAlpha = 1;
            ctx.lineWidth = 1.5;

            if (noGradient) {
                ctx.strokeStyle = lineColorsRef.current.graph;
            } else {
                ctx.strokeStyle = strokeStyleRef.current;
                ctx.shadowColor = 'rgb(255 255 255 / 0.2)';
                ctx.shadowBlur = 15;
            }

            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(valueRef.current * rangeWidthRef.current * p.xMultiplier, y);
            ctx.stroke();
        }
    }, [width, noText, noGradient]);

    // ─── Ticker ───────────────────────────────────────────────────────────────

    useTicker(() => {
        if (needsUpdateRef.current) {
            drawCallback();
            needsUpdateRef.current = false;
        }
    });

    // ─── Imperative handle ────────────────────────────────────────────────────

    useImperativeHandle(ref, () => ({
        /** @param {boolean} [fast=false] */
        animateIn: (fast = false) => {
            const p = motion.values;

            clearTween(p);

            if (fast) {
                p.xMultiplier = 1;
                p.progress = 1;
                animatedInRef.current = true;
                needsUpdateRef.current = true;

                if (infoRef.current) {
                    infoRef.current.style.opacity = '1';
                }

                root.stop().set({ opacity: 1 });
            } else {
                p.xMultiplier = 0;
                p.progress = 0;

                tween(p, { progress: 1 }, 500, 'easeInOutCubic', () => {
                    tween(p, { xMultiplier: 1 }, 400, 'easeOutCubic', () => {
                        animatedInRef.current = true;

                        if (infoRef.current) {
                            clearTween(infoRef.current);
                            infoRef.current.style.opacity = '0';
                            tween(infoRef.current, { opacity: 1 }, 275, 'easeInOutCubic', null, () => {
                                if (infoRef.current) infoRef.current.style.opacity = infoRef.current.opacity;
                            });
                        }
                    }, () => {
                        needsUpdateRef.current = true;
                    });
                }, () => {
                    needsUpdateRef.current = true;
                });

                root.stop().set({ opacity: 0 }).animate({ opacity: 1 }, 500, 'easeOutSine');
            }
        },

        animateOut: () => {
            const p = motion.values;

            clearTween(p);
            animatedInRef.current = false;

            tween(p, { xMultiplier: 0 }, 300, 'easeOutCubic', null, () => {
                needsUpdateRef.current = true;

                if (infoRef.current) {
                    infoRef.current.style.opacity = p.xMultiplier;
                }
            });

            root.stop().animate({ opacity: 0 }, 300, 'easeOutSine');
        },

        /**
         * Push a new value each frame. If `ghost` was configured at mount, the
         * previous value is promoted to the ghost bar.
         * @param {number} [val]
         */
        update: val => {
            if (val !== undefined) {
                if (ghostRef.current !== undefined) {
                    ghostRef.current = valueRef.current;
                }

                applyValue(val);
            }
        }
    }), [root]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Render ───────────────────────────────────────────────────────────────

    const showContainer = !noRange || !noText;
    const showNumber = !noRange && !noText;
    const showInlineInfo = !noText && noRange;
    const showAbsInfo = !noText && !noRange;

    return (
        <div
            ref={rootRef}
            className="meter"
            style={{ width, height: meterHeight }}
        >
            <canvas ref={canvasRef} />
            {showContainer && (
                <div className="container">
                    {showNumber && (
                        <span ref={numberRef} className="number" />
                    )}
                    {showInlineInfo && (
                        <span ref={infoRef} className="info" />
                    )}
                </div>
            )}
            {showAbsInfo && (
                <span
                    ref={infoRef}
                    className="info"
                    style={{ opacity: 0 }}
                />
            )}
        </div>
    );
}
