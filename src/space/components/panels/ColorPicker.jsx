import { useContext, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';

import { Color } from '@lib/math/Color.js';
import { PI60, PI90, Third, TwoPI, brightness, clamp, radToDeg } from '@lib/utils/Utils.js';
import { useAnimation } from '../motion/index.js';
import { PanelContext } from './PanelContext.js';

import './ColorPicker.css';

const SVG_SIZE = 256;

function getPanelWidth() {
    try {
        const w = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-panel-width'));
        return isNaN(w) ? 100 : w;
    } catch {
        return 100;
    }
}

/** Builds the static hue-ring gradient defs + arc paths once per instance. */
function buildRingElements(uid) {
    const color = new Color();
    const strokeWidth = 30;
    const size = SVG_SIZE;
    const radius = (size - strokeWidth) / 2;
    const middle = size / 2;
    const segments = 24;
    const nudge = 8 / radius / segments * Math.PI;

    const defs = [];
    const paths = [];
    let a1 = 0;
    let lastColor = '';

    for (let i = 0; i <= segments; i++) {
        const hue = i / segments;
        const a2 = hue * TwoPI;
        const am = (a1 + a2) / 2;
        const tan = 1 / Math.cos((a2 - a1) / 2);

        const raw = [
            Math.sin(a1), -Math.cos(a1),
            Math.sin(am) * tan, -Math.cos(am) * tan,
            Math.sin(a2), -Math.cos(a2)
        ];

        const c = `#${color.setHSL(hue, 1, 0.5).getHexString()}`;

        if (i > 0) {
            const pts = raw.map(v => ((v * radius) + middle).toFixed(2));
            const gid = `${uid}g${i}`;
            defs.push(
                <linearGradient key={gid} id={gid} x1={pts[0]} y1={pts[1]} x2={pts[4]} y2={pts[5]} gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={lastColor} stopOpacity={1} />
                    <stop offset="100%" stopColor={c} stopOpacity={1} />
                </linearGradient>
            );
            paths.push(
                <path key={`p${i}`} d={`M ${pts[0]} ${pts[1]} Q ${pts[2]} ${pts[3]} ${pts[4]} ${pts[5]}`} stroke={`url(#${gid})`} strokeWidth={strokeWidth} strokeLinecap="butt" fill="none" />
            );
        }

        a1 = a2 - nudge;
        lastColor = c;
    }

    return { defs, paths };
}

/**
 * An HSL colour picker with a hue ring and a saturation/lightness triangle.
 * Pointer interaction and animation exactly match the original `ColorPicker`
 * class. `PanelGraph`, `PanelMeter` and `PanelThumbnail` are accepted as
 * `children` and rendered below the picker.
 *
 * @param {object}   props
 * @param {string}   props.name         Path-name identifier.
 * @param {*}        [props.value]      Initial colour (anything `Color.set` accepts).
 * @param {boolean}  [props.noSwatch=false] Hide the colour swatch square.
 * @param {boolean}  [props.noText=false]   Hide the hex label.
 * @param {function} [props.onChange]   Called with `{ path, value: Color, target }`.
 * @param {object}   [props.ref]  Exposes `setValue`, `setHSL`, `open`, `close`.
 * @example
 * <ColorPicker name="Diffuse" value={0xff0000} onChange={e => console.log(e.value.getHexString())} />
 */
export function ColorPicker({
    name: _name,
    value: initialValue,
    noSwatch = false,
    noText = false,
    onChange,
    ref
}) {
    const uid = useId().replace(/:/g, '_');
    const { defs: ringDefs, paths: ringPaths } = useMemo(() => buildRingElements(uid), [uid]); // eslint-disable-line react-hooks/exhaustive-deps

    const panelCtx = useContext(PanelContext);
    const onChangeRef = useRef(onChange);
    useEffect(() => { onChangeRef.current = onChange; });

    // Stable mutable colour/HSL state — avoids triggering re-renders during drag
    const colorVal = useRef(new Color());
    const hsl = useRef({ h: 0, s: 0, l: 0 });
    const helperColor = useRef(new Color());

    // Initialise colour synchronously
    colorVal.current.set(initialValue || 0);
    colorVal.current.getHSL(hsl.current);

    // React state: only what drives visible re-renders
    const [swatchBg, setSwatchBg] = useState(() => `#${colorVal.current.getHexString()}`);
    const [hexLabel, setHexLabel] = useState(() => `0x${colorVal.current.getHexString().toUpperCase()}`);
    const [isOpen, setIsOpen] = useState(false);

    const isOpenRef = useRef(false);

    // Dimensions — read from CSS variable once after mount
    const dims = useRef(null);
    const ensureDims = () => {
        if (!dims.current) {
            const w = getPanelWidth();
            dims.current = {
                w,
                height: 20,
                middle: w / 2,
                top: 29, // height + 9
                ratio: SVG_SIZE / w,
                triRadius: 98,
                triSide: Math.sqrt(3) * 98
            };
        }
        return dims.current;
    };

    // DOM refs
    const rootRef = useRef(null);
    const [svgRef, svgAnim] = useAnimation({ display: 'none', opacity: 0 });
    const slGroupRef = useRef(null);
    const huePolyRef = useRef(null);
    const hueMarkerRef = useRef(null);
    const slMarkerRef = useRef(null);

    // Drag state
    const isDragDown = useRef(false);
    const firstDown = useRef(false);
    const dragDist = useRef(SVG_SIZE);
    const moveHandlerRef = useRef(null);
    const upHandlerRef = useRef(null);

    /** Synchronise the SVG dynamic markers with current hsl/color */
    const moveMarkers = () => {
        const { h, s, l } = hsl.current;
        const d = ensureDims();
        const R = d.triRadius;
        const angle = h * TwoPI;
        const hue = -angle + PI90;

        const hx = Math.cos(hue) * R;
        const hy = -Math.sin(hue) * R;
        const sx = Math.cos(hue - Third) * R;
        const sy = -Math.sin(hue - Third) * R;
        const vx = Math.cos(hue + Third) * R;
        const vy = -Math.sin(hue + Third) * R;
        const mx = (sx + vx) / 2;
        const my = (sy + vy) / 2;
        const a = (1 - Math.abs(l - 0.5) * 2) * s;
        const px = sx + (vx - sx) * l + (hx - mx) * a;
        const py = sy + (vy - sy) * l + (hy - my) * a;

        const invert = brightness(colorVal.current) > 0.6;

        if (slGroupRef.current) {
            slGroupRef.current.style.transform = `rotate(${radToDeg(angle - PI90)}deg)`;
        }
        if (huePolyRef.current) {
            huePolyRef.current.style.fill = `#${helperColor.current.setHSL(h, 1, 0.5).getHexString()}`;
        }
        if (hueMarkerRef.current) {
            hueMarkerRef.current.style.stroke = invert ? '#000' : '#fff';
        }
        if (slMarkerRef.current) {
            slMarkerRef.current.setAttribute('cx', String(px + 128));
            slMarkerRef.current.setAttribute('cy', String(py + 128));
            slMarkerRef.current.style.fill = `#${colorVal.current.getHexString()}`;
            slMarkerRef.current.style.stroke = invert ? '#000' : '#fff';
        }
    };

    const emitAndSync = (notify = true) => {
        moveMarkers();
        const hex = colorVal.current.getHexString();
        setSwatchBg(`#${hex}`);
        setHexLabel(`0x${hex.toUpperCase()}`);
        if (notify && onChangeRef.current) {
            onChangeRef.current({ path: [], value: colorVal.current, target: null });
        }
    };

    // Initial markers after mount
    useEffect(() => { moveMarkers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const closeRing = (fast = true) => {
        isOpenRef.current = false;
        setIsOpen(false);
        svgAnim.stop();
        if (fast) {
            svgAnim.set({ display: 'none' });
        } else {
            svgAnim.animate({ y: -10, opacity: 0 }, 300, 'easeInCubic', () => {
                svgAnim.set({ display: 'none' });
            });
        }
    };

    const openRing = () => {
        isOpenRef.current = true;
        setIsOpen(true);
        svgAnim.stop().set({ display: '', y: -10, opacity: 0 }).animate({ y: 0, opacity: 1 }, 175, 'easeOutCubic', () => {
            moveMarkers();
        });
        panelCtx.notifyOpen(rootRef.current, () => closeRing(true));
    };

    useImperativeHandle(ref, () => ({
        setValue(v, notify = true) {
            if (v && v.isColor) colorVal.current.copy(v);
            else colorVal.current.set(v);
            colorVal.current.getHSL(hsl.current);
            emitAndSync(notify);
        },
        setHSL(h, s, l, notify = true) {
            hsl.current = { h, s, l };
            colorVal.current.setHSL(h, s, l);
            emitAndSync(notify);
        },
        open: openRing,
        close: closeRing
    }), []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleContainerClick = () => {
        if (!isOpenRef.current) {
            openRing();
        } else {
            closeRing(false);
            panelCtx.notifyClose();
        }
    };

    const handlePointerDown = e => {
        if (!isOpenRef.current) return;

        isDragDown.current = true;
        firstDown.current = true;

        const d = ensureDims();
        const b = rootRef.current.getBoundingClientRect();
        const ox = e.clientX - (b.left + d.middle);
        const oy = e.clientY - (b.top + d.top + d.middle);
        dragDist.current = Math.sqrt(ox * ox + oy * oy) * d.ratio;

        const move = ({ clientX, clientY }) => {
            if (!isOpenRef.current) return;
            const b2 = rootRef.current.getBoundingClientRect();
            const offX = clientX - (b2.left + d.middle);
            const offY = clientY - (b2.top + d.top + d.middle);
            const dist = Math.sqrt(offX * offX + offY * offY) * d.ratio;

            if (firstDown.current) {
                firstDown.current = false;
                dragDist.current = dist;
            }

            if (!isDragDown.current || dragDist.current >= 128) return;

            if (dragDist.current > d.triRadius) {
                // Hue ring
                const ang = Math.atan2(offY, offX);
                hsl.current.h = ((ang + PI90) / TwoPI + 1) % 1;
            } else {
                // Saturation / lightness triangle
                const rx = offX * d.ratio;
                const ry = offY * d.ratio;
                const { h } = hsl.current;
                let ang = h * TwoPI + Math.PI;
                if (ang < 0) ang += TwoPI;

                let rad = Math.atan2(-ry, rx);
                if (rad < 0) rad += TwoPI;

                const aR = d.triRadius / 2;
                let rad0 = (rad + PI90 + TwoPI + ang) % TwoPI;
                let rad1 = rad0 % Third - PI60;
                let bR = Math.tan(rad1) * aR;
                let r = Math.sqrt(rx * rx + ry * ry);
                const maxR = Math.sqrt(aR * aR + bR * bR);

                if (r > maxR) {
                    const dx = Math.tan(rad1) * r;
                    let rad2 = clamp(Math.atan(dx / maxR), -PI60, PI60);
                    rad += rad2 - rad1;
                    rad0 = (rad + PI90 + TwoPI + ang) % TwoPI;
                    rad1 = rad0 % Third - PI60;
                    bR = Math.tan(rad1) * aR;
                    r = Math.sqrt(aR * aR + bR * bR);
                }

                const lightness = (Math.sin(rad0) * r) / d.triSide + 0.5;
                const w = 1 - Math.abs(lightness - 0.5) * 2;
                hsl.current.s = clamp(((Math.cos(rad0) * r + aR) / (1.5 * d.triRadius)) / w, 0, 1);
                hsl.current.l = lightness;
            }

            colorVal.current.setHSL(hsl.current.h, hsl.current.s, hsl.current.l);
            emitAndSync();
        };

        const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            moveHandlerRef.current = null;
            upHandlerRef.current = null;
            isDragDown.current = false;
            dragDist.current = SVG_SIZE;
        };

        moveHandlerRef.current = move;
        upHandlerRef.current = up;

        move(e);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    };

    // Clean up window listeners on unmount
    useEffect(() => () => {
        if (moveHandlerRef.current) {
            window.removeEventListener('pointermove', moveHandlerRef.current);
            window.removeEventListener('pointerup', upHandlerRef.current);
        }
    }, []);

    const d = ensureDims();

    return (
        <div
            ref={rootRef}
            className="color-picker"
            style={{ height: isOpen ? d.w + d.height + 10 : d.height }}
            onPointerDown={handlePointerDown}
        >
            {(!noSwatch || !noText) && (
                <div className="container" style={{ height: d.height }} onClick={handleContainerClick}>
                    {!noSwatch && (
                        <div className="swatch" style={{ width: d.height, height: d.height, backgroundColor: swatchBg }} />
                    )}
                    {!noText && (
                        <div className="content">{hexLabel}</div>
                    )}
                </div>
            )}
            <svg
                ref={svgRef}
                className="color-ring"
                viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
                width={SVG_SIZE}
                height={SVG_SIZE}
                style={{ top: d.top, width: d.w, height: d.w }}
            >
                <defs>
                    <linearGradient id={`${uid}sat`} x1={d.middle - 49.05} y1={0} x2={d.middle + 98} y2={0} gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#7f7f7f" stopOpacity={1} />
                        <stop offset="50%" stopColor="#7f7f7f" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#7f7f7f" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id={`${uid}lit`} x1={0} y1={d.middle - 84.90} x2={0} y2={d.middle + 84.90} gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#fff" stopOpacity={1} />
                        <stop offset="50%" stopColor="#fff" stopOpacity={0} />
                        <stop offset="50%" stopColor="#000" stopOpacity={0} />
                        <stop offset="100%" stopColor="#000" stopOpacity={1} />
                    </linearGradient>
                    {ringDefs}
                </defs>
                <g>{ringPaths}</g>
                <g ref={slGroupRef} style={{ transformOrigin: '128px 128px' }}>
                    <polygon ref={huePolyRef} points="78.95 43.1 78.95 212.85 226 128" fill="red" />
                    <polygon points="78.95 43.1 78.95 212.85 226 128" fill={`url(#${uid}sat)`} />
                    <polygon points="78.95 43.1 78.95 212.85 226 128" fill={`url(#${uid}lit)`} />
                    <path
                        ref={hueMarkerRef}
                        d="M 255.75 136.5 Q 256 132.3 256 128 256 123.7 255.75 119.5 L 241 128 255.75 136.5 Z"
                        fill="none"
                        stroke="#fff"
                        strokeWidth={2}
                    />
                </g>
                <circle ref={slMarkerRef} cx={128} cy={128} r={6} fill="none" stroke="#fff" strokeWidth={2} />
            </svg>
        </div>
    );
}
