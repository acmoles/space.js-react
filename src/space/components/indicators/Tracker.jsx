import { useEffect, useImperativeHandle, useRef } from 'react';

import { clearTween, delayedCall } from '@lib/tween/Tween.js';

import { useAnimation } from '../../motion/index.js';
import { ReticleInfo } from './ReticleInfo.jsx';
import { TargetNumber } from './TargetNumber.jsx';

import './Tracker.css';

/**
 * A tracker overlay with animated corner brackets, an optional target number
 * and an optional info label. Placed in screen-space by the parent.
 *
 * @param {object} props
 * @param {boolean} [props.noCorners=false] Omit the corner brackets.
 * @param {object} [props.data] `{ targetNumber, primary, secondary }` for the optional sub-views.
 * @param {object} [props.ref]
 *   Exposes `position { x, y }`, `update()`, `animateIn()`, `animateOut(cb)`,
 *   `show()`, `hide(fast)`, `lock()`, `unlock()`,
 *   and `animatedIn`, `isVisible`, `isInstanced`, `locked` state.
 * @example
 * <Tracker data={{ targetNumber: 1 }} ref={trackerRef} />
 */
export function Tracker({ noCorners = false, data, ref }) {
    const dpr = window.devicePixelRatio;
    const tnSize = dpr > 1 ? 17 : 18;

    const rootRef = useRef(null);
    const positionRef = useRef({ x: 0, y: 0 });
    const stateRef = useRef({
        locked: false,
        animatedIn: false,
        isInstanced: false,
        isVisible: false
    });
    const numberRef = useRef(null);
    const infoRef = useRef(null);
    const timeoutRef = useRef(null);

    const [cornersRef, corners] = useAnimation({ visibility: 'hidden', scale: 1, opacity: 1 });

    useEffect(() => () => clearTween(timeoutRef.current), []);

    useImperativeHandle(ref, () => ({
        get position() {
            return positionRef.current;
        },
        get locked() {
            return stateRef.current.locked;
        },
        get animatedIn() {
            return stateRef.current.animatedIn;
        },
        get isInstanced() {
            return stateRef.current.isInstanced;
        },
        set isInstanced(val) {
            stateRef.current.isInstanced = val;
        },
        get isVisible() {
            return stateRef.current.isVisible;
        },
        update: () => {
            if (rootRef.current) {
                rootRef.current.style.left = `${positionRef.current.x}px`;
                rootRef.current.style.top = `${positionRef.current.y}px`;
            }
        },
        lock: () => {
            if (numberRef.current) {
                numberRef.current.animateIn();
            }

            stateRef.current.locked = true;
        },
        unlock: () => {
            if (numberRef.current) {
                numberRef.current.animateOut();
            }

            stateRef.current.locked = false;
        },
        show: () => {
            clearTween(timeoutRef.current);

            if (!noCorners) {
                corners.stop().animate({ scale: 1, opacity: 1 }, 400, 'easeOutCubic');
            }

            stateRef.current.animatedIn = true;
        },
        hide: fast => {
            if (stateRef.current.locked) {
                return;
            }

            if (!noCorners) {
                clearTween(timeoutRef.current);

                timeoutRef.current = delayedCall(fast ? 0 : 2000, () => {
                    corners.stop().animate({ opacity: 0 }, 400, 'easeOutCubic');
                });
            }

            stateRef.current.animatedIn = false;
        },
        animateIn: () => {
            clearTween(timeoutRef.current);

            if (!noCorners) {
                corners.stop().set({ visibility: 'visible', scale: 0.25, opacity: 0 });
                corners.animate({ scale: 1, opacity: 1 }, 400, 'easeOutCubic');
            }

            if (infoRef.current) {
                infoRef.current.animateIn();
            }

            stateRef.current.animatedIn = true;
            stateRef.current.isVisible = true;
        },
        animateOut: callback => {
            clearTween(timeoutRef.current);

            if (!noCorners) {
                corners.stop().animate({ scale: 0, opacity: 0 }, 500, 'easeInCubic', () => {
                    corners.set({ visibility: 'hidden' });

                    stateRef.current.animatedIn = false;
                    stateRef.current.isVisible = false;

                    if (callback) {
                        callback();
                    }
                });
            } else {
                stateRef.current.animatedIn = false;
                stateRef.current.isVisible = false;

                if (callback) {
                    callback();
                }
            }

            if (infoRef.current) {
                infoRef.current.animateOut();
            }
        }
    }), [corners, noCorners]);

    const hasTargetNumber = data && data.targetNumber;
    const hasInfo = data && (data.primary !== undefined || data.secondary !== undefined);

    return (
        <div ref={rootRef} className="tracker">
            {!noCorners && (
                <div ref={cornersRef} className="corners">
                    <div className="tl" />
                    <div className="tr" />
                    <div className="br" />
                    <div className="bl" />
                </div>
            )}
            {hasTargetNumber && (
                <TargetNumber
                    ref={numberRef}
                    targetNumber={data.targetNumber}
                    style={{
                        left: -(tnSize + 15),
                        top: '50%',
                        marginTop: -Math.round(tnSize / 2)
                    }}
                />
            )}
            {hasInfo && <ReticleInfo ref={infoRef} data={data} />}
        </div>
    );
}
