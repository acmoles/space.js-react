import { useImperativeHandle, useRef, useState } from 'react';

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
 * @param {React.ReactNode} [props.children] Optional sub-panel shown below.
 * @param {object}   [props.ref] Exposes `setValue(v)`.
 * @example
 * <Toggle name="Visible" value={true} onChange={e => console.log(e.value)} />
 */
export function Toggle({ name, value: initialValue = false, onChange, children, ref }) {
    const [value, setValueState] = useState(initialValue);
    const [showContent, setShowContent] = useState(true);

    const [circleRef, circle] = useAnimation({ opacity: initialValue ? 1 : 0.15 });

    const emitChange = (v, notify = true) => {
        if (notify) {
            if (onChange) onChange({ path: [], value: v, target: null });
        }
    };

    // Stable ref for latest value used in event handler
    const valueRef = useRef(value);

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
            setShowContent(show);
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
                <div className="group" style={{ display: showContent ? '' : 'none' }}>
                    {dynContent ?? children}
                </div>
            )}
        </div>
    );
}
