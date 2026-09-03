import { useImperativeHandle } from 'react';

import { useAnimation } from '../motion/index.js';

import './FooterTitle.css';

/**
 * Right-floating footer title with optional name, caption and click/link behaviour.
 * Used as the right-side label inside a `Footer`. Identical to `NavTitle` except
 * it floats right. Its `animateIn` and `animateOut` are driven by the parent `Footer`.
 *
 * @param {object} props
 * @param {string} [props.name] Primary label (supports HTML).
 * @param {string} [props.caption] Secondary label below name (supports HTML).
 * @param {string} [props.link] URL opened on click.
 * @param {string} [props.target='_blank'] `target` for the link `window.open` call.
 * @param {function} [props.callback] Called (no arguments) when clicked.
 * @param {function} [props.onHover] Called with the `mouseenter`/`mouseleave` event.
 * @param {function} [props.onClick] Called with the `click` event.
 * @param {object} [props.ref] Exposes `hide`, `animateIn(delay)` and `animateOut`.
 * @example
 * <FooterTitle name="Space.js" caption="v1.0" link="https://ufo.ai/" />
 */
export function FooterTitle({
    name,
    caption,
    link,
    target = '_blank',
    callback,
    onHover,
    onClick,
    ref
}) {
    const [rootRef, root] = useAnimation();

    useImperativeHandle(ref, () => ({
        hide: () => root.stop().set({ x: -10, opacity: 0 }),
        animateIn: (delay = 0) => root.stop().set({ x: -10, opacity: 0 }).animate({ x: 0, opacity: 1 }, 1000, 'easeOutQuart', delay),
        animateOut: () => root.stop().animate({ opacity: 0 }, 400, 'easeOutCubic')
    }), [root]);

    const isClickable = !!(link || callback);

    const handleClick = e => {
        if (link) {
            window.open(link, target);
        }

        if (callback) {
            callback();
        }

        if (onClick) {
            onClick(e);
        }
    };

    return (
        <div
            ref={rootRef}
            className={isClickable ? 'title title--clickable' : 'title'}
            style={{ float: 'right' }}
            onMouseEnter={isClickable ? onHover : undefined}
            onMouseLeave={isClickable ? onHover : undefined}
            onClick={isClickable ? handleClick : undefined}
        >
            {name !== undefined && (
                // eslint-disable-next-line react/no-danger
                <div className="name" dangerouslySetInnerHTML={{ __html: name }} />
            )}
            {caption !== undefined && (
                // eslint-disable-next-line react/no-danger
                <div className="caption" dangerouslySetInnerHTML={{ __html: caption }} />
            )}
        </div>
    );
}
