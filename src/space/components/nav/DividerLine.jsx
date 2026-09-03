import { useEffect, useImperativeHandle } from 'react';

import { useAnimation } from '../motion/index.js';

import './DividerLine.css';

/**
 * Two short vertical lines pinned to the top and bottom edges of the viewport,
 * centred at a configurable x position. They scale in/out along their own axis.
 *
 * @param {object} props
 * @param {number|string} [props.left] CSS `left` value applied to both lines.
 *   Accepts a number (treated as `px`) or any CSS string such as
 *   `'max(50vw, 250px)'`. Defaults to the CSS value when omitted.
 * @param {object} [props.ref] Exposes `animateIn` and `animateOut`.
 * @example
 * const dividerRef = useRef(null);
 * <DividerLine ref={dividerRef} />
 * dividerRef.current.animateIn();
 */
export function DividerLine({ left, ref }) {
    const [topRef, top] = useAnimation({ scaleY: 0 });
    const [bottomRef, bottom] = useAnimation({ scaleY: 0 });

    useEffect(() => {
        if (left !== undefined) {
            top.set({ left });
            bottom.set({ left });
        }
    }, [left, top, bottom]);

    useImperativeHandle(ref, () => ({
        animateIn: () => {
            top.stop().animate({ scaleY: 1 }, 800, 'easeOutQuint');
            bottom.stop().animate({ scaleY: 1 }, 800, 'easeOutQuint');
        },
        animateOut: () => {
            top.stop().animate({ scaleY: 0 }, 500, 'easeOutQuint');
            bottom.stop().animate({ scaleY: 0 }, 500, 'easeOutQuint');
        }
    }), [top, bottom]);

    return (
        <div className="divider-line">
            <div ref={topRef} className="line top" />
            <div ref={bottomRef} className="line bottom" />
        </div>
    );
}
