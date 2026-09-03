import { useEffect, useImperativeHandle, useRef } from 'react';

import { useAnimation } from '../../motion/index.js';
import { useTicker } from '../../motion/index.js';
import { useEventListener } from '../../hooks/index.js';
import { PointInfo } from './PointInfo.jsx';

import './Point.css';

const LERP_SPEED = 0.07;

/**
 * A world-space point label that lerps to a screen-space target each frame.
 *
 * The point can be dragged when open. The parent is responsible for updating
 * `ref.current.target.x / .y` every frame and calling `ref.current.update()`
 * if it wants manual control; otherwise the built-in ticker handles lerp.
 *
 * @param {object} props
 * @param {object} [props.data] `{ name, type }` — forwarded to PointInfo.
 * @param {Array<string|number>} [props.targetNumbers] — forwarded to PointInfo.
 * @param {function} [props.onHover] Called when the container is entered/left.
 * @param {object} [props.trackerRef] Ref to the associated Tracker (for click logic).
 * @param {function} [props.onUiShow] Called to show the tracker.
 * @param {function} [props.onUiLock] Called to lock the tracker.
 * @param {function} [props.onUiUnlock] Called to unlock the tracker.
 * @param {function} [props.onUiHide] Called to hide the tracker.
 * @param {function} [props.snapFn] Called during drag for snapping.
 * @param {object} [props.ref]
 *   Exposes `target { x, y }`, `update()`, `animateIn()`, `animateOut(fast)`,
 *   `open()`, `close(fast)`, `lock()`, `unlock()`, `enable()`, `disable()`,
 *   `activate()`, `deactivate(toggle)`, `bringToFront()`, `sendToBack()`,
 *   `onColorPicker({ open, target })`, and `animatedIn`.
 * @example
 * <Point data={{ name: 'Sun', type: 'DirectionalLight' }} trackerRef={trackerRef} ref={pointRef} />
 */
