import { useImperativeHandle } from 'react';

import { useAnimation } from '../../motion/index.js';

import './ReticleInfo.css';

/**
 * Two-line label (primary + secondary) anchored to a Reticle or Tracker.
 *
 * @param {object} props
 * @param {object} [props.data] `{ primary, secondary }` strings to display.
 * @param {object} [props.ref] Exposes `animateIn()` and `animateOut()`.
 * @example
 * <ReticleInfo data={{ primary: '0.00', secondary: 'DIST' }} ref={ref} />
 */
export function ReticleInfo({ data, ref }) {
    const [rootRef, root] = useAnimation();

    useImperativeHandle(ref, () => ({
        animateIn: () => root.stop().set({ opacity: 0 }).animate({ opacity: 1 }, 400, 'easeOutCubic', 200),
        animateOut: () => root.stop().animate({ opacity: 0 }, 400, 'easeOutCubic')
    }), [root]);

    return (
        <div
            ref={rootRef}
            className="info"
            style={{
                left: '50%',
                top: '50%',
                marginLeft: 15,
                marginTop: -9
            }}
        >
            <div className="primary">{data?.primary}</div>
            <div className="secondary">{data?.secondary}</div>
        </div>
    );
}
