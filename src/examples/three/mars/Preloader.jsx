import { useEffect, useImperativeHandle, useRef } from 'react';
import { clearTween, tween } from '@lib/three.js';

import { useAnimation } from '@/space/motion';

import { isMobile } from './config.js';

/**
 * Preloader overlay for the Mars example.
 *
 * Ported from `examples/mars/src/views/PreloaderView.js`. Shows a centred
 * loading label + percentage that tweens with the loader progress, then swaps
 * to a "Click to visit target" prompt once loading completes. The full overlay
 * animates out on start.
 *
 * Neutral class names (`mars-preloader-*`) are used deliberately so the
 * globally-scoped nav `.title` / `.info` styles cannot leak in; all layout is
 * inline, mirroring the original `css()` calls.
 *
 * @param {object}   props
 * @param {number}   props.progress Target progress 0..1.
 * @param {string}   props.loading  Current loading phase label.
 * @param {function} props.onStart  Called when the user clicks once ready.
 * @param {object}   [props.ref]    Exposes `animateOut()` returning a Promise.
 */
export function Preloader({ progress, loading, onStart, ref }) {
    const [rootRef, root] = useAnimation();
    const [numberRef, number] = useAnimation();
    const [titleRef, title] = useAnimation({ opacity: 0 });

    const bgRef = useRef(null);
    const infoRef = useRef(null);
    const percentRef = useRef(null);

    const holderRef = useRef({ value: 0 });
    const loadingRef = useRef(loading);
    const readyRef = useRef(false);
    const startedRef = useRef(false);

    const addStartButton = () => {
        if (readyRef.current) {
            return;
        }

        readyRef.current = true;

        if (bgRef.current) {
            bgRef.current.style.pointerEvents = 'auto';
        }

        number.stop().animate({ opacity: 0 }, 200, 'easeOutSine', () => {
            number.set({ display: 'none' });
            title.set({ y: 10, opacity: 0 }).animate({ y: 0, opacity: 1 }, 1000, 'easeOutQuart', 100);
        });
    };

    // Tween the displayed progress toward the target, updating the label and
    // percentage on each frame (mirrors `onProgress` in PreloaderView).
    useEffect(() => {
        const holder = holderRef.current;

        clearTween(holder);

        const onUpdate = () => {
            if (infoRef.current) {
                infoRef.current.textContent = loadingRef.current;
            }

            if (percentRef.current) {
                percentRef.current.textContent = `${Math.round(100 * holder.value)}%`;
            }
        };

        tween(holder, { value: progress }, 500, 'linear', 0, () => {
            if (holder.value === 1) {
                addStartButton();
            }
        }, onUpdate);

        return () => clearTween(holder);
    }, [progress]); // eslint-disable-line react-hooks/exhaustive-deps

    // Keep the label in sync between progress ticks.
    useEffect(() => {
        loadingRef.current = loading;

        if (infoRef.current) {
            infoRef.current.textContent = loading;
        }
    }, [loading]);

    useImperativeHandle(ref, () => ({
        animateOut() {
            number.stop().animate({ opacity: 0 }, 200, 'easeOutSine');
            title.stop().animate({ opacity: 0 }, 200, 'easeOutSine');

            return root.stop().animate({ opacity: 0 }, 600, 'easeInOutSine');
        }
    }), [number, title, root]);

    const handleClick = () => {
        if (!readyRef.current || startedRef.current) {
            return;
        }

        startedRef.current = true;

        if (bgRef.current) {
            bgRef.current.style.pointerEvents = 'none';
        }

        if (onStart) {
            onStart();
        }
    };

    return (
        <div
            ref={rootRef}
            className="mars-preloader"
            style={{
                position: 'fixed',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                zIndex: 1,
                pointerEvents: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none'
            }}
        >
            <div
                ref={bgRef}
                className="mars-preloader-bg"
                onClick={handleClick}
                style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'var(--bg-color)',
                    pointerEvents: 'none'
                }}
            />
            <div
                className="mars-preloader-container"
                style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: 300,
                    height: 32,
                    marginLeft: -150,
                    marginTop: -16
                }}
            >
                <div
                    ref={numberRef}
                    className="mars-preloader-number"
                    style={{
                        position: 'absolute',
                        left: '50%',
                        width: 110,
                        marginLeft: -55,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}
                >
                    <h2
                        ref={infoRef}
                        style={{
                            textAlign: 'left',
                            textTransform: 'uppercase',
                            color: 'var(--ui-info-color)',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {loading}
                    </h2>
                    <h2
                        ref={percentRef}
                        style={{
                            fontVariantNumeric: 'tabular-nums',
                            textAlign: 'right',
                            textTransform: 'uppercase',
                            color: 'var(--ui-info-color)',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        0%
                    </h2>
                </div>
                <h2
                    ref={titleRef}
                    className="mars-preloader-title"
                    style={{
                        position: 'absolute',
                        width: '100%',
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        color: 'var(--ui-info-color)',
                        whiteSpace: 'nowrap',
                        opacity: 0
                    }}
                >
                    {`${isMobile ? 'Tap' : 'Click'} to visit target`}
                </h2>
            </div>
        </div>
    );
}
