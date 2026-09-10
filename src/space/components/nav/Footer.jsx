import { useImperativeHandle, useLayoutEffect, useRef } from 'react';

import { useResize } from '../../hooks/index.js';

import { NavLink } from './NavLink.jsx';
import { NavTitle } from './NavTitle.jsx';
import { FooterTitle } from './FooterTitle.jsx';

import './Footer.css';

/**
 * Fixed navigation footer. Children slide in staggered via `animateIn` and
 * fade out via `animateOut`.
 *
 * @param {object} props
 * @param {object} [props.title] Data forwarded to a `NavTitle`:
 *   `{ name, caption, link, target, callback, onHover, onClick }`.
 * @param {object[]} [props.links] Array of data objects forwarded to `NavLink`
 *   components: `{ title, link, target, onHover, onClick }`.
 * @param {object} [props.info] Data forwarded to a `FooterTitle` (the right-side
 *   label): `{ name, caption, link, target, callback, onHover, onClick }`.
 * @param {number} [props.breakpoint=0] Viewport width below which inset
 *   shrinks from 20 px to 10 px.
 * @param {object} [props.ref] Exposes `animateIn` and `animateOut`.
 * @example
 * const footerRef = useRef(null);
 * <Footer title={{ name: 'Space.js' }} ref={footerRef} />
 * footerRef.current.animateIn();
 */
export function Footer({
    title,
    links,
    info,
    breakpoint = 0,
    ref
}) {
    const rootRef = useRef(null);
    const titleRef = useRef(null);
    const linkRefs = useRef([]);
    const infoRef = useRef(null);

    const getChildren = () => [
        title ? titleRef.current : null,
        ...(Array.isArray(links) ? links.map((_, i) => linkRefs.current[i]) : []),
        info ? infoRef.current : null
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
        el.style.right = `${inset}px`;
        el.style.bottom = `${inset}px`;
    });

    useImperativeHandle(ref, () => ({
        animateIn: () => {
            getChildren().forEach((child, i) => child.animateIn(i * 200));
        },
        animateOut: () => {
            getChildren().forEach(child => child.animateOut());
        }
    }), []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div ref={rootRef} className="footer">
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
            {info && (
                <FooterTitle
                    ref={infoRef}
                    {...info}
                />
            )}
        </div>
    );
}
