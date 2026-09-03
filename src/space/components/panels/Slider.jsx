import { useEffect, useImperativeHandle, useRef } from 'react';

import { useAnimation } from '../../motion/index.js';
import { clamp } from '@lib/utils/Utils.js';

import './Slider.css';

function getPrecision(step) {
    const str = String(step);
    const dot = str.indexOf('.') + 1;
    return dot === 0 ? 0 : str.length - dot;
}

/**
 * A drag-driven numeric slider that exactly matches the original `Slider` class.
 * Dragging left/right maps mouse position to value using the same relative-drag
 * maths, pointer-capture approach, and step quantisation as the original.
 *
 * @param {object}   props
 * @param {string}   props.name        Label text.
 * @param {number}   [props.min=0]     Minimum value.
 * @param {number}   [props.max=1]     Maximum value.
 * @param {number}   [props.step=0.01] Step size.
 * @param {number}   [props.value=0]   Initial value.
 * @param {function} [props.onChange]  Called with `{ path, value, target }`.
 * @param {React.ReactNode} [props.children] Optional sub-panel content.
 * @param {object}   [props.ref] Exposes `setValue(v, notify?)` and `toggleContent(show)`.
 * @example
 * <Slider name="Speed" min={0} max={10} step={0.1} value={5} onChange={e => console.log(e.value)} />
 */
export function Slider({
    name,
    min = 0,
    max = 1,
    step = 0.01,
    value: initialValue = 0,
    onChange,
    children,
    ref
}) {
    const precision = getPrecision(step);
    const range = max - min;

    const clampVal = v => parseFloat(clamp(v, min, max).toFixed(precision));

    const valueRef = useRef(clampVal(initialValue));
    const numberRef = useRef(null);
    const containerRef = useRef(null);
    const groupRef = useRef(null);
    const onChangeRef = useRef(onChange);

    useEffect(() => { onChangeRef.current = onChange; });

    const [lineRef, line] = useAnimation({ transformOrigin: 'left center', scaleX: 0 });

    const applyValue = (v, notify = true) => {
        const scaleX = (v - min) / range;
        line.set({ scaleX });
        if (numberRef.current) numberRef.current.textContent = v;
        if (notify && onChangeRef.current) {
            onChangeRef.current({ path: [], value: v, target: null });
        }
    };

    // Apply initial value after mount
    useEffect(() => {
        applyValue(valueRef.current, false);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useImperativeHandle(ref, () => ({
        setValue(v, notify = true) {
            const clamped = clampVal(v);
            valueRef.current = clamped;
            applyValue(clamped, notify);
        },
        toggleContent(show) {
            if (groupRef.current) groupRef.current.style.display = show ? '' : 'none';
        }
    }), []); // eslint-disable-line react-hooks/exhaustive-deps

    // Drag handler refs (stable function refs created once, closed over mutable refs)
    const moveHandlerRef = useRef(null);
    const upHandlerRef = useRef(null);

    const handlePointerDown = e => {
        if (!containerRef.current || !containerRef.current.contains(e.target)) return;

        const rootEl = containerRef.current.closest('.slider');
        const bounds = rootEl ? rootEl.getBoundingClientRect() : containerRef.current.getBoundingClientRect();

        const lastMouseX = e.clientX;
        const lastOriginX = e.clientX - bounds.left;
        const lastValue = valueRef.current;

        const move = ({ clientX }) => {
            const deltaX = clientX - lastMouseX;
            const originX = lastOriginX + deltaX;
            const raw = min + (originX / bounds.width) * range;
            let diff = raw - lastValue;
            diff = Math.floor(diff / step);
            const v = clampVal(lastValue + diff * step);

            valueRef.current = v;
            applyValue(v);
        };

        const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            moveHandlerRef.current = null;
            upHandlerRef.current = null;
        };

        moveHandlerRef.current = move;
        upHandlerRef.current = up;

        // Immediate update at click position
        move({ clientX: e.clientX });

        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    };

    // Clean up window listeners on unmount
    useEffect(() => () => {
        if (moveHandlerRef.current) {
            window.removeEventListener('pointermove', moveHandlerRef.current);
            window.removeEventListener('pointerup', upHandlerRef.current);
            moveHandlerRef.current = null;
            upHandlerRef.current = null;
        }
    }, []);

    return (
        <div className="slider">
            <div ref={containerRef} className="container" onPointerDown={handlePointerDown}>
                <span className="content">{name}</span>
                <span ref={numberRef} className="number">{clampVal(initialValue)}</span>
                <span ref={lineRef} className="line" />
            </div>
            {children && (
                <div ref={groupRef} className="group">
                    {children}
                </div>
            )}
        </div>
    );
}
