import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { useAnimation } from '../../motion/index.js';
import { useResize } from '../../hooks/index.js';

import './Thumbnail.css';

/**
 * A draggable thumbnail that snaps to window edges, with canvas or img display.
 *
 * @param {object} props
 * @param {HTMLImageElement|HTMLCanvasElement} [props.image] Initial image to display.
 * @param {number} [props.width=150] CSS width in pixels.
 * @param {number} [props.height=100] CSS height in pixels.
 * @param {number} [props.snapMargin=20] Distance from edge for snap zones.
 * @param {number} [props.breakpoint=1024] Width below which snapMargin shrinks by 10.
 * @param {'tl'|'tr'|'bl'|'br'} [props.position='tl'] Initial corner to snap to.
 * @param {boolean} [props.noCanvas=false] Display image as `<img>` instead of a canvas.
 * @param {function} [props.onClick] Called when the thumbnail is tapped (short pointer up).
 * @param {function} [props.onUpdate] Called with `(image, element)` on image change.
 * @param {function} [props.onDragging] Called with `{ dragging: boolean }` on drag state change.
 * @param {function} [props.onSnap] Called with `{ element }` when snap occurs.
 * @param {object} [props.ref] Exposes `animateIn(delay)` and `animateOut(delay)`.
 * @example
 * <Thumbnail image={img} position="tl" ref={thumbRef} />
 */
