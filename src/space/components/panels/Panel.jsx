import { useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';

import { useAnimation } from '../../motion/index.js';
import { PanelContext } from './PanelContext.js';
import { PanelItems } from './items/PanelItems.jsx';

import './Panel.css';

function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * A panel of control rows.
 *
 * Rows are supplied as children, using the row components in `./items`. Each
 * row registers itself with the panel through context, so the panel can stagger
 * its animations and coordinate colour pickers without inspecting or cloning
 * its children — rows may therefore be wrapped, grouped or conditionally
 * rendered freely.
 *
 * For panels that are genuinely data — the three.js material and light
 * inspectors, which build their rows by walking a material at runtime — pass
 * descriptors to `items` instead, or render `<PanelItems>` as a child.
 *
 * @param {object}     props
 * @param {React.ReactNode} [props.children] Row components.
 * @param {object[]}   [props.items]        Item descriptors, as an alternative to children.
 * @param {function}   [props.onChange]     Called when any row emits an update. Applies to
 *                                          the `items` descriptors; JSX children carry their own.
 * @param {boolean}    [props.autoAnimateIn=false] Animate in on mount, untweened, as the
 *                                          reference library does for sub-panels.
 * @param {object}     [props.ref]    Exposes `animateIn(fast?)`, `animateOut(callback?)`,
 *                                    `activate()`, `deactivate()`, `invert(isInverted)`,
 *                                    and the `getPanelValue` / `setPanelValue` family.
 * @example
 * <Panel ref={panelRef}>
 *     <PanelSlider name="Speed" min={0} max={10} step={0.1} value={5} onChange={e => setSpeed(e.value)} />
 *     <PanelToggle name="Visible" value onChange={e => setVisible(e.value)} />
 * </Panel>
 */
export function Panel({ children, items, onChange, autoAnimateIn = false, ref }) {
    const [rootRef, root] = useAnimation({ display: 'none' });

    // Live row handles, keyed by identity. Insertion order follows mount order,
    // which is bottom-up, so the panel sorts into document order before it
    // staggers rather than relying on it.
    const itemsRef = useRef(new Set());

    // Currently open ColorPicker entry: { element: domNode, close: fn }
    const openPickerRef = useRef(null);

    const orderedItems = useCallback(() => {
        const handles = [...itemsRef.current];

        return handles.sort((a, b) => {
            const x = a.element;
            const y = b.element;

            if (!x || !y) return 0;

            return x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });
    }, []);

    const contextValue = useMemo(() => ({
        registerItem(handle) {
            itemsRef.current.add(handle);

            return () => itemsRef.current.delete(handle);
        },
        notifyOpen(pickerElement, closeFn) {
            // Close any already-open picker first
            if (openPickerRef.current) {
                openPickerRef.current.close();
            }
            openPickerRef.current = { element: pickerElement, close: closeFn };

            // Disable items whose element does NOT contain the picker
            itemsRef.current.forEach(item => {
                const el = item.element;
                if (el && pickerElement && el.contains(pickerElement)) return;
                item.disable();
            });
        },
        // `element` scopes the close to the picker that owns the open slot, so a
        // picker unmounting while open cannot re-enable rows another picker has
        // since disabled. Called without an argument it closes unconditionally.
        notifyClose(element) {
            if (element && openPickerRef.current?.element !== element) return;
            openPickerRef.current = null;
            itemsRef.current.forEach(item => item.enable());
        }
    }), []);

    const animateIn = useCallback(fast => {
        root.set({ display: '' });
        orderedItems().forEach((item, i) => item.animateIn(i * 15, fast));
    }, [root, orderedItems]);

    // Sub-panels created at runtime are already visible in the reference
    // library, which animates them in without a tween.
    useEffect(() => {
        if (autoAnimateIn) animateIn(true);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useImperativeHandle(ref, () => ({
        animateIn,
        animateOut(callback) {
            const handles = orderedItems();
            const last = handles.length - 1;
            handles.forEach((item, i) => item.animateOut(i, last, (last - i) * 15, callback));
        },
        activate() {
            root.stop().animate({ opacity: 1 }, 300, 'easeOutSine');
        },
        deactivate() {
            root.stop().animate({ opacity: 0 }, 300, 'easeOutSine');
        },
        invert(isInverted) {
            const documentRoot = document.documentElement;
            const light = getCSSVar('--ui-invert-light-color');
            const lightTriplet = getCSSVar('--ui-invert-light-color-triplet');
            const lightLine = getCSSVar('--ui-invert-light-color-line');
            const dark = getCSSVar('--ui-invert-dark-color');
            const darkTriplet = getCSSVar('--ui-invert-dark-color-triplet');
            const darkLine = getCSSVar('--ui-invert-dark-color-line');
            documentRoot.style.setProperty('--ui-color', isInverted ? light : dark);
            documentRoot.style.setProperty('--ui-color-triplet', isInverted ? lightTriplet : darkTriplet);
            documentRoot.style.setProperty('--ui-color-line', isInverted ? lightLine : darkLine);
        },
        // Value API — broadcast by name, the matching row answers.
        getPanelIndex(name) {
            for (const item of itemsRef.current) {
                const index = item.getPanelIndex?.(name);
                if (index !== undefined) return index;
            }
        },
        getPanelValue(name) {
            for (const item of itemsRef.current) {
                const value = item.getPanelValue?.(name);
                if (value !== undefined) return value;
            }
        },
        setPanelIndex(name, index) {
            itemsRef.current.forEach(item => item.setPanelIndex?.(name, index));
        },
        setPanelValue(name, value) {
            itemsRef.current.forEach(item => item.setPanelValue?.(name, value));
        }
    }), [root, animateIn, orderedItems]);

    return (
        <PanelContext.Provider value={contextValue}>
            <div ref={rootRef} className="panel">
                {items ? <PanelItems items={items} onChange={onChange} /> : children}
            </div>
        </PanelContext.Provider>
    );
}
