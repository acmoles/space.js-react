import { useImperativeHandle, useLayoutEffect, useRef } from 'react';

import { useResize } from '../../hooks/index.js';

import { NavLink } from './NavLink.jsx';
import { NavTitle } from './NavTitle.jsx';
import { HeaderInfo } from './HeaderInfo.jsx';

import './Header.css';

/**
 * Fixed navigation header. Children slide in staggered via `animateIn` and
 * fade out via `animateOut`. Shows an FPS counter when `fps` or `fpsOpen` is
 * set. When `HeaderInfo` has panel items, the header ref also proxies the full
 * panel API (`addPanel`, `getPanelIndex`, `getPanelValue`, `setPanelIndex`,
 * `setPanelValue`, `openPanel`) so composites like `UI` can delegate without
 * holding a direct reference to `HeaderInfo`.
 *
 * @param {object} props
 * @param {object} [props.title] Data forwarded to a `NavTitle`:
 *   `{ name, caption, link, target, callback, onHover, onClick }`.
 * @param {object[]} [props.links] Array of data objects forwarded to `NavLink`
 *   components: `{ title, link, target, onHover, onClick }`.
 * @param {boolean} [props.fps=false] Show the FPS counter.
 * @param {boolean} [props.fpsOpen=false] Show the FPS counter and immediately
 *   open the debug panel on `animateIn`.
 * @param {number} [props.breakpoint=0] Viewport width below which inset
 *   shrinks from 20 px to 10 px.
 * @param {object} [props.ref] Exposes `animateIn`, `animateOut`, `addPanel`,
 *   `getPanelIndex`, `getPanelValue`, `setPanelIndex`, `setPanelValue` and
 *   `openPanel`.
 * @example
 * const headerRef = useRef(null);
 * <Header title={{ name: 'Space.js' }} fps ref={headerRef} />
 * headerRef.current.animateIn();
 * headerRef.current.addPanel({ type: 'slider', name: 'Speed', value: 5 });
 */
export function Header({
    title,
    links,
    fps = false,
    fpsOpen = false,
    breakpoint = 0,
    ref
}) {
    const rootRef = useRef(null);
    const titleRef = useRef(null);
    const linkRefs = useRef([]);
    const infoRef = useRef(null);

    const showInfo = fps || fpsOpen;

    // Collect children in DOM order for staggered animation
    const getChildren = () => [
        title ? titleRef.current : null,
        ...(Array.isArray(links) ? links.map((_, i) => linkRefs.current[i]) : []),
        showInfo ? infoRef.current : null
    ].filter(Boolean);

    // Mirror the original constructor: set children to x:-10 opacity:0 before paint
    useLayoutEffect(() => {
        getChildren().forEach(child => child?.hide?.());
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Responsive inset
    useResize(({ width }) => {
        const el = rootRef.current;

        if (!el) {
            return;
        }

        const inset = width < breakpoint ? 10 : 20;

        el.style.left = `${inset}px`;
        el.style.top = `${inset}px`;
        el.style.right = `${inset}px`;
    });

    useImperativeHandle(ref, () => ({
        animateIn: () => {
            const children = getChildren();

            children.forEach((child, i) => child.animateIn(i * 200));

            if (fpsOpen) {
                infoRef.current?.openPanel();
            }
        },
        animateOut: () => {
            getChildren().forEach(child => child.animateOut());
        },
        // Panel API — proxied from HeaderInfo so composites don't need a
        // separate ref to HeaderInfo.
        addPanel: item => infoRef.current?.addPanel(item),
        getPanelIndex: name => infoRef.current?.getPanelIndex(name),
        getPanelValue: name => infoRef.current?.getPanelValue(name),
        setPanelIndex: (name, idx, path) => infoRef.current?.setPanelIndex(name, idx, path),
        setPanelValue: (name, val, path) => infoRef.current?.setPanelValue(name, val, path),
        openPanel: () => infoRef.current?.openPanel()
    }), []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div ref={rootRef} className="header">
            {title && (
                <NavTitle
                    ref={titleRef}
                    {...title}
                />
            )}
            {Array.isArray(links) && links.map((linkData, i) => (
                <NavLink
                    key={i}
                    ref={el => { linkRefs.current[i] = el; }}
                    {...linkData}
                />
            ))}
            {showInfo && (
                <HeaderInfo ref={infoRef} fpsOpen={fpsOpen} />
            )}
        </div>
    );
}
