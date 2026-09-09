import { useEffect, useImperativeHandle, useRef, useState } from 'react';

import { useAnimation } from '../../motion/index.js';

import './Toggle.css';

/**
 * A boolean toggle control. Clicking toggles the value and animates the
 * circle indicator, matching the original `Toggle` class exactly.
 *
 * @param {object}   props
 * @param {string}   props.name     Label text.
 * @param {boolean}  [props.value=false] Initial value.
 * @param {function} [props.onChange] Called with `{ path, value, target }`.
 * @param {boolean}  [props.showContent] Controls sub-panel visibility. When
 *   omitted, visibility is driven imperatively via `toggleContent()`.
 * @param {React.ReactNode} [props.children] Optional sub-panel shown below.
 * @param {object}   [props.ref] Exposes `setValue(v)`.
 * @example
 * <Toggle name="Visible" value={true} onChange={e => console.log(e.value)} />
 */
export function Toggle({ name, value: initialValue = false, onChange, showContent, children, ref }) {
    const [value, setValueState] = useState(initialValue);
    const [showContentState, setShowContentState] = useState(true);
    const contentVisible = showContent ?? showContentState;

    const [circleRef, circle] = useAnimation({ opacity: initialValue ? 1 : 0.15 });

    const emitChange = (v, notify = true) => {
        if (notify) {
            if (onChange) onChange({ path: [], value: v, target: null });
        }
    };

    // Stable ref for latest value used in event handler
    const valueRef = useRef(value);

    // The original Toggle calls `setValue(this.value)` at the end of its
    // constructor, which notifies with the initial value.  Panel definitions
    // rely on that first callback to populate nested content, so mirror it on
    // mount.  The ref guard keeps it to a single emit under StrictMode.
    const emittedRef = useRef(false);

    useEffect(() => {
        if (emittedRef.current) return;
        emittedRef.current = true;
        emitChange(valueRef.current);
    });

    // Dynamic content — set imperatively via setContent()
    const dynContentRef = useRef(null);
    const [dynContent, setDynContent] = useState(null);

    useImperativeHandle(ref, () => ({
        setValue(v, notify = true) {
            valueRef.current = v;
            setValueState(v);
            circle.stop().animate({ opacity: v ? 1 : 0.15 }, 200, 'easeOutCubic');
            emitChange(v, notify);
        },
        hasContent() {
            return dynContentRef.current !== null;
        },
        setContent(node) {
            dynContentRef.current = node;
            setDynContent(node);
        },
        toggleContent(show) {
            setShowContentState(show);
        }
    }), [circle]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleClick = () => {
        const v = !valueRef.current;
        valueRef.current = v;
        setValueState(v);
        circle.stop().animate({ opacity: v ? 1 : 0.15 }, 200, 'easeOutCubic');
        emitChange(v);
    };

    return (
        <div className="toggle">
            <div className="container" onClick={handleClick}>
                <span className="content">{name}</span>
                <span ref={circleRef} className="circle">●</span>
            </div>
            {(children || dynContent) && (
                <div className="group" style={{ display: contentVisible ? '' : 'none' }}>
                    {dynContent ?? children}
                </div>
            )}
        </div>
    );
}
