import { useCallback, useImperativeHandle, useRef } from 'react';

import { useAnimation } from '../../motion/index.js';
import { TargetNumber } from './TargetNumber.jsx';

import './PointInfo.css';

/**
 * Label block shown next to a Point: name, type and optional target numbers.
 * Animates open/close with a horizontal tween.
 *
 * @param {object} props
 * @param {object} [props.data] `{ name, type }` strings.
 * @param {Array<string|number>} [props.targetNumbers] Numbers rendered as TargetNumber badges.
 * @param {function} [props.onContainerHover] Called with `mouseenter`/`mouseleave` events on the container.
 * @param {object} [props.ref]
 *   Exposes `animateIn()`, `animateOut(fast, callback)`, `open()`, `close(fast)`,
 *   `lock()`, `unlock()`, `enable()`, `disable()`.
 * @example
 * <PointInfo data={{ name: 'Camera', type: 'PerspectiveCamera' }} ref={infoRef} />
 */
export function PointInfo({ data, targetNumbers, onContainerHover, ref }) {
    const numberRefs = useRef([]);
    const stateRef = useRef({ locked: false, isOpen: false });

    const [rootRef, root] = useAnimation({ left: 10, top: -15 });
    const [containerRef, container] = useAnimation();

    const registerNumber = useCallback((index, handle) => {
        numberRefs.current[index] = handle;
    }, []);

    useImperativeHandle(ref, () => ({
        get isOpen() {
            return stateRef.current.isOpen;
        },
        get locked() {
            return stateRef.current.locked;
        },
        get container() {
            return containerRef.current;
        },
        animateIn: () => {
            root.stop().set({ left: 10, opacity: 0 }).animate({ opacity: 1 }, 400, 'easeOutCubic', 200);
        },
        animateOut: (fast, callback) => {
            root.stop();

            if (fast) {
                root.animate({ opacity: 0 }, 300, 'easeOutSine', callback);
            } else {
                root.animate({ opacity: 0 }, 400, 'easeInCubic', 300, callback);
            }
        },
        open: () => {
            root.stop().animate({ left: 48, opacity: 1 }, 400, 'easeOutCubic');

            if (stateRef.current.locked) {
                numberRefs.current.forEach(r => r && r.animateIn(100));
            }

            stateRef.current.isOpen = true;
        },
        close: fast => {
            root.stop();

            if (fast) {
                root.set({ left: 10, opacity: 1 });
            } else {
                root.animate({ left: 10, opacity: 1 }, 400, 'easeInCubic', 100);
            }

            numberRefs.current.forEach(r => r && r.animateOut(fast));

            stateRef.current.isOpen = false;
        },
        lock: () => {
            numberRefs.current.forEach(r => r && r.animateIn());

            stateRef.current.locked = true;
        },
        unlock: () => {
            numberRefs.current.forEach(r => r && r.animateOut());

            stateRef.current.locked = false;
        },
        enable: () => container.stop().animate({ opacity: 1 }, 400, 'easeInOutSine'),
        disable: () => container.stop().animate({ opacity: 0.35 }, 400, 'easeInOutSine')
    }), [root, container, containerRef]);

    const hasNumbers = targetNumbers && targetNumbers.length > 0;

    return (
        <div ref={rootRef} className="info">
            <div
                ref={containerRef}
                className="container"
                onMouseEnter={onContainerHover}
                onMouseLeave={onContainerHover}
            >
                {hasNumbers && (
                    <div className="numbers">
                        {targetNumbers.map((tn, i) => (
                            <TargetNumber
                                key={i}
                                ref={handle => registerNumber(i, handle)}
                                targetNumber={tn}
                            />
                        ))}
                    </div>
                )}
                <div className="name">{data?.name}</div>
                <div className="type">{data?.type}</div>
            </div>
        </div>
    );
}
