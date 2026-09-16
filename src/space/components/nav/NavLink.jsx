import { useCallback, useEffect, useImperativeHandle, useRef } from 'react';

import { useAnimation } from '../../motion/index.js';

import './NavLink.css';

function Letter({ character, index, register }) {
    const [letterRef, letter] = useAnimation();

    useEffect(() => {
        register(index, letter);

        return () => register(index, null);
    }, [register, index, letter]);

    return (
        <span ref={letterRef} className="letter">
            {character === ' ' ? '\u00a0' : character}
        </span>
    );
}

/**
 * A link whose letters flip over one after another on hover.
 *
 * @param {object} props
 * @param {string} props.title Link text.
 * @param {string} props.link `href` of the link.
 * @param {string} [props.target] `target` of the link.
 * @param {function} [props.onHover] Called with the `mouseenter`/`mouseleave` event.
 * @param {function} [props.onClick] Called with the `click` event.
 * @param {object} [props.ref] Exposes `animateIn` and `animateOut`.
 * @example
 * <NavLink title="Lorem ipsum" link="https://ufo.ai/" />
 */
export function NavLink({
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
    const letters = useRef([]);

    const register = useCallback((index, letter) => {
        letters.current[index] = letter;
    }, []);

    useImperativeHandle(ref, () => ({
        /**
         * Resets to the off-screen start state without animating. Called by
         * parent composites (`Header`, `Footer`) from `useLayoutEffect` so the
         * link is invisible before the first paint.
         */
        hide: () => root.stop().set({ x: -10, opacity: 0 }),
        /**
         * Slides in from x −10 → 0 and fades in, matching the Header stagger
         * animation: 1 000 ms easeOutQuart with an optional `delay` for
         * staggering.
         */
        animateIn: (delay = 0) => root.stop().set({ x: -10, opacity: 0 }).animate({ x: 0, opacity: 1 }, 1000, 'easeOutQuart', delay),
        animateOut: () => root.stop().animate({ opacity: 0 }, 400, 'easeOutCubic')
    }), [root]);

    const handleHover = event => {
        if (event.type === 'mouseenter') {
            letters.current.forEach((letter, i) => {
                if (!letter) {
                    return;
                }

                letter.stop().animate({ y: -5, opacity: 0 }, 125, 'easeOutCubic', i * 15, () => {
                    letter.set({ y: 5 }).animate({ y: 0, opacity: 1 }, 300, 'easeOutCubic');
                });
            });
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
            {title.split('').map((character, index) => (
                <Letter
                    key={`${index}-${character}`}
                    character={character}
                    index={index}
                    register={register}
                />
            ))}
        </a>
    );
}
