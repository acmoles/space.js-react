import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';

import { useAnimation, useMotion, useTicker } from '../../motion/index.js';

import './DetailsButton.css';

const SIZE = 20;
const DPR = 2;

/**
 * A circular canvas button that shrinks when open and pulses on hover.
 * Mirrors `lib/ui/DetailsButton.js`.
 *
 * @param {object} props
 * @param {object} [props.data] Optional `{ number, total }` counter to display.
 * @param {boolean} [props.fastUpdate=false] When true the number updates instantly (no tween).
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

    // Plain-number motion object for the circle radius
    const motion = useMotion({ radius: SIZE * 0.4 });

    // Non-reactive mutable state for event handlers and tween callbacks
    const stateRef = useRef({
        animatedIn: false,
        hoveredIn: false,
        isOpen: false,
        needsUpdate: false,
        radius: SIZE * 0.4,
        hoverRadius: SIZE * 0.3,
        openRadius: SIZE * 0.2
    });

    // When fastUpdate, derive the number directly from props (no setState needed).
    // Otherwise use animated state that transitions via a tween callback.
    const derivedNumber = data ? String(data.number) : '';
    const [animatedNumber, setAnimatedNumber] = useState(derivedNumber);
    const displayNumber = fastUpdate ? derivedNumber : animatedNumber;
    const prevNumberRef = useRef(derivedNumber);

    // Flag set in tween callback so the post-render effect can animate in
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

    useTicker(() => {
        if (!stateRef.current.needsUpdate) {
            return;
        }

        const ctx = ctxRef.current;
        const canvas = canvasRef.current;

        if (!ctx || !canvas) {
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.arc(SIZE / 2, SIZE / 2, motion.values.radius, 0, Math.PI * 2);
        ctx.stroke();
    });

    // Animate number in after React commits the new animatedNumber to the DOM
    useEffect(() => {
        if (!pendingInAnimRef.current) {
            return;
        }

        pendingInAnimRef.current = false;
        numberAnim.set({ y: 10 }).animate({ y: 0, opacity: 1 }, 1000, 'easeOutCubic');
    }, [animatedNumber, numberAnim]);

    // Trigger animated number transition when data.number changes (slow path only)
    useEffect(() => {
        if (fastUpdate || !data) {
            return;
        }

        const next = String(data.number);

        if (next === prevNumberRef.current) {
            return;
        }

        prevNumberRef.current = next;

        numberAnim.stop().animate({ y: -10, opacity: 0 }, 300, 'easeInSine', () => {
            pendingInAnimRef.current = true;
            setAnimatedNumber(next);
        });
    }, [data, fastUpdate, numberAnim]);

    useImperativeHandle(ref, () => ({
        animateIn() {
            const st = stateRef.current;

            motion.stop();
            motion.values.radius = 0;
            st.animatedIn = false;
            st.needsUpdate = true;

            motion.animate({ radius: st.isOpen ? st.openRadius : st.radius }, 1000, 'easeOutExpo', () => {
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
            const st = stateRef.current;

            st.isOpen = true;
            motion.stop();
            st.needsUpdate = true;

            motion.animate({ radius: st.openRadius }, 400, 'easeOutCubic', () => {
                st.needsUpdate = false;
            });
        },

        close() {
            const st = stateRef.current;

            st.isOpen = false;
            motion.stop();
            st.needsUpdate = true;

            motion.animate({ radius: st.radius }, 400, 'easeOutCubic', () => {
                st.needsUpdate = false;
            });
        }
    }), [root, motion]);

    const handleHover = event => {
        const st = stateRef.current;

        if (!st.animatedIn) {
            return;
        }

        motion.stop();
        st.needsUpdate = true;

        if (st.isOpen) {
            if (event.type === 'mouseenter') {
                st.hoveredIn = true;

                motion.animate({ radius: st.hoverRadius }, 275, 'easeInOutCubic', () => {
                    st.needsUpdate = false;
                });
            } else {
                st.hoveredIn = false;

                motion.animate({ radius: st.openRadius }, 275, 'easeInOutCubic', () => {
                    st.needsUpdate = false;
                });
            }
        } else if (event.type === 'mouseenter') {
            st.hoveredIn = true;

            const start = () => {
                motion.animate({ radius: st.hoverRadius }, 800, 'easeOutQuart', () => {
                    motion.animate({ radius: st.radius, spring: 1, damping: 0.5 }, 800, 'easeOutElastic', 500, () => {
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

            motion.animate({ radius: st.radius, spring: 1, damping: 0.5 }, 800, 'easeOutElastic', 200, () => {
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
            style={{ width: SIZE + 40, height: SIZE + 20 }}
            onMouseEnter={handleHover}
            onMouseLeave={handleHover}
            onClick={onClick}
        >
            <canvas
                ref={canvasRef}
                style={{ position: 'absolute', left: 10, top: 10 }}
            />
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
