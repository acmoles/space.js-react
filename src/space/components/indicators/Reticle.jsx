import { useImperativeHandle, useRef } from 'react';

import { useAnimation } from '../../motion/index.js';
import { ReticleInfo } from './ReticleInfo.jsx';

import './Reticle.css';

/**
 * A circular reticle that tracks a screen-space position.
 *
 * The reticle scales in and out with easing; its position is updated
 * imperatively by mutating `ref.current.position` then calling
 * `ref.current.update()` each frame.
 *
 * @param {object} props
 * @param {object} [props.data] `{ primary, secondary }` for the optional info label.
 * @param {object} [props.ref]
 *   Exposes `position { x, y }`, `update()`, `animateIn()`, `animateOut(callback)`,
 *   `activate()`, `deactivate()`, and the `animatedIn` flag.
 * @example
 * <Reticle data={{ primary: '42', secondary: 'ID' }} ref={reticleRef} />
 * // Per-frame in parent:
 * reticleRef.current.position.x = mouse.x;
 * reticleRef.current.position.y = mouse.y;
 * reticleRef.current.update();
 */
export function Reticle({ data, ref }) {
    const positionRef = useRef({ x: 0, y: 0 });
    const animatedInRef = useRef(false);
    const infoRef = useRef(null);

    const [rootRef, root] = useAnimation({ visibility: 'hidden' });

    useImperativeHandle(ref, () => ({
        get position() {
            return positionRef.current;
        },
        get animatedIn() {
            return animatedInRef.current;
        },
        update: () => {
            if (rootRef.current) {
                rootRef.current.style.left = `${positionRef.current.x}px`;
                rootRef.current.style.top = `${positionRef.current.y}px`;
            }
        },
        animateIn: () => {
            root.stop().set({ visibility: 'visible', scale: 0.25, opacity: 0 });
            root.animate({ scale: 1, opacity: 1 }, 400, 'easeOutCubic');

            if (infoRef.current) {
                infoRef.current.animateIn();
            }

            animatedInRef.current = true;
        },
        animateOut: callback => {
            root.stop().animate({ scale: 0, opacity: 0 }, 500, 'easeInCubic', () => {
                root.set({ visibility: 'hidden' });

                animatedInRef.current = false;

                if (callback) {
                    callback();
                }
            });

            if (infoRef.current) {
                infoRef.current.animateOut();
            }
        },
        activate: () => root.stop().animate({ opacity: 1 }, 300, 'easeOutSine'),
        deactivate: () => root.stop().animate({ opacity: 0 }, 300, 'easeOutSine')
    }), [root, rootRef]);

    return (
        <div ref={rootRef} className="reticle">
            <div className="center" />
            {data && <ReticleInfo ref={infoRef} data={data} />}
        </div>
    );
}
