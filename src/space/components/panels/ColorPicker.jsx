import { useContext, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';

import { Color } from '@lib/math/Color.js';
import { PI, PI60, PI90, Third, TwoPI, brightness, clamp, radToDeg } from '@lib/utils/Utils.js';
import { useAnimation } from '../motion/index.js';
import { PanelContext } from './PanelContext.js';

import './ColorPicker.css';

// Panel width from CSS variable (read once)
const PANEL_WIDTH = 100; // fallback; real value read on first render

function getPanelWidth() {
    const root = document.querySelector(':root');
    if (root) {
        const w = parseFloat(getComputedStyle(root).getPropertyValue('--ui-panel-width'));
        if (!isNaN(w)) return w;
    }
    return PANEL_WIDTH;
}

/**
 * Builds the SVG hue-ring gradient defs. Called once per instance.
 * @param {number} size - SVG canvas size in px (256)
 * @param {string} uid  - Unique ID prefix for gradient elements
 * @returns {{ defs: React.ReactNode[], paths: React.ReactNode[] }}
 */
function buildRing(size, uid) {
    const color = new Color();
    const strokeWidth = 30;
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

        const arr = [
            Math.sin(a1), -Math.cos(a1),
            Math.sin(am) * tan, -Math.cos(am) * tan,
            Math.sin(a2), -Math.cos(a2)
        ];

        const c = `#${color.setHSL(hue, 1, 0.5).getHexString()}`;

        if (i > 0) {
            const mapped = arr.map(v => ((v * radius) + middle).toFixed(2));
            const id = `${uid}_g${i}`;

            defs.push(
                <linearGradient
                    key={id}
                    id={id}
                    x1={mapped[0]}
                    y1={mapped[1]}
                    x2={mapped[4]}
                    y2={mapped[5]}
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset="0%" stopColor={lastColor} stopOpacity={1} />
                    <stop offset="100%" stopColor={c} stopOpacity={1} />
                </linearGradient>
            );

            paths.push(
                <path
                    key={`p${i}`}
                    d={`M ${mapped[0]} ${mapped[1]} Q ${mapped[2]} ${mapped[3]} ${mapped[4]} ${mapped[5]}`}
                    stroke={`url(#${id})`}
                    strokeWidth={strokeWidth}
                    strokeLinecap="butt"
                    fill="none"
                />
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
 * class. The SVG gradients are computed once per instance.
 *
 * `PanelGraph`, `PanelMeter` and `PanelThumbnail` that exist as children of
 * a `Panel` must be wrapped so that this component can reach the panel context.
 *
 * @param {object}   props
 * @param {string}   props.name        Path-name identifier.
 * @param {*}        [props.value]     Initial colour (any value accepted by `Color.set`).
 * @param {boolean}  [props.noSwatch=false] Hide the colour swatch.
 * @param {boolean}  [props.noText=false]   Hide the hex text.
 * @param {function} [props.onChange]  Called with `{ path, value: Color, target }`.
 * @param {object}   [props.ref] Exposes `setValue`, `setHSL`, `open`, `close`.
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

    const [isOpen, setIsOpen] = useState(false);
    const isOpenRef = useRef(false);

    const context = useContext(PanelContext);
    const onChangeRef = useRef(onChange);
    useEffect(() => { onChangeRef.current = onChange; });

    // Dimensions
    const dimsRef = useRef(null);
    const getDims = () => {
        if (!dimsRef.current) {
            const w = getPanelWidth();
            dimsRef.current = {
                width: w,
                height: 20,
                middle: w / 2,
                top: 20 + 9,
                size: 256,
                ratio: 256 / w,
                triangleRadius: 98,
                triangleSideLength: Math.sqrt(3) * 98
            };
        }
        return dimsRef.current;
    };

    // Colour state (mutable refs to avoid extra renders during drag)
    const colorValue = useRef(new Color().set(initialValue || 0));
    const hslRef = useRef({ h: 0, s: 0, l: 0 });
    colorValue.current.getHSL(hslRef.current);

    const helperColor = useRef(new Color());

    // Displayed hex
    const [hexText, setHexText] = useState(() => `0x${colorValue.current.getHexString().toUpperCase()}`);
    const [swatchColor, setSwatchColor] = useState(() => `#${colorValue.current.getHexString()}`);

    // Drag state
    const dragRef = useRef({
        isDown: false,
        firstDown: false,
        distance: 256,
        lastCursor: ''
    });

    // DOM refs for SVG dynamic parts
    const rootRef = useRef(null);
    const ringRef = useRef(null);
    const slGroupRef = useRef(null);
    const huePolyRef = useRef(null);
    const hueMarkerRef = useRef(null);
    const slMarkerRef = useRef(null);

    const [ringAnim, ring] = useAnimation({ opacity: 0 });

    // Build static SVG once
    const { defs: ringDefs, paths: ringPaths } = useMemo(() => {
        return buildRing(256, uid);
    }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

    const moveMarkers = () => {
        const { h, s, l } = hslRef.current;
        const dims = getDims();
        const radius = dims.triangleRadius;
        const angle = h * TwoPI;
        const hue = -angle + PI90;

        const hx = Math.cos(hue) * radius;
        const hy = -Math.sin(hue) * radius;
        const sx = Math.cos(hue - Third) * radius;
        const sy = -Math.sin(hue - Third) * radius;
        const vx = Math.cos(hue + Third) * radius;
        const vy = -Math.sin(hue + Third) * radius;
        const mx = (sx + vx) / 2;
        const my = (sy + vy) / 2;
        const a = (1 - Math.abs(l - 0.5) * 2) * s;
        const mx2 = sx + (vx - sx) * l + (hx - mx) * a;
        const my2 = sy + (vy - sy) * l + (hy - my) * a;

        const markerX = mx2 + 128;
        const markerY = my2 + 128;

        const invert = brightness(colorValue.current) > 0.6;

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
            slMarkerRef.current.setAttribute('cx', markerX);
            slMarkerRef.current.setAttribute('cy', markerY);
            slMarkerRef.current.style.fill = `#${colorValue.current.getHexString()}`;
            slMarkerRef.current.style.stroke = invert ? '#000' : '#fff';
        }
    };

    const applyUpdate = (notify = true) => {
        moveMarkers();
        const hex = colorValue.current.getHexString();
        setSwatchColor(`#${hex}`);
        setHexText(`0x${hex.toUpperCase()}`);
        if (notify && onChangeRef.current) {
            onChangeRef.current({ path: [], value: colorValue.current, target: null });
        }
    };

    // Pointer move/up stored as refs so handlers can refer to each other
    const moveHandlerRef = useRef(null);
    const upHandlerRef = useRef(null);

    const handlePointerDown = e => {
        if (!isOpenRef.current) return;

        dragRef.current.isDown = true;
        dragRef.current.firstDown = true;

        const dims = getDims();
        const bounds = rootRef.current.getBoundingClientRect();
        const offsetX = e.clientX - (bounds.left + dims.middle);
        const offsetY = e.clientY - (bounds.top + dims.top + dims.middle);
        const dist = Math.sqrt(offsetX * offsetX + offsetY * offsetY) * dims.ratio;
        dragRef.current.distance = dist;

        const move = ({ clientX, clientY }) => {
            if (!isOpenRef.current) return;
            const b = rootRef.current.getBoundingClientRect();
            const ox = clientX - (b.left + dims.middle);
            const oy = clientY - (b.top + dims.top + dims.middle);
            const d = Math.sqrt(ox * ox + oy * oy) * dims.ratio;
            const { h, s, l } = hslRef.current;

            if (dragRef.current.firstDown) {
                dragRef.current.firstDown = false;
                dragRef.current.distance = d;
            }

            if (dragRef.current.isDown && dragRef.current.distance < 128) {
                if (dragRef.current.distance > dims.triangleRadius) {
                    // Hue ring
                    const angle = Math.atan2(oy, ox);
                    hslRef.current.h = ((angle + PI90) / TwoPI + 1) % 1;
                } else {
                    // Saturation/lightness triangle
                    const x = ox * dims.ratio;
                    const y = oy * dims.ratio;
                    let angle = h * TwoPI + Math.PI;
                    if (angle < 0) angle += TwoPI;

                    let rad = Math.atan2(-y, x);
                    if (rad < 0) rad += TwoPI;

                    const aTriangle = dims.triangleRadius / 2;
                    let rad0 = (rad + PI90 + TwoPI + angle) % TwoPI;
                    let rad1 = rad0 % Third - PI60;
                    let b2 = Math.tan(rad1) * aTriangle;
                    let r = Math.sqrt(x * x + y * y);
                    const maxR = Math.sqrt(aTriangle * aTriangle + b2 * b2);

                    if (r > maxR) {
                        const dx = Math.tan(rad1) * r;
                        let rad2 = Math.atan(dx / maxR);
                        rad2 = clamp(rad2, -PI60, PI60);
                        rad += rad2 - rad1;
                        rad0 = (rad + PI90 + TwoPI + angle) % TwoPI;
                        rad1 = rad0 % Third - PI60;
                        b2 = Math.tan(rad1) * aTriangle;
                        r = Math.sqrt(aTriangle * aTriangle + b2 * b2);
                    }

                    const lightness = (Math.sin(rad0) * r) / dims.triangleSideLength + 0.5;
                    const w = 1 - Math.abs(lightness - 0.5) * 2;
                    const saturation = clamp(((Math.cos(rad0) * r + aTriangle) / (1.5 * dims.triangleRadius)) / w, 0, 1);

                    hslRef.current.s = saturation;
                    hslRef.current.l = lightness;

                    void s; void l; // suppress unused-var for destructured s, l
                }

                colorValue.current.setHSL(hslRef.current.h, hslRef.current.s, hslRef.current.l);
                applyUpdate();
            }
        };

        const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            moveHandlerRef.current = null;
            upHandlerRef.current = null;
            if (!isOpenRef.current) return;
            dragRef.current.isDown = false;
            dragRef.current.distance = 256;
        };

        moveHandlerRef.current = move;
        upHandlerRef.current = up;

        move(e);

        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    };

    const doOpen = () => {
        isOpenRef.current = true;
        setIsOpen(true);
        ring.stop().set({ y: -10, opacity: 0 }).animate({ y: 0, opacity: 1 }, 175, 'easeOutCubic');
        context.notifyOpen(rootRef.current);
    };

    const doClose = (fast = true) => {
        isOpenRef.current = false;
        if (fast) {
            ring.stop();
            setIsOpen(false);
        } else {
            ring.stop().animate({ y: -10, opacity: 0 }, 300, 'easeInCubic', () => {
                setIsOpen(false);
            });
        }
        context.notifyClose();
    };

    useImperativeHandle(ref, () => ({
        setValue(v, notify = true) {
            if (v && v.isColor) {
                colorValue.current.copy(v);
            } else {
                colorValue.current.set(v);
            }
            colorValue.current.getHSL(hslRef.current);
            applyUpdate(notify);
        },
        setHSL(h, s, l, notify = true) {
            hslRef.current = { h, s, l };
            colorValue.current.setHSL(h, s, l);
            applyUpdate(notify);
        },
        open: doOpen,
        close: doClose
    }), []); // eslint-disable-line react-hooks/exhaustive-deps

    // Update markers after mount and after isOpen changes
    useEffect(() => {
        moveMarkers();
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // Initial marker update
    useEffect(() => {
        moveMarkers();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Clean up drag handlers on unmount
    useEffect(() => () => {
        if (moveHandlerRef.current) {
            window.removeEventListener('pointermove', moveHandlerRef.current);
            window.removeEventListener('pointerup', upHandlerRef.current);
        }
    }, []);

    const dims = getDims();

    const handleContainerClick = () => {
        if (!isOpenRef.current) {
            // Close any other open picker in this panel first
            context.notifyClose();
            doOpen();
        } else {
            doClose(false);
        }
    };

    return (
        <div ref={rootRef} className="color-picker" style={{ height: isOpen ? dims.width + dims.height + 10 : dims.height }} onPointerDown={handlePointerDown}>
            {(!noSwatch || !noText) && (
                <div className="container" style={{ height: dims.height }} onClick={handleContainerClick}>
                    {!noSwatch && (
                        <div className="swatch" style={{ width: dims.height, height: dims.height, backgroundColor: swatchColor }} />
                    )}
                    {!noText && (
                        <div className="content">{hexText}</div>
                    )}
                </div>
            )}
            {isOpen && (
                <svg
                    ref={el => { ringAnim.element || void 0; ringRef.current = el; }}
                    className="color-ring"
                    ref={ringAnim}
                    viewBox="0 0 256 256"
                    width={256}
                    height={256}
                    style={{
                        top: dims.top,
                        width: dims.width,
                        height: dims.width
                    }}
                >
                    <defs>
                        <linearGradient id={`${uid}_sat`} x1={128 - 49.05} y1={0} x2={128 + 98} y2={0} gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#7f7f7f" stopOpacity={1} />
                            <stop offset="50%" stopColor="#7f7f7f" stopOpacity={0.5} />
                            <stop offset="100%" stopColor="#7f7f7f" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id={`${uid}_lit`} x1={0} y1={128 - 84.90} x2={0} y2={128 + 84.90} gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#fff" stopOpacity={1} />
                            <stop offset="50%" stopColor="#fff" stopOpacity={0} />
                            <stop offset="50%" stopColor="#000" stopOpacity={0} />
                            <stop offset="100%" stopColor="#000" stopOpacity={1} />
                        </linearGradient>
                        {ringDefs}
                    </defs>
                    <g>{ringPaths}</g>
                    <g
                        ref={slGroupRef}
                        style={{ transformOrigin: '128px 128px' }}
                    >
                        <polygon
                            ref={huePolyRef}
                            points="78.95 43.1 78.95 212.85 226 128"
                            fill="red"
                        />
                        <polygon
                            points="78.95 43.1 78.95 212.85 226 128"
                            fill={`url(#${uid}_sat)`}
                        />
                        <polygon
                            points="78.95 43.1 78.95 212.85 226 128"
                            fill={`url(#${uid}_lit)`}
                        />
                        <path
                            ref={hueMarkerRef}
                            d="M 255.75 136.5 Q 256 132.3 256 128 256 123.7 255.75 119.5 L 241 128 255.75 136.5 Z"
                            fill="none"
                            stroke="#fff"
                            strokeWidth={2}
                        />
                    </g>
                    <circle
                        ref={slMarkerRef}
                        cx={128}
                        cy={128}
                        r={6}
                        fill="none"
                        stroke="#fff"
                        strokeWidth={2}
                    />
                </svg>
            )}
        </div>
    );
}
