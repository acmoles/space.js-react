import { useImperativeHandle } from 'react';

import { useAnimation } from '../motion/index.js';

import './Link.css';

/**
 * A link with a line that wipes in on hover.
 *
 * @param {object} props
 * @param {string} props.title Link text.
 * @param {string} props.link `href` of the link.
 * @param {string} [props.target] `target` of the link.
 * @param {function} [props.onHover] Called with the `mouseenter`/`mouseleave` event.
 * @param {function} [props.onClick] Called with the `click` event.
 * @param {object} [props.ref] Exposes `animateIn` and `animateOut`.
 * @example
 * <Link title="Lorem ipsum" link="https://ufo.ai/" />
 */
export function Link({
    title,
    link,
    target = '_blank',
    onHover,
    onClick,
    className,
    ref,
    ...props
}) {
    const [rootRef, root] = useAnimation();
    const [lineRef, line] = useAnimation({
        // Hairline on high density displays, matching the original
        height: window.devicePixelRatio > 1 ? 1.5 : 1,
        transformOrigin: 'left center',
        scaleX: 0
    });

    useImperativeHandle(ref, () => ({
        animateIn: () => root.stop().animate({ opacity: 1 }, 400, 'easeOutCubic'),
        animateOut: () => root.stop().animate({ opacity: 0 }, 400, 'easeOutCubic')
    }), [root]);

    const handleHover = event => {
        line.stop();

        if (event.type === 'mouseenter') {
            line.set({ transformOrigin: 'left center', scaleX: 0 }).animate({ scaleX: 1 }, 800, 'easeOutQuint');
        } else {
            line.set({ transformOrigin: 'right center' }).animate({ scaleX: 0 }, 500, 'easeOutQuint');
        }

        if (onHover) {
            onHover(event);
        }
    };

    return (
        <a
            ref={rootRef}
            className={className ? `link ${className}` : 'link'}
            href={link}
            target={target}
            onMouseEnter={handleHover}
            onMouseLeave={handleHover}
            onClick={onClick}
            {...props}
        >
            {title}
            <span ref={lineRef} className="line" />
        </a>
    );
}
