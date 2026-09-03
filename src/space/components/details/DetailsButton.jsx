import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';

import { clearTween, tween } from '@lib/tween/Tween.js';
import { useAnimation, useTicker } from '../../motion/index.js';

import './DetailsButton.css';

const SIZE = 20;
const DPR = 2;

/**
 * A circular canvas button that shrinks when open and pulses on hover.
 * Mirrors `lib/ui/DetailsButton.js`.
 *
 * @param {object} props
 * @param {object} [props.data] Optional `{ number, total }` counter to display.
 * @param {boolean} [props.fastUpdate=false] When true the number updates instantly.
 * @param {function} [props.onHover] Called with the `mouseenter`/`mouseleave` event.
 * @param {function} [props.onClick] Called with the `click` event.
 * @param {object} [props.ref] Exposes `animateIn`, `animateOut`, `open` and `close`.
 * @example
 * <DetailsButton data={{ number: 1, total: 5 }} ref={buttonRef} />
 */
export function DetailsButton({ data, fastUpdate = false, onHover, onClick, ref }) {
    const [rootRef, root] = useAnimation({ opacity: 0 });
    const [numberRef, numberAnim] = useAnimation();
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);

    // Mutable object interpolated directly by the tween engine
    const drawProps = useRef({ radius: SIZE * 0.4 });

    // Non-reactive state used inside event handlers and tween callbacks
    const stateRef = useRef({
        animatedIn: false,
        hoveredIn: false,
        isOpen: false,
        needsUpdate: false,
        radius: SIZE * 0.4,
        hoverRadius: SIZE * 0.3,
        openRadius: SIZE * 0.2
    });

    // Reactive display state
    const [displayNumber, setDisplayNumber] = useState(data ? String(data.number) : '');
    const prevNumberRef = useRef(data ? String(data.number) : '');

    // Flag set in tween callback so the post-render effect knows to animate in
    const pendingInAnimRef = useRef(false);

    useLayoutEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext('2d');

        ctxRef.current = ctx;
        canvas.width = Math.round(SIZE * DPR);
        canvas.height = Math.round(SIZE * DPR);
        canvas.style.width = `${SIZE}px`;
        canvas.style.height = `${SIZE}px`;
        ctx.scale(DPR, DPR);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = getComputedStyle(document.documentElement)
            .getPropertyValue('--ui-color').trim();

        stateRef.current.needsUpdate = true;
    }, []);

    useEffect(() => {
        const dp = drawProps.current;

        return () => clearTween(dp);
    }, []);

    const drawCanvas = () => {
        const ctx = ctxRef.current;
        const canvas = canvasRef.current;

        if (!ctx || !canvas) {
            return;
        }

        const { radius } = drawProps.current;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.arc(SIZE / 2, SIZE / 2, radius, 0, Math.PI * 2);
        ctx.stroke();
    };

    useTicker(() => {
        if (stateRef.current.needsUpdate) {
            drawCanvas();
        }
    });

    // Animate number in after React has committed the new displayNumber to the DOM
    useEffect(() => {
        if (!pendingInAnimRef.current) {
            return;
        }

        pendingInAnimRef.current = false;
        numberAnim.set({ y: 10 }).animate({ y: 0, opacity: 1 }, 1000, 'easeOutCubic');
    }, [displayNumber, numberAnim]);

    // Trigger number transition when data.number changes
    useEffect(() => {
        if (!data) {
            return;
        }

        const next = String(data.number);

        if (next === prevNumberRef.current) {
            return;
        }

        prevNumberRef.current = next;

        if (fastUpdate) {
            setDisplayNumber(next);

            return;
        }

        numberAnim.stop().animate({ y: -10, opacity: 0 }, 300, 'easeInSine', () => {
            pendingInAnimRef.current = true;
            setDisplayNumber(next);
        });
    }, [data, fastUpdate, numberAnim]);

    useImperativeHandle(ref, () => ({
        animateIn() {
            const dp = drawProps.current;
            const st = stateRef.current;

            clearTween(dp);
            dp.radius = 0;
            st.animatedIn = false;
            st.needsUpdate = true;

            tween(dp, { radius: st.isOpen ? st.openRadius : st.radius }, 1000, 'easeOutExpo', () => {
                st.needsUpdate = false;
                st.animatedIn = true;
            });

            root.stop().animate({ opacity: 1 }, 400, 'easeOutCubic');
        },

        animateOut() {
            stateRef.current.animatedIn = false;
            root.stop().animate({ opacity: 0 }, 400, 'easeOutCubic');
        },

        open() {
            const dp = drawProps.current;
            const st = stateRef.current;

            st.isOpen = true;
            clearTween(dp);
            st.needsUpdate = true;

            tween(dp, { radius: st.openRadius }, 400, 'easeOutCubic', () => {
                st.needsUpdate = false;
            });
        },

        close() {
            const dp = drawProps.current;
            const st = stateRef.current;

            st.isOpen = false;
            clearTween(dp);
            st.needsUpdate = true;

            tween(dp, { radius: st.radius }, 400, 'easeOutCubic', () => {
                st.needsUpdate = false;
            });
        }
    }), [root]);

    const handleHover = event => {
        const dp = drawProps.current;
        const st = stateRef.current;

        if (!st.animatedIn) {
            return;
        }

        clearTween(dp);
        st.needsUpdate = true;

        if (st.isOpen) {
            if (event.type === 'mouseenter') {
                st.hoveredIn = true;

                tween(dp, { radius: st.hoverRadius }, 275, 'easeInOutCubic', () => {
                    st.needsUpdate = false;
                });
            } else {
                st.hoveredIn = false;

                tween(dp, { radius: st.openRadius }, 275, 'easeInOutCubic', () => {
                    st.needsUpdate = false;
                });
            }
        } else if (event.type === 'mouseenter') {
            st.hoveredIn = true;

            const start = () => {
                tween(dp, { radius: st.hoverRadius }, 800, 'easeOutQuart', () => {
                    tween(dp, { radius: st.radius, spring: 1, damping: 0.5 }, 800, 'easeOutElastic', 500, () => {
                        if (st.hoveredIn) {
                            start();
                        } else {
                            st.needsUpdate = false;
                        }
                    });
                });
            };

            start();
        } else {
            st.hoveredIn = false;

            tween(dp, { radius: st.radius, spring: 1, damping: 0.5 }, 800, 'easeOutElastic', 200, () => {
                st.needsUpdate = false;
            });
        }

        if (onHover) {
            onHover(event);
        }
    };

    return (
        <div
            ref={rootRef}
            className="button"
            onMouseEnter={handleHover}
            onMouseLeave={handleHover}
            onClick={onClick}
        >
            <canvas ref={canvasRef} className="canvas" />
            {data && (
                <div className="number-container">
                    <span ref={numberRef} className="number">{displayNumber}</span>
                    {data.total && (
                        <span className="total">/{data.total}</span>
                    )}
                </div>
            )}
        </div>
    );
}
