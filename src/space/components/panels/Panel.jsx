import { useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';

import { useAnimation } from '../../motion/index.js';
import { PanelContext } from './PanelContext.js';
import { PanelItem } from './PanelItem.jsx';

import './Panel.css';

function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * A panel container that renders a list of item descriptors as control rows.
 * Provides staggered animate-in/out, colour-picker coordination, and
 * per-item enable/disable, matching the original `Panel` class exactly.
 *
 * @param {object}     props
 * @param {object[]}   props.items          Item descriptor objects (same shape as the original).
 * @param {function}   [props.onChange]     Called when any child item emits an update.
 * @param {boolean}    [props.autoAnimateIn=false] When true, calls `animateIn(fast=true)` on mount
 *                                           (for nested panels created by setContent callbacks).
 * @param {object}     [props.ref]    Exposes `animateIn(fast?)`, `animateOut(callback?)`,
 *                                    `activate()`, `deactivate()`, `invert(isInverted)`.
 * @example
 * <Panel
 *   ref={panelRef}
 *   items={[
 *     { type: 'slider', name: 'Speed', min: 0, max: 10, step: 0.1, value: 5 },
 *     { type: 'toggle', name: 'Visible', value: true }
 *   ]}
 *   onChange={e => console.log(e)}
 * />
 */
export function Panel({ items = [], onChange, autoAnimateIn = false, ref }) {
    const [rootRef, root] = useAnimation({ display: 'none' });

    // Per-item imperative handles
    const itemRefs = useRef([]);

    // Currently open ColorPicker entry: { element: domNode, close: fn }
    const openPickerRef = useRef(null);

    const contextValue = useMemo(() => ({
        notifyOpen(pickerElement, closeFn) {
            // Close any already-open picker first
            if (openPickerRef.current) {
                openPickerRef.current.close();
            }
            openPickerRef.current = { element: pickerElement, close: closeFn };

            // Disable items whose element does NOT contain the picker
            itemRefs.current.forEach(item => {
                if (!item) return;
                const el = item.element;
                if (el && pickerElement && el.contains(pickerElement)) return;
                item.disable();
            });
        },
        notifyClose() {
            openPickerRef.current = null;
            itemRefs.current.forEach(item => item?.enable());
        }
    }), []);

    const handleChange = useCallback(e => {
        if (onChange) onChange(e);
    }, [onChange]);

    // Automatically animate in (fast / no tween) after mount for nested panels.
    useEffect(() => {
        if (!autoAnimateIn) return;
        root.set({ display: '' });
        itemRefs.current.forEach((item, i) => item?.animateIn(i * 15, true));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useImperativeHandle(ref, () => ({
        animateIn(fast) {
            root.set({ display: '' });
            itemRefs.current.forEach((item, i) => {
                item?.animateIn(i * 15, fast);
            });
        },
        animateOut(callback) {
            const last = itemRefs.current.length - 1;
            itemRefs.current.forEach((item, i) => {
                item?.animateOut(i, last, (last - i) * 15, callback);
            });
        },
        activate() {
            root.stop().animate({ opacity: 1 }, 300, 'easeOutSine');
        },
        deactivate() {
            root.stop().animate({ opacity: 0 }, 300, 'easeOutSine');
        },
        invert(isInverted) {
            const root2 = document.documentElement;
            const light = getCSSVar('--ui-invert-light-color');
            const lightTriplet = getCSSVar('--ui-invert-light-color-triplet');
            const lightLine = getCSSVar('--ui-invert-light-color-line');
            const dark = getCSSVar('--ui-invert-dark-color');
            const darkTriplet = getCSSVar('--ui-invert-dark-color-triplet');
            const darkLine = getCSSVar('--ui-invert-dark-color-line');
            root2.style.setProperty('--ui-color', isInverted ? light : dark);
            root2.style.setProperty('--ui-color-triplet', isInverted ? lightTriplet : darkTriplet);
            root2.style.setProperty('--ui-color-line', isInverted ? lightLine : darkLine);
        },
        // Programmatic panel helpers matching the original API
        getPanelIndex(name) {
            for (const item of itemRefs.current) {
                const idx = item?.getPanelIndex?.(name);
                if (idx !== undefined) return idx;
            }
        },
        getPanelValue(name) {
            for (const item of itemRefs.current) {
                const val = item?.getPanelValue?.(name);
                if (val !== undefined) return val;
            }
        },
        setPanelIndex(name, index, path = []) {
            itemRefs.current.forEach(item => item?.setPanelIndex?.(name, index, path));
        },
        setPanelValue(name, value, path = []) {
            itemRefs.current.forEach(item => item?.setPanelValue?.(name, value, path));
        }
    }), [root]);

    return (
        <PanelContext.Provider value={contextValue}>
            <div ref={rootRef} className="panel">
                {items.map((data, i) => (
                    <PanelItem
                        key={i}
                        ref={el => { itemRefs.current[i] = el; }}
                        data={data}
                        onChange={handleChange}
                    />
                ))}
            </div>
        </PanelContext.Provider>
    );
}
