import { useImperativeHandle, useRef } from 'react';

import { useAnimation } from '../../motion/index.js';

import './MenuItem.css';

/**
 * A single item inside a `Menu`. Manages its own hover/active state and the
 * underline animation. `animateIn`, `animateOut`, `activate` and `deactivate`
 * are driven imperatively by the parent `Menu`.
 *
 * @param {object} props
 * @param {string} props.name Display text.
 * @param {number} props.index Zero-based position within the parent `Menu`.
 * @param {number|string} [props.width] Explicit width of the item element.
 * @param {function} [props.onHover] Called with the `mouseenter`/`mouseleave` event.
 * @param {function} [props.onClick] Called with `(event, index)`.
 * @param {object} [props.ref] Exposes `active` (getter), `animateIn(delay)`,
 *   `animateOut`, `activate(direction)` and `deactivate(direction)`.
 * @example
 * <MenuItem name="Scene 1" index={0} onClick={(e, i) => console.log(i)} />
 */
export function MenuItem({
    name,
    index,
    width,
    onHover,
    onClick,
    ref
}) {
    const [rootRef, root] = useAnimation({ y: 10 });
    const [containerRef, container] = useAnimation({ opacity: 0 });
    const [lineRef, line] = useAnimation({
        height: window.devicePixelRatio > 1 ? 1.5 : 1,
        transformOrigin: 'left center',
        scaleX: 0
    });

    const activeRef = useRef(false);
    const animatedInRef = useRef(false);

    useImperativeHandle(ref, () => ({
        get active() {
            return activeRef.current;
        },

        animateIn: (delay = 0) => {
            root.stop();
            root.set({ y: 10, pointerEvents: 'none' });

            container.stop().set({ opacity: 0 }).animate(
                { opacity: activeRef.current ? 1 : 0.5 }, 700, 'easeOutCubic', delay
            );

            root.animate({ y: 0 }, 700, 'easeOutCubic', delay).then(() => {
                root.set({ pointerEvents: 'auto' });
            });

            animatedInRef.current = true;
        },

        animateOut: () => {
            root.stop();
            root.set({ pointerEvents: 'none' });

            container.stop().animate({ opacity: 0 }, 400, 'easeOutCubic');
            root.animate({ y: 0 }, 400, 'easeOutCubic');

            animatedInRef.current = false;
        },

        activate: direction => {
            activeRef.current = true;

            if (animatedInRef.current) {
                container.stop().animate({ opacity: 1 }, 300, 'easeOutSine');
            }

            line.stop()
                .set({ transformOrigin: direction < 0 ? 'left center' : 'right center', scaleX: 0 })
                .animate({ scaleX: 1 }, 500, 'easeOutQuint');
        },

        deactivate: direction => {
            activeRef.current = false;

            if (animatedInRef.current) {
                container.stop().animate({ opacity: 0.5 }, 500, 'easeOutSine');
            }

            line.stop()
                .set({ transformOrigin: direction > 0 ? 'left center' : 'right center' })
                .animate({ scaleX: 0 }, 500, 'easeOutQuint');
        }
    }), [root, container, line]);

    const handleHover = e => {
        if (activeRef.current) {
            return;
        }

        root.stop();

        if (e.type === 'mouseenter') {
            container.animate({ opacity: 1 }, 200, 'easeOutSine');
        } else {
            container.animate({ opacity: 0.5 }, 400, 'easeOutSine');
        }

        if (onHover) {
            onHover(e);
        }
    };

    const handleClick = e => {
        if (activeRef.current) {
            return;
        }

        if (onClick) {
            onClick(e, index);
        }
    };

    return (
        <div
            ref={rootRef}
            className="item"
            style={{ width: width ?? 'fit-content' }}
            onMouseEnter={handleHover}
            onMouseLeave={handleHover}
            onClick={handleClick}
        >
            <div ref={containerRef} className="container">
                {name}
                <span ref={lineRef} className="line" />
            </div>
        </div>
    );
}
