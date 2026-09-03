import { useEffect, useImperativeHandle, useRef, useState } from 'react';

import { useAnimation } from '../../motion/index.js';

import './PanelLink.css';

/**
 * A clickable text link with a hover underline animation, matching the
 * original `PanelLink` class exactly.
 *
 * @param {object}   props
 * @param {string}   props.name      Path-name identifier.
 * @param {string}   [props.value]   Displayed text / value forwarded through `onChange`.
 * @param {function} [props.onChange] Called with `{ path, value, target }` on click.
 * @param {object}   [props.ref] Exposes `setValue(v, notify?)`.
 * @example
 * <PanelLink name="source" value="Open" onChange={e => console.log(e.value)} />
 */
export function PanelLink({ value: initialValue, onChange, ref }) {
    const [value, setValueState] = useState(initialValue);
    const onChangeRef = useRef(onChange);

    useEffect(() => { onChangeRef.current = onChange; });

    const [lineRef, line] = useAnimation({
        transformOrigin: 'left center',
        scaleX: 0
    });

    useImperativeHandle(ref, () => ({
        setValue(v, notify = true) {
            setValueState(v);
            if (notify && onChangeRef.current) {
                onChangeRef.current({ path: [], value: v, target: null });
            }
        }
    }), []);

    const handleHover = e => {
        line.stop();
        if (e.type === 'mouseenter') {
            line.set({ transformOrigin: 'left center', scaleX: 0 }).animate({ scaleX: 1 }, 800, 'easeOutQuint');
        } else {
            line.set({ transformOrigin: 'right center' }).animate({ scaleX: 0 }, 500, 'easeOutQuint');
        }
    };

    const handleClick = () => {
        if (onChangeRef.current) {
            onChangeRef.current({ path: [], value, target: null });
        }
    };

    return (
        <div
            className="panel-link"
            onMouseEnter={handleHover}
            onMouseLeave={handleHover}
            onClick={handleClick}
        >
            {value}
            <span ref={lineRef} className="line" />
        </div>
    );
}
