import { useEffect, useImperativeHandle, useRef, useState } from 'react';

import { useAnimation, useTicker } from '../../motion/index.js';
import { Panel } from '../panels/Panel.jsx';

import './HeaderInfo.css';

/**
 * A live FPS counter that floats right inside a `Header`. Lazily creates a
 * `Panel` when items are added via `addPanel`; the panel opens on hover or
 * click and closes when clicking outside.
 *
 * @param {object}  props
 * @param {boolean} [props.fpsOpen=false] When true the panel never closes on
 *   pointer-outside events (mirrors the original `fpsOpen` flag).
 * @param {object}  [props.ref] Exposes `hide`, `animateIn(delay)`,
 *   `animateOut`, `enable`, `disable`, `openPanel`, `addPanel(item)`,
 *   `getPanelIndex(name)`, `getPanelValue(name)`,
 *   `setPanelIndex(name, index, path)` and `setPanelValue(name, value, path)`.
 * @example
 * const infoRef = useRef(null);
 * <HeaderInfo ref={infoRef} />
 * infoRef.current.animateIn();
 * infoRef.current.addPanel({ type: 'slider', name: 'Speed', value: 5 });
 */
export function HeaderInfo({ fpsOpen = false, ref }) {
    const [rootRef, root] = useAnimation();
    const [numberRef, numberCtrl] = useAnimation();
    const panelRef = useRef(null);

    const stateRef = useRef({ prev: 0, count: 0, fps: 0, isOpen: false });
    const pointerRef = useRef({ lastTime: 0, lastX: 0, lastY: 0, x: 0, y: 0 });

    const [panelItems, setPanelItems] = useState([]);
    const hasPanel = panelItems.length > 0;

    // Keep latest callbacks in a ref so event-handler closures stay fresh
    // without re-subscribing on every render (mirrors useEventListener pattern).
    const cbRef = useRef({});
    useEffect(() => {
        cbRef.current = {
            openPanel() {
                if (!panelRef.current) return;
                if (stateRef.current.isOpen) return;
                if (rootRef.current) rootRef.current.style.pointerEvents = 'none';
                panelRef.current.animateIn();
                stateRef.current.isOpen = true;
            },
            closePanel() {
                if (!panelRef.current || fpsOpen) return;
                panelRef.current.animateOut(() => {
                    if (rootRef.current) rootRef.current.style.pointerEvents = 'auto';
                    stateRef.current.isOpen = false;
                });
            }
        };
    });

    // Hover → open panel
    useEffect(() => {
        const el = rootRef.current;
        if (!el) return;
        const onEnter = () => { if (!stateRef.current.isOpen) cbRef.current.openPanel?.(); };
        el.addEventListener('mouseenter', onEnter);
        return () => el.removeEventListener('mouseenter', onEnter);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Pointer-down → distinguish tap (open/close) from drag (ignore)
    useEffect(() => {
        if (!hasPanel) return;
        const el = rootRef.current;

        const onPointerDown = e => {
            const p = pointerRef.current;
            p.lastTime = performance.now();
            p.lastX = e.clientX;
            p.lastY = e.clientY;
            p.x = e.clientX;
            p.y = e.clientY;

            const onMove = ({ clientX, clientY }) => {
                pointerRef.current.x = clientX;
                pointerRef.current.y = clientY;
            };
            const onUp = e2 => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);

                const dx = p.x - p.lastX;
                const dy = p.y - p.lastY;

                if (performance.now() - p.lastTime > 250 || Math.sqrt(dx * dx + dy * dy) > 50) return;

                if (el && el.contains(e2.target)) {
                    stateRef.current.isOpen ? cbRef.current.closePanel?.() : cbRef.current.openPanel?.();
                } else {
                    cbRef.current.closePanel?.();
                }
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
        };

        window.addEventListener('pointerdown', onPointerDown);
        return () => window.removeEventListener('pointerdown', onPointerDown);
    }, [hasPanel]); // eslint-disable-line react-hooks/exhaustive-deps

    useTicker(() => {
        const s = stateRef.current;
        const now = performance.now();

        if (now - 1000 > s.prev) {
            s.fps = Math.round(s.count * 1000 / (now - s.prev));
            s.prev = now;
            s.count = 0;
        }

        s.count++;

        if (numberRef.current) {
            numberRef.current.textContent = s.fps;
        }
    });

    useImperativeHandle(ref, () => ({
        hide: () => root.stop().set({ x: -10, opacity: 0 }),
        animateIn: (delay = 0) => root.stop().set({ x: -10, opacity: 0 }).animate({ x: 0, opacity: 1 }, 1000, 'easeOutQuart', delay),
        animateOut: () => root.stop().animate({ opacity: 0 }, 400, 'easeOutCubic'),
        enable: () => numberCtrl.stop().animate({ opacity: 1 }, 400, 'easeInOutSine'),
        disable: () => numberCtrl.stop().animate({ opacity: 0.35 }, 400, 'easeInOutSine'),
        openPanel: () => cbRef.current.openPanel?.(),
        addPanel: item => setPanelItems(prev => [...prev, item]),
        getPanelIndex: name => panelRef.current?.getPanelIndex(name),
        getPanelValue: name => panelRef.current?.getPanelValue(name),
        setPanelIndex: (name, idx, path) => panelRef.current?.setPanelIndex(name, idx, path),
        setPanelValue: (name, val, path) => panelRef.current?.setPanelValue(name, val, path)
    }), [root, numberCtrl]);

    return (
        <div ref={rootRef} className="info header-info" style={{ float: 'right', padding: '10px' }}>
            <span ref={numberRef} className="number">0</span>
            {hasPanel && (
                <Panel
                    ref={panelRef}
                    items={panelItems}
                />
            )}
        </div>
    );
}
