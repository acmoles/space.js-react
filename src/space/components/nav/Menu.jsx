import { useEffect, useImperativeHandle, useRef } from 'react';

import { useResize } from '../../hooks/index.js';

import { MenuItem } from './MenuItem.jsx';

import './Menu.css';

/**
 * A fixed, centred navigation menu. Items are staggered in with `animateIn`
 * and faded out with `animateOut`. The active item is tracked internally; the
 * initial value comes from the `active` prop.
 *
 * @param {object} props
 * @param {string[]} props.items List of item label strings.
 * @param {string} [props.active] Initially active item name.
 * @param {boolean} [props.bottom=false] Pin to the bottom instead of the top.
 * @param {number|string} [props.itemWidth] Width applied to every `MenuItem`.
 * @param {number} [props.breakpoint=0] Viewport width below which inset
 *   shrinks from 20 px to 10 px.
 * @param {function} [props.onUpdate] Called with `(activeName, activeIndex)`
 *   whenever the selection changes, including on mount.
 * @param {function} [props.onHover] Called with the `mouseenter`/`mouseleave` event.
 * @param {function} [props.onClick] Called with `(event, activeName, activeIndex)`.
 * @param {object} [props.ref] Exposes `animateIn` and `animateOut`.
 * @example
 * <Menu items={['Scene 1', 'Scene 2']} active="Scene 1" onUpdate={(name) => console.log(name)} />
 */
export function Menu({
    items,
    active,
    bottom = false,
    itemWidth,
    breakpoint = 0,
    onUpdate,
    onHover,
    onClick,
    ref
}) {
    const rootRef = useRef(null);
    const itemRefs = useRef([]);
    const prevIndexRef = useRef(-1);

    // Responsive inset
    useResize(({ width }) => {
        const el = rootRef.current;

        if (!el) {
            return;
        }

        const inset = width < breakpoint ? 10 : 20;

        el.style.left = `${inset}px`;
        el.style.right = `${inset}px`;
        el.style[bottom ? 'bottom' : 'top'] = `${inset}px`;
    });

    const activateItem = newIndex => {
        const direction = prevIndexRef.current > newIndex ? 1 : -1;
        prevIndexRef.current = newIndex;

        itemRefs.current.forEach((item, i) => {
            if (!item) {
                return;
            }

            if (i === newIndex && !item.active) {
                item.activate(direction);
            } else if (i !== newIndex && item.active) {
                item.deactivate(direction);
            }
        });
    };

    // Initial activation — mirrors the constructor's this.update() call
    useEffect(() => {
        const initialIndex = items.indexOf(active);
        const idx = initialIndex >= 0 ? initialIndex : 0;

        activateItem(idx);

        if (onUpdate) {
            onUpdate(items[idx], idx);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useImperativeHandle(ref, () => ({
        animateIn: () => {
            itemRefs.current.forEach((item, i) => item?.animateIn(i * 200));
        },
        animateOut: () => {
            itemRefs.current.forEach(item => item?.animateOut());
        }
    }), []);

    const handleItemHover = e => {
        if (onHover) {
            onHover(e);
        }
    };

    const handleItemClick = (e, clickedIndex) => {
        activateItem(clickedIndex);

        if (onUpdate) {
            onUpdate(items[clickedIndex], clickedIndex);
        }

        if (onClick) {
            onClick(e, items[clickedIndex], clickedIndex);
        }
    };

    return (
        <div ref={rootRef} className={bottom ? 'menu menu--bottom' : 'menu'}>
            {items.map((name, i) => (
                <MenuItem
                    key={name}
                    ref={el => { itemRefs.current[i] = el; }}
                    name={name}
                    index={i}
                    width={itemWidth}
                    onHover={handleItemHover}
                    onClick={handleItemClick}
                />
            ))}
        </div>
    );
}