export function Point({
    data,
    targetNumbers,
    onHover,
    trackerRef,
    onUiShow,
    onUiLock,
    onUiUnlock,
    onUiHide,
    snapFn,
    ref
}) {
    const targetRef = useRef({ x: 0, y: 0 });
    const positionRef = useRef({ x: 0, y: 0 });
    const originRef = useRef({ x: 0, y: 0 });
    const originPositionRef = useRef({ x: 0, y: 0 });
    const lastMouseRef = useRef({ x: 0, y: 0 });
    const lastOriginRef = useRef({ x: 0, y: 0 });
    const deltaRef = useRef({ x: 0, y: 0 });
    const lastTimeRef = useRef(0);
    const boundsRef = useRef(null);

    const stateRef = useRef({
        animatedIn: false,
        openColor: null,
        isOpen: false,
        isMove: false
    });

    const infoRef = useRef(null);
    const [rootRef, root] = useAnimation({ visibility: 'hidden' });

    // Per-frame position lerp
    useTicker(() => {
        if (stateRef.current.isMove) {
            return;
        }

        const pos = positionRef.current;
        const tgt = targetRef.current;

        pos.x += (tgt.x - pos.x) * LERP_SPEED;
        pos.y += (tgt.y - pos.y) * LERP_SPEED;

        if (rootRef.current) {
            rootRef.current.style.left = `${pos.x}px`;
            rootRef.current.style.top = `${pos.y}px`;
        }
    });

    // Drag handlers (added/removed dynamically)
    const onPointerMoveRef = useRef(null);
    const onPointerUpRef = useRef(null);

    useEffect(() => {
        const onPointerMove = ({ clientX, clientY }) => {
            const dx = clientX - lastMouseRef.current.x;
            const dy = clientY - lastMouseRef.current.y;

            deltaRef.current.x = dx;
            deltaRef.current.y = dy;

            const len = Math.sqrt(dx * dx + dy * dy);

            if (len) {
                originRef.current.x = lastOriginRef.current.x + dx;
                originRef.current.y = lastOriginRef.current.y + dy;

                originPositionRef.current.x = originRef.current.x + positionRef.current.x;
                originPositionRef.current.y = originRef.current.y + positionRef.current.y;

                if (snapFn) {
                    boundsRef.current = infoRef.current?.container?.getBoundingClientRect() ?? null;
                    snapFn();
                } else if (rootRef.current) {
                    rootRef.current.style.left = `${originPositionRef.current.x}px`;
                    rootRef.current.style.top = `${originPositionRef.current.y}px`;
                }

                stateRef.current.isMove = true;
            }
        };

        const onPointerUp = e => {
            window.removeEventListener('pointermove', onPointerMoveRef.current);
            window.removeEventListener('pointerup', onPointerUpRef.current);

            if (!stateRef.current.isOpen) {
                return;
            }

            // sendToBack
            if (rootRef.current) {
                rootRef.current.style.zIndex = '';
            }

            const elapsed = performance.now() - lastTimeRef.current;
            const dx = deltaRef.current.x;
            const dy = deltaRef.current.y;
            const dragLen = Math.sqrt(dx * dx + dy * dy);

            if (elapsed > 250 || dragLen > 50) {
                return;
            }

            const tracker = trackerRef?.current;
            const container = infoRef.current?.container;

            if (tracker && tracker.isVisible && container && container.contains(e.target)) {
                if (!tracker.isInstanced && !tracker.animatedIn) {
                    onUiShow && onUiShow();
                } else if (!tracker.locked) {
                    onUiLock && onUiLock();
                } else {
                    onUiUnlock && onUiUnlock();
                    onUiHide && onUiHide();
                }
            }
        };

        onPointerMoveRef.current = onPointerMove;
        onPointerUpRef.current = onPointerUp;
    });

    useEventListener(window, 'pointerdown', e => {
        if (!stateRef.current.isOpen) {
            return;
        }

        const container = infoRef.current?.container;

        if (!container || !container.contains(e.target)) {
            return;
        }

        lastTimeRef.current = performance.now();
        lastMouseRef.current.x = e.clientX;
        lastMouseRef.current.y = e.clientY;
        lastOriginRef.current.x = originRef.current.x;
        lastOriginRef.current.y = originRef.current.y;

        onPointerMoveRef.current(e);

        // bringToFront
        if (rootRef.current) {
            rootRef.current.style.zIndex = '99';
        }

        window.addEventListener('pointermove', onPointerMoveRef.current);
        window.addEventListener('pointerup', onPointerUpRef.current);
    });

    // Cleanup window listeners on unmount
    useEffect(() => () => {
        window.removeEventListener('pointermove', onPointerMoveRef.current);
        window.removeEventListener('pointerup', onPointerUpRef.current);
    }, []);

    useImperativeHandle(ref, () => ({
        get animatedIn() {
            return stateRef.current.animatedIn;
        },
        get isOpen() {
            return stateRef.current.isOpen;
        },
        get bounds() {
            return boundsRef.current;
        },
        target: targetRef.current,
        position: positionRef.current,
        update: () => {
            if (stateRef.current.isMove) {
                return;
            }

            const pos = positionRef.current;
            const tgt = targetRef.current;

            pos.x += (tgt.x - pos.x) * LERP_SPEED;
            pos.y += (tgt.y - pos.y) * LERP_SPEED;

            if (rootRef.current) {
                rootRef.current.style.left = `${pos.x}px`;
                rootRef.current.style.top = `${pos.y}px`;
            }
        },
        animateIn: () => {
            root.stop().set({ visibility: 'visible', opacity: 1 });

            if (infoRef.current) {
                infoRef.current.animateIn();
            }

            stateRef.current.animatedIn = true;
        },
        animateOut: fast => {
            if (infoRef.current) {
                infoRef.current.animateOut(fast, () => {
                    root.set({ visibility: 'hidden' });
                });
            }

            stateRef.current.animatedIn = false;
        },
        open: () => {
            if (rootRef.current) {
                rootRef.current.style.pointerEvents = 'auto';
            }

            if (infoRef.current) {
                infoRef.current.open();
            }

            stateRef.current.isOpen = true;
        },
        close: fast => {
            if (rootRef.current) {
                rootRef.current.style.pointerEvents = 'none';
            }

            if (infoRef.current) {
                infoRef.current.close(fast);
            }

            if (stateRef.current.isMove) {
                positionRef.current.x = targetRef.current.x;
                positionRef.current.y = targetRef.current.y;
                originRef.current.x = 0;
                originRef.current.y = 0;
                originPositionRef.current.x = positionRef.current.x;
                originPositionRef.current.y = positionRef.current.y;

                if (rootRef.current) {
                    rootRef.current.style.left = `${originPositionRef.current.x}px`;
                    rootRef.current.style.top = `${originPositionRef.current.y}px`;
                }
            }

            stateRef.current.isOpen = false;
            stateRef.current.isMove = false;
        },
        lock: () => infoRef.current && infoRef.current.lock(),
        unlock: () => infoRef.current && infoRef.current.unlock(),
        enable: () => infoRef.current && infoRef.current.enable(),
        disable: () => infoRef.current && infoRef.current.disable(),
        activate: () => root.stop().animate({ opacity: 1 }, 300, 'easeOutSine'),
        deactivate: toggle => {
            root.stop();

            if (rootRef.current) {
                rootRef.current.style.pointerEvents = 'none';
            }

            root.animate({ opacity: 0 }, 300, 'easeOutSine', () => {
                if (infoRef.current) {
                    infoRef.current.enable();
                    infoRef.current.close(true);
                }

                if (toggle) {
                    root.stop().animate({ opacity: 1 }, 300, 'easeOutSine');
                }
            });
        },
        bringToFront: () => {
            if (rootRef.current) {
                rootRef.current.style.zIndex = '99';
            }
        },
        sendToBack: () => {
            if (rootRef.current) {
                rootRef.current.style.zIndex = '';
            }
        },
        // Called by parent when a color picker opens/closes
        onColorPicker: ({ open: isOpen }) => {
            if (infoRef.current) {
                if (isOpen) {
                    infoRef.current.disable();
                } else {
                    infoRef.current.enable();
                }
            }

            stateRef.current.openColor = isOpen ? true : null;
        }
    }), [root, rootRef]);

    const handleContainerHover = e => {
        if (onHover) {
            onHover({ type: e.type === 'mouseenter' ? 'over' : 'out', isPoint: true });
        }
    };

    return (
        <div ref={rootRef} className="point">
            <PointInfo
                ref={infoRef}
                data={data}
                targetNumbers={targetNumbers}
                onContainerHover={handleContainerHover}
            />
        </div>
    );
}
