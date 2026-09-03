import { useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react';

import { clearTween, tween } from '@lib/tween/Tween.js';
import { useAnimation, useTicker } from '../../motion/index.js';

import './MuteButton.css';

const WIDTH = 24;
const HEIGHT = 16;
const DPR = 2;

function drawWave(ctx, canvas, props) {
    const w = WIDTH + 2;
    const h = HEIGHT / 2;
    const progress = w * props.progress;
    const increase = (90 / 180 * Math.PI) / (h / 2);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();

    let counter = 0;
    let x = 0;
    let y = h;

    for (let i = -4; i < w; i++) {
        if (progress >= i) {
            ctx.moveTo(x, y);

            x = i;
            y = h - Math.sin(counter) * (h - 1) * props.yMultiplier;
            counter += increase;

            ctx.lineTo(x, y);
        }
    }

    ctx.stroke();
}

/**
 * A canvas button that draws an animated sound-wave, muting/unmuting on click.
 * Mirrors `lib/ui/MuteButton.js`.
 *
 * @param {object} props
 * @param {boolean} [props.sound=true] Initial sound-on state.
 * @param {function} [props.onUpdate] Called with `(sound)` when the state changes.
 * @param {function} [props.onHover] Called with the `mouseenter`/`mouseleave` event.
 * @param {function} [props.onClick] Called with the `click` event.
 * @param {object} [props.ref] Exposes `animateIn` and `animateOut`.
 * @example
 * <MuteButton sound={true} onUpdate={s => console.log(s)} ref={muteRef} />
 */
export function MuteButton({ sound: initialSound = true, onUpdate, onHover, onClick, ref }) {
    const [rootRef, root] = useAnimation({ opacity: 0 });
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);

    const drawProps = useRef({
        yMultiplier: initialSound ? 1 : 0,
        progress: 0
    });

    const stateRef = useRef({
        animatedIn: false,
        sound: initialSound,
        needsUpdate: false
    });

    useLayoutEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext('2d');

        ctxRef.current = ctx;
        canvas.width = Math.round(WIDTH * DPR);
        canvas.height = Math.round(HEIGHT * DPR);
        canvas.style.width = `${WIDTH}px`;
        canvas.style.height = `${HEIGHT}px`;
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

    useTicker(() => {
        if (stateRef.current.needsUpdate) {
            drawWave(ctxRef.current, canvasRef.current, drawProps.current);
        }
    });

    useImperativeHandle(ref, () => ({
        animateIn() {
            const dp = drawProps.current;
            const st = stateRef.current;

            clearTween(dp);
            dp.yMultiplier = st.sound ? 1 : 0;
            dp.progress = 0;
            st.animatedIn = false;
            st.needsUpdate = true;

            tween(dp, { progress: 1 }, 1000, 'easeOutExpo', () => {
                st.needsUpdate = false;
                st.animatedIn = true;
            });

            root.stop().animate({ opacity: 1 }, 400, 'easeOutCubic');
        },

        animateOut() {
            stateRef.current.animatedIn = false;
            root.stop().animate({ opacity: 0 }, 400, 'easeOutCubic');
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

        if (event.type === 'mouseenter') {
            tween(dp, { yMultiplier: st.sound ? 0.7 : 0.3 }, 275, 'easeInOutCubic', () => {
                st.needsUpdate = false;
            });
        } else {
            tween(dp, { yMultiplier: st.sound ? 1 : 0 }, 275, 'easeInOutCubic', () => {
                st.needsUpdate = false;
            });
        }

        if (onHover) {
            onHover(event);
        }
    };

    const handleClick = event => {
        const dp = drawProps.current;
        const st = stateRef.current;

        clearTween(dp);
        st.needsUpdate = true;

        if (st.sound) {
            st.sound = false;

            tween(dp, { yMultiplier: 0 }, 300, 'easeOutCubic', () => {
                st.needsUpdate = false;
            });
        } else {
            st.sound = true;

            tween(dp, { yMultiplier: 1 }, 300, 'easeOutCubic', () => {
                st.needsUpdate = false;
            });
        }

        if (onUpdate) {
            onUpdate(st.sound);
        }

        if (onClick) {
            onClick(event);
        }
    };

    return (
        <div
            ref={rootRef}
            className="button"
            style={{ width: WIDTH + 20, height: HEIGHT + 20 }}
            onMouseEnter={handleHover}
            onMouseLeave={handleHover}
            onClick={handleClick}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    marginLeft: -(WIDTH / 2),
                    marginTop: -(HEIGHT / 2)
                }}
            />
        </div>
    );
}
