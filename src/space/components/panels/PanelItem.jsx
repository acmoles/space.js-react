import { useContext, useEffect, useImperativeHandle, useMemo } from 'react';

import { useAnimation } from '../../motion/index.js';
import { PanelContext } from './PanelContext.js';

import './PanelItem.css';

/**
 * One row of a `Panel`.
 *
 * A row owns the animation envelope (staggered animate in/out, and the dimming
 * applied while another row's colour picker is open) and nothing else — the
 * control itself is supplied as children. Rows register themselves with the
 * enclosing `Panel` through context on mount, so a panel never has to inspect
 * or clone its children to drive them.
 *
 * The typed row components in `./items/` are the intended way to build a panel;
 * use `PanelItem` directly only to place a custom control in a panel.
 *
 * @param {object}      props
 * @param {string}      [props.name]      Row name, used by the panel's `getPanelValue` /
 *                                        `setPanelValue` lookups.
 * @param {object}      [props.style]     Inline style for the row's container.
 * @param {object}      [props.viewRef]   Ref to the control, for the value API.
 * @param {object}      [props.graphRef]  Ref to a graph or meter, which is additionally
 *                                        enabled and disabled alongside the animations.
 * @param {React.ReactNode} props.children The control to render.
 * @example
 * <PanelItem name="Speed" viewRef={sliderRef}>
 *     <Slider ref={sliderRef} name="Speed" min={0} max={10} value={5} />
 * </PanelItem>
 */
export function PanelItem({ name, style, viewRef, graphRef, children, ref }) {
    const [rootRef, root] = useAnimation({ y: -10, opacity: 0 });
    const [containerRef, container] = useAnimation();

    const { registerItem } = useContext(PanelContext);

    const handle = useMemo(() => ({
        get element() { return rootRef.current; },
        animateIn(delay, fast) {
            root.stop();
            if (graphRef?.current) graphRef.current.enable();
            if (fast) {
                root.set({ y: 0, opacity: 1 });
            } else {
                root.set({ y: -10, opacity: 0 }).animate({ y: 0, opacity: 1 }, 400, 'easeOutCubic', delay);
            }
        },
        animateOut(index, _total, delay, callback) {
            root.stop().animate({ y: -10, opacity: 0 }, 500, 'easeInCubic', delay, () => {
                if (graphRef?.current) graphRef.current.disable();
                if (index === 0 && callback) callback();
            });
        },
        enable() {
            container.stop().animate({ opacity: 1 }, 500, 'easeInOutSine', () => {
                if (containerRef.current) containerRef.current.style.pointerEvents = 'auto';
            });
        },
        disable() {
            container.stop();
            if (containerRef.current) containerRef.current.style.pointerEvents = 'none';
            container.animate({ opacity: 0.35 }, 500, 'easeInOutSine');
        },
        // Value API — the panel broadcasts by name and the matching row answers.
        getPanelValue(lookup) {
            if (name !== lookup) return undefined;
            return viewRef?.current?.getValue?.() ?? graphRef?.current?.getValue?.();
        },
        // The original notifies: `Panel.setPanelValue` calls `view.setValue(value)`
        // with `notify` defaulting to true, so callbacks fire and any state
        // derived from the value (such as nested content) stays in step.
        setPanelValue(lookup, value) {
            if (name !== lookup) return;
            viewRef?.current?.setValue?.(value);
            graphRef?.current?.setValue?.(value);
        },
        getPanelIndex(lookup) {
            if (name !== lookup) return undefined;
            return viewRef?.current?.getIndex?.();
        },
        setPanelIndex(lookup, index) {
            if (name !== lookup) return;
            viewRef?.current?.setIndex?.(index);
        }
    }), [root, container, containerRef, rootRef, viewRef, graphRef, name]);

    useEffect(() => registerItem(handle), [registerItem, handle]);

    useImperativeHandle(ref, () => handle, [handle]);

    return (
        <div ref={rootRef} className="panel-item">
            <div ref={containerRef} className="container" style={style}>
                {children}
            </div>
        </div>
    );
}
