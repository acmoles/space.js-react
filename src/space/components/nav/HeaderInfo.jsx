import { useImperativeHandle, useRef } from 'react';

import { useAnimation, useTicker } from '../../motion/index.js';

import './HeaderInfo.css';

/**
 * A live FPS counter that floats right inside a `Header`. Its `animateIn` and
 * `animateOut` are driven by the parent `Header`, which staggers it with the
 * other header children. Panel support requires the `Panel` component (not yet
 * ported); `openPanel` is a no-op until then.
 *
 * @param {object} props
 * @param {object} [props.ref] Exposes `hide`, `animateIn(delay)`, `animateOut`,
 *   `enable`, `disable` and `openPanel`.
 * @example
 * const infoRef = useRef(null);
 * <HeaderInfo ref={infoRef} />
 * infoRef.current.animateIn();
 */
export function HeaderInfo({ ref }) {
    const [rootRef, root] = useAnimation();
    const [numberRef, numberCtrl] = useAnimation();

    const stateRef = useRef({ prev: 0, count: 0, fps: 0 });

    useTicker(() => {
        const s = stateRef.current;
        const now = performance.now();

        if (now - 1000 > s.prev) {
            s.fps = Math.round(s.count * 1000 / (now - s.prev));
            s.prev = now;
            s.count = 0;
        }

        s.count++;

        if (numberRef.current) {
            numberRef.current.textContent = s.fps;
        }
    });

    useImperativeHandle(ref, () => ({
        hide: () => root.stop().set({ x: -10, opacity: 0 }),
        animateIn: (delay = 0) => root.stop().set({ x: -10, opacity: 0 }).animate({ x: 0, opacity: 1 }, 1000, 'easeOutQuart', delay),
        animateOut: () => root.stop().animate({ opacity: 0 }, 400, 'easeOutCubic'),
        enable: () => numberCtrl.stop().animate({ opacity: 1 }, 400, 'easeInOutSine'),
        disable: () => numberCtrl.stop().animate({ opacity: 0.35 }, 400, 'easeInOutSine'),
        /** No-op until the Panel component is ported. */
        openPanel: () => {}
    }), [root, numberCtrl]);

    return (
        <div ref={rootRef} className="info header-info" style={{ float: 'right', padding: '10px' }}>
            <span ref={numberRef} className="number">0</span>
        </div>
    );
}
