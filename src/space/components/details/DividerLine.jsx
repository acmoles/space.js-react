import { useImperativeHandle } from 'react';

import { useAnimation } from '../../motion/index.js';

import './DividerLine.css';

/**
 * A fixed pair of vertical tick lines (top and bottom) that animate in as a
 * section divider. Mirrors `lib/ui/DividerLine.js`.
 *
 * @param {object} props
 * @param {string} [props.left='max(50vw, 250px)'] CSS left value for both lines.
 * @param {object} [props.ref] Exposes `animateIn` and `animateOut`.
 * @example
 * <DividerLine left="100vw" ref={dividerRef} />
 */
export function DividerLine({ left = 'max(50vw, 250px)', ref }) {
    const [topRef, top] = useAnimation({
        transformOrigin: 'center top',
        scaleY: 0
    });
    const [bottomRef, bottom] = useAnimation({
        transformOrigin: 'center bottom',
        scaleY: 0
    });

    useImperativeHandle(ref, () => ({
        animateIn() {
            top.stop().animate({ scaleY: 1 }, 800, 'easeOutQuint');
            bottom.stop().animate({ scaleY: 1 }, 800, 'easeOutQuint');
        },
        animateOut() {
            top.stop().animate({ scaleY: 0 }, 500, 'easeOutQuint');
            bottom.stop().animate({ scaleY: 0 }, 500, 'easeOutQuint');
        }
    }), [top, bottom]);

    return (
        <div className="divider-line">
            <span ref={topRef} className="line top" style={{ left }} />
            <span ref={bottomRef} className="line bottom" style={{ left }} />
        </div>
    );
}
