import { useAnimation } from '../../motion/index.js';

import './DetailsLink.css';

/**
 * A details-panel link with an em-dash suffix that shifts right on hover.
 * Mirrors `lib/ui/DetailsLink.js`.
 *
 * @param {object} props
 * @param {string} props.title Link label text.
 * @param {string} props.link `href` of the anchor.
 * @param {string} [props.target='_blank'] `target` attribute.
 * @param {function} [props.onHover] Called with the `mouseenter`/`mouseleave` event.
 * @param {function} [props.onClick] Called with the `click` event.
 * @example
 * <DetailsLink title="Read more" link="https://example.com" />
 */
export function DetailsLink({ title, link, target = '_blank', onHover, onClick }) {
    const [lineRef, line] = useAnimation();

    const handleHover = event => {
        line.stop().animate({ x: event.type === 'mouseenter' ? 10 : 0 }, 200, 'easeOutCubic');

        if (onHover) {
            onHover(event);
        }
    };

    return (
        <a
            className="link"
            href={link}
            target={target}
            onMouseEnter={handleHover}
            onMouseLeave={handleHover}
            onClick={onClick}
        >
            <span className="content">{title}</span>
            <span ref={lineRef} className="line">&nbsp;&nbsp;&#8212;</span>
        </a>
    );
}
