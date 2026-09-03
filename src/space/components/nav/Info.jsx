import { useImperativeHandle } from 'react';

import { useAnimation } from '../motion/index.js';

import './Info.css';

/**
 * A fixed, centred info overlay that fades and slides in/out.
 *
 * @param {object} props
 * @param {string} props.content HTML content of the info box.
 * @param {boolean} [props.bottom=false] Pin to the bottom instead of the top.
 * @param {object} [props.ref] Exposes `animateIn(delay)` and `animateOut(callback)`.
 * @example
 * const infoRef = useRef(null);
 * <Info content="Hello world" ref={infoRef} />
 * infoRef.current.animateIn();
 */
export function Info({ content, bottom = false, ref }) {
    const [rootRef, root] = useAnimation({ visibility: 'hidden', opacity: 0 });
    const [contentRef, contentCtrl] = useAnimation();

    useImperativeHandle(ref, () => ({
        animateIn: (delay) => {
            root.set({ visibility: '' });
            root.stop().animate({ opacity: 1 }, 800, 'easeInOutSine', delay);
            contentCtrl.stop().set({ y: 10 }).animate({ y: 0 }, 1200, 'easeOutCubic', delay);
        },
        animateOut: (callback) => {
            root.stop().animate({ opacity: 0 }, 400, 'easeOutCubic', () => {
                root.set({ visibility: 'hidden' });
                callback?.();
            });
        }
    }), [root, contentCtrl]);

    return (
        <div
            ref={rootRef}
            className={bottom ? 'info info--bottom' : 'info info--top'}
        >
            {/* eslint-disable-next-line react/no-danger */}
            <div ref={contentRef} className="content" dangerouslySetInnerHTML={{ __html: content }} />
        </div>
    );
}