export function Thumbnail({
    image: imageProp,
    width = 150,
    height = 100,
    snapMargin = 20,
    breakpoint = 1024,
    position: posProp = 'tl',
    noCanvas = false,
    onClick,
    onUpdate,
    onDragging,
    onSnap,
    ref
}) {
    const canvasRef = useRef(null);
    const [rootRef, root] = useAnimation({ opacity: 0 });

    // noCanvas display state
    const [canvaslessSrc, setCanvaslessSrc] = useState(
        noCanvas && imageProp && imageProp.src ? imageProp.src : null
    );

    // Drag state refs
    const dragRef = useRef({
        lastTime: 0,
        lastMouse: { x: 0, y: 0 },
        lastOrigin: { x: 0, y: 0 },
        delta: { x: 0, y: 0 }
    });

    // Position and snap state
    const posRef = useRef({ x: snapMargin, y: snapMargin });
    const snapStateRef = useRef({
        top: posProp === 'tl' || posProp === 'tr',
        right: posProp === 'br' || posProp === 'tr',
        bottom: posProp === 'bl' || posProp === 'br',
        left: posProp === 'tl' || posProp === 'bl',
        windowMargin: snapMargin
    });

    const imageRef = useRef(imageProp);
    const dprRef = useRef(window.devicePixelRatio);

    // Stable callback refs
    const onClickRef = useRef(onClick);
    const onUpdateRef = useRef(onUpdate);
    const onDraggingRef = useRef(onDragging);
    const onSnapRef = useRef(onSnap);

    useEffect(() => { onClickRef.current = onClick; });
    useEffect(() => { onUpdateRef.current = onUpdate; });
    useEffect(() => { onDraggingRef.current = onDragging; });
    useEffect(() => { onSnapRef.current = onSnap; });

    const applyPosition = useCallback(() => {
        const el = rootRef.current;

        if (el) {
            el.style.left = `${posRef.current.x}px`;
            el.style.top = `${posRef.current.y}px`;
        }
    }, [rootRef]);

    const doSnap = useCallback(() => {
        const s = snapStateRef.current;
        const margin = s.windowMargin;
        const x = posRef.current.x;
        const y = posRef.current.y;
        let snapX = x;
        let snapY = y;
        let top = false;
        let right = false;
        let bottom = false;
        let left = false;

        if (y <= margin + 10) { snapY = margin; top = true; }
        if (x >= window.innerWidth - width - margin - 10) {
            snapX = window.innerWidth - width - margin;
            right = true;
        }
        if (y >= window.innerHeight - height - margin - 10) {
            snapY = window.innerHeight - height - margin;
            bottom = true;
        }
        if (x <= margin + 10) { snapX = margin; left = true; }

        posRef.current.x = snapX;
        posRef.current.y = snapY;

        s.top = top;
        s.right = right;
        s.bottom = bottom;
        s.left = left;

        applyPosition();

        if (onSnapRef.current) {
            onSnapRef.current({ element: rootRef.current });
        }
    }, [width, height, applyPosition, rootRef]);

    const drawImage = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imageRef.current;

        if (!canvas || !img) {
            return;
        }

        const ctx = canvas.getContext('2d');

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }, []);

    useResize(({ width: ww, height: wh, dpr }) => {
        const s = snapStateRef.current;

        s.windowMargin = ww < breakpoint ? snapMargin - 10 : snapMargin;
        dprRef.current = dpr;

        if (s.top) { posRef.current.y = s.windowMargin; }
        if (s.right) { posRef.current.x = ww - width - s.windowMargin; }
        if (s.bottom) { posRef.current.y = wh - height - s.windowMargin; }
        if (s.left) { posRef.current.x = s.windowMargin; }

        applyPosition();

        if (!noCanvas && canvasRef.current) {
            canvasRef.current.width = Math.round(width * dpr);
            canvasRef.current.height = Math.round(height * dpr);

            drawImage();
        }
    });

    // Set initial right/bottom snapped position
    useEffect(() => {
        const s = snapStateRef.current;
        const margin = s.windowMargin;

        if (s.right) { posRef.current.x = window.innerWidth - width - margin; }
        if (s.bottom) { posRef.current.y = window.innerHeight - height - margin; }

        applyPosition();

        if (!noCanvas && imageProp) {
            drawImage();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Dynamic pointer handlers
    const onPointerMoveRef = useRef(null);
    const onPointerUpRef = useRef(null);

    useEffect(() => {
        const drag = dragRef.current;

        onPointerMoveRef.current = ({ clientX, clientY }) => {
            drag.delta.x = clientX - drag.lastMouse.x;
            drag.delta.y = clientY - drag.lastMouse.y;

            const len = Math.sqrt(drag.delta.x * drag.delta.x + drag.delta.y * drag.delta.y);

            if (!len) {
                return;
            }

            posRef.current.x = drag.lastOrigin.x + drag.delta.x;
            posRef.current.y = drag.lastOrigin.y + drag.delta.y;

            doSnap();
        };

        onPointerUpRef.current = () => {
            window.removeEventListener('pointermove', onPointerMoveRef.current);
            window.removeEventListener('pointerup', onPointerUpRef.current);

            if (onDraggingRef.current) {
                onDraggingRef.current({ dragging: false });
            }

            const elapsed = performance.now() - drag.lastTime;
            const dx = drag.delta.x;
            const dy = drag.delta.y;

            if (elapsed > 250 || Math.sqrt(dx * dx + dy * dy) > 50) {
                return;
            }

            if (onClickRef.current) {
                onClickRef.current({ target: rootRef.current });
            }
        };
    });

    useEffect(() => () => {
        window.removeEventListener('pointermove', onPointerMoveRef.current);
        window.removeEventListener('pointerup', onPointerUpRef.current);
    }, []);

    const handlePointerDown = e => {
        const drag = dragRef.current;

        drag.lastTime = performance.now();
        drag.lastMouse.x = e.clientX;
        drag.lastMouse.y = e.clientY;
        drag.lastOrigin.x = posRef.current.x;
        drag.lastOrigin.y = posRef.current.y;
        drag.delta.x = 0;
        drag.delta.y = 0;

        if (onDraggingRef.current) {
            onDraggingRef.current({ dragging: true });
        }

        window.addEventListener('pointermove', onPointerMoveRef.current);
        window.addEventListener('pointerup', onPointerUpRef.current);
    };

    const handleDragOver = e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = e => {
        e.preventDefault();

        const files = Array.from(e.dataTransfer.files);

        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                continue;
            }

            const url = URL.createObjectURL(file);
            const img = new Image();

            img.onload = () => {
                imageRef.current = img;

                if (!noCanvas && canvasRef.current) {
                    canvasRef.current.width = Math.round(width * dprRef.current);
                    canvasRef.current.height = Math.round(height * dprRef.current);

                    drawImage();
                } else {
                    setCanvaslessSrc(img.src);
                }

                if (onUpdateRef.current) {
                    onUpdateRef.current(img, rootRef.current);
                }
            };

            img.src = url;
            break;
        }
    };

    useImperativeHandle(ref, () => ({
        animateIn: delay => {
            root.stop().set({ opacity: 0 });
            root.animate({ opacity: 1 }, 700, 'easeOutCubic', delay ?? 0, () => {
                if (rootRef.current) {
                    rootRef.current.style.pointerEvents = 'auto';
                }
            });
        },
        animateOut: delay => {
            if (rootRef.current) {
                rootRef.current.style.pointerEvents = 'none';
            }

            root.stop().animate({ opacity: 0 }, 700, 'easeOutCubic', delay ?? 0);
        }
    }), [root, rootRef]);

    const displaySrc = noCanvas ? (canvaslessSrc ?? (imageProp && imageProp.src)) : null;

    return (
        <div
            ref={rootRef}
            className="thumbnail"
            style={{ width, height }}
            onPointerDown={handlePointerDown}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {noCanvas ? (
                <div className="wrapper">
                    {displaySrc && <img src={displaySrc} alt="" />}
                </div>
            ) : (
                <canvas
                    ref={canvasRef}
                    className="thumb-canvas"
                />
            )}
        </div>
    );
}
