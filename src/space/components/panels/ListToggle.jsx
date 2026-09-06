import { useImperativeHandle, useRef } from 'react';

import { useAnimation } from '../../motion/index.js';

import './ListToggle.css';

/**
 * A single binary toggle inside a `List` with at most two items.
 * Renders a labelled slot with animated hover and active states that
 * exactly match the original `ListToggle` class.
 *
 * @param {object} props
 * @param {string} props.name  Label text.
 * @param {number} props.index Zero-based index within the parent list.
 * @param {function} props.onClick Called with `{ target: { index } }` when clicked.
 * @param {object} [props.ref] Exposes `activate()` and `deactivate()`.
 * @example
 * <ListToggle name="On" index={0} onClick={({ target }) => console.log(target.index)} />
 */
export function ListToggle({ name, index, onClick, ref }) {
    const activeRef = useRef(false);

    const [contentRef, content] = useAnimation({ opacity: 0.35 });
    const [overRef, over] = useAnimation({ opacity: 0 });

    useImperativeHandle(ref, () => ({
        activate() {
            activeRef.current = true;
            content.stop().set({ y: -8, opacity: 0 });
            over.stop().set({ y: 0, opacity: 1 });
        },
        deactivate() {
            activeRef.current = false;
            content.stop().animate({ y: 0, opacity: 0.35 }, 300, 'easeOutCubic', 50);
            over.stop().animate({ y: 8, opacity: 0 }, 175, 'easeOutCubic');
        }
    }), [content, over]);

    const handleHover = e => {
        if (activeRef.current) return;

        content.stop();
        over.stop();

        if (e.type === 'mouseenter') {
            content.animate({ y: -8, opacity: 0 }, 100, 'easeOutCubic');
            over.set({ y: 8, opacity: 0 }).animate({ y: 0, opacity: 1 }, 175, 'easeOutCubic', 50);
        } else {
            content.animate({ y: 0, opacity: 0.35 }, 300, 'easeOutCubic', 50);
            over.animate({ y: 8, opacity: 0 }, 175, 'easeOutCubic');
        }
    };

    const handleClick = () => {
        if (activeRef.current) return;
        if (onClick) onClick({ target: { index } });
    };

    return (
        <div
            className="list-toggle"
            onMouseEnter={handleHover}
            onMouseLeave={handleHover}
            onClick={handleClick}
        >
            <span ref={contentRef} className="content">{name}</span>
            <span ref={overRef} className="over">{name}</span>
        </div>
    );
}
