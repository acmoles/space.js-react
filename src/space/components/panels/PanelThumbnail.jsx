import { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

import { loadFiles } from '@lib/loaders/FileUtils.js';
import { useAnimation } from '../../motion/index.js';

import './PanelThumbnail.css';

function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function getPanelWidth() {
    const w = parseFloat(getCSSVar('--ui-panel-width'));
    return isNaN(w) ? 100 : w;
}

function imageToCanvas(image) {
    if (!image.width || !image.height) return null;
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (image instanceof ImageBitmap) {
        ctx.translate(0, canvas.height);
        ctx.scale(1, -1);
    }
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
}

function normalizeValue(v) {
    if (!v) return null;
    if ((v instanceof Image && !v.src.startsWith('data:')) || v instanceof ImageBitmap) return imageToCanvas(v);
    if (v && v.nodeName) {
        if (v instanceof HTMLCanvasElement) {
            if (!v.width || !v.height) return null;
            const c = document.createElement('canvas');
            c.width = v.width; c.height = v.height;
            c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
            return c;
        }
        return v.cloneNode();
    }
    return v;
}

function computeImgSrc(v) {
    if (!v) return null;
    if (v.nodeName === 'CANVAS') return { type: 'canvas', canvas: v };
    if (v instanceof Image) return { type: 'img', src: v.src };
    return null;
}

/**
 * A panel thumbnail slot that accepts images via click-to-browse or drag-and-drop.
 * Multi-thumbnail drag reordering is accepted via `children` so that the actual
 * Thumbnail view component (from `src/space/components/indicators/`) can be composed
 * by the caller.
 *
 * NOTE: Cross-thumbnail drag reordering (which required `Stage.events` in the original)
 * is not replicated here; it should be handled at the parent Panel level.
 *
 * @param {object}   props
 * @param {string}   props.name         Path-name identifier.
 * @param {object}   [props.data]       Metadata object (mutable, kept in sync with value).
 * @param {*}        [props.value]      Initial image/canvas value.
 * @param {function} [props.onChange]   Called with `{ path, value, target }`.
 * @param {React.ReactNode} [props.children] Sub-panel content rendered below.
 * @param {object}   [props.ref]  Exposes `setValue`, `setData`, `toggleContent`.
 * @example
 * <PanelThumbnail name="tex" data={{}} onChange={e => console.log(e.value)} />
 */
export function PanelThumbnail({
    data: initialData,
    value: initialValue,
    onChange,
    children,
    ref
}) {
    const panelWidth = getPanelWidth();
    const diagonal = panelWidth * 1.414;
    const lineOffset = -(diagonal - panelWidth) / 2 + 1;

    // Compute initial value once (handles canvas cloning, ImageBitmap → canvas, etc.)
    const initialNormalized = useMemo(() => normalizeValue(initialValue), []); // eslint-disable-line react-hooks/exhaustive-deps
    const [imgSrc, setImgSrc] = useState(() => computeImgSrc(initialNormalized));

    const [showContent, setShowContent] = useState(true);

    const dataRef = useRef(initialData || {});
    const valueRef = useRef(initialNormalized);
    const onChangeRef = useRef(onChange);
    const fileInputRef = useRef(null);
    const containerRef = useRef(null);

    // Drag state refs
    const moveHandlerRef = useRef(null);
    const upHandlerRef = useRef(null);
    const lastTimeRef = useRef(0);
    const lastMouseRef = useRef({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);
    const wrapperOffsetRef = useRef({ x: 0, y: 0 });

    const [lineRef] = useAnimation();

    useEffect(() => { onChangeRef.current = onChange; });

    const emitChange = (v, notify = true) => {
        if (notify && onChangeRef.current) {
            onChangeRef.current({ path: [], value: v, target: null });
        }
    };

    const applyValue = v => {
        if (v instanceof Image && !v.src.startsWith('data:')) {
            const converted = imageToCanvas(v);
            if (converted) {
                v = converted;
            } else {
                // Image not yet loaded — show it as <img> and update when it loads
                valueRef.current = v;
                setImgSrc({ type: 'img', src: v.src });
                return;
            }
        } else if (v instanceof ImageBitmap) {
            v = imageToCanvas(v);
        } else if (v && v.nodeName) {
            if (v instanceof HTMLCanvasElement) {
                if (!v.width || !v.height) {
                    valueRef.current = null;
                    setImgSrc(null);
                    return;
                }
                const c = document.createElement('canvas');
                c.width = v.width; c.height = v.height;
                c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
                v = c;
            } else {
                v = v.cloneNode();
            }
        }
        valueRef.current = v;
        if (v && v.nodeName === 'CANVAS') {
            setImgSrc({ type: 'canvas', canvas: v });
        } else if (v instanceof Image) {
            setImgSrc({ type: 'img', src: v.src });
        } else {
            setImgSrc(null);
        }
    };

    useImperativeHandle(ref, () => ({
        setValue(v, notify = true) {
            applyValue(v);
            emitChange(valueRef.current, notify);
        },
        setData(d) {
            dataRef.current = d || {};
        },
        toggleContent(show) {
            setShowContent(show);
        }
    }), []);

    const loadFilesAndUpdate = async files => {
        const data = await loadFiles(files);
        if (!data.length) return;
        const { image, filename } = data[0];
        if (image instanceof Image) {
            dataRef.current.name = filename;
            applyValue(image);
            emitChange(valueRef.current);
        }
    };

    const handleClick = e => {
        e.preventDefault();
        fileInputRef.current?.click();
    };

    const handleChange = e => {
        e.preventDefault();
        if (e.target.files && e.target.files.length) loadFilesAndUpdate(e.target.files);
    };

    const handleDragOver = e => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = e => {
        e.stopPropagation();
        e.preventDefault();
        if (e.dataTransfer && e.dataTransfer.files.length) {
            loadFilesAndUpdate(e.dataTransfer.files);
        }
    };

    // Pointer drag for moving the wrapper
    const handlePointerDown = e => {
        lastTimeRef.current = performance.now();
        lastMouseRef.current = { x: e.clientX, y: e.clientY };

        const move = ev => {
            const dx = ev.clientX - lastMouseRef.current.x;
            const dy = ev.clientY - lastMouseRef.current.y;
            if (Math.sqrt(dx * dx + dy * dy) < 1 && !isDraggingRef.current) return;

            isDraggingRef.current = true;
            wrapperOffsetRef.current.x += ev.clientX - lastMouseRef.current.x;
            wrapperOffsetRef.current.y += ev.clientY - lastMouseRef.current.y;
            lastMouseRef.current = { x: ev.clientX, y: ev.clientY };
            // Note: wrapper position update not implemented (cross-thumbnail dragging is
            // handled at the parent level via children render prop)
        };

        const up = ev => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            moveHandlerRef.current = null;
            upHandlerRef.current = null;

            const elapsed = performance.now() - lastTimeRef.current;
            const delta = Math.sqrt(
                (ev.clientX - lastMouseRef.current.x) ** 2 + (ev.clientY - lastMouseRef.current.y) ** 2
            );

            isDraggingRef.current = false;
            wrapperOffsetRef.current = { x: 0, y: 0 };

            // If it was a short/small interaction, treat as click (open file dialog)
            if (elapsed <= 250 && delta <= 50) {
                fileInputRef.current?.click();
            }
        };

        moveHandlerRef.current = move;
        upHandlerRef.current = up;

        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    };

    useEffect(() => () => {
        if (moveHandlerRef.current) {
            window.removeEventListener('pointermove', moveHandlerRef.current);
            window.removeEventListener('pointerup', upHandlerRef.current);
        }
    }, []);

    // When initialValue is an Image that wasn't loaded at render time, convert it
    // to a canvas snapshot once it finishes loading and update the display.
    useEffect(() => {
        if (!(initialValue instanceof Image) || initialValue.src.startsWith('data:')) return;
        if (initialValue.complete && initialValue.naturalWidth) return; // already loaded
        const onLoad = () => {
            const canvas = imageToCanvas(initialValue);
            if (canvas) {
                valueRef.current = canvas;
                setImgSrc({ type: 'canvas', canvas });
            }
        };
        initialValue.addEventListener('load', onLoad);
        return () => initialValue.removeEventListener('load', onLoad);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Render canvas content
    const canvasRef = useRef(null);
    useEffect(() => {
        if (imgSrc && imgSrc.type === 'canvas' && canvasRef.current) {
            const src = imgSrc.canvas;
            if (!src || !src.width || !src.height) return;
            const ctx = canvasRef.current.getContext('2d');
            canvasRef.current.width = src.width;
            canvasRef.current.height = src.height;
            ctx.drawImage(src, 0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    }, [imgSrc]);

    return (
        <div
            className="panel-thumbnail"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div
                ref={containerRef}
                className="container"
                style={{ width: panelWidth, height: panelWidth }}
                onClick={handleClick}
            >
                <div
                    ref={lineRef}
                    className="line"
                    style={{
                        left: lineOffset,
                        right: lineOffset,
                        height: panelWidth / 2 - 0.5,
                        borderBottom: '1px solid var(--ui-color-divider-line)',
                        transform: 'rotate(-45deg)',
                        transformOrigin: 'center bottom'
                    }}
                />
                {imgSrc && (
                    <div
                        className="wrapper"
                        style={{ width: panelWidth, height: panelWidth }}
                        onPointerDown={handlePointerDown}
                    >
                        {imgSrc.type === 'canvas' ? (
                            <canvas
                                ref={canvasRef}
                                style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <img
                                src={imgSrc.src}
                                alt=""
                                style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        )}
                    </div>
                )}
            </div>
            <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={handleChange}
            />
            {children && (
                <div className="group" style={{ display: showContent ? '' : 'none' }}>
                    {children}
                </div>
            )}
        </div>
    );
}
