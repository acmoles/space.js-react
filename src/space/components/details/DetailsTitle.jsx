import { useCallback, useEffect, useImperativeHandle, useRef } from 'react';

import { shuffle } from '@lib/utils/Utils.js';
import { useAnimation } from '../../motion/index.js';

import './DetailsTitle.css';

/**
 * @param {object} props
 * @param {string} props.char Single character to render.
 * @param {number} props.index Position index used to register the control.
 * @param {function} props.register `(index, entry|null) => void` callback.
 */
function Letter({ char, index, register }) {
    const [letterRef, letter] = useAnimation();

    useEffect(() => {
        register(index, { char, letter });

        return () => register(index, null);
    }, [register, index, char, letter]);

    return (
        <span ref={letterRef} className="letter">
            {char === ' ' ? '\u00a0' : char}
        </span>
    );
}

/**
 * An `<h1>` whose characters animate in with a shuffle-based stagger.
 * Mirrors `lib/ui/DetailsTitle.js`.
 *
 * @param {object} props
 * @param {string} props.title Title string to split into animated letters.
 * @param {object} [props.ref] Exposes `animateIn`.
 * @example
 * <DetailsTitle title="Hello World" ref={titleRef} />
 */
export function DetailsTitle({ title, ref }) {
    const [rootRef] = useAnimation();
    const entries = useRef([]);

    const register = useCallback((index, entry) => {
        entries.current[index] = entry;
    }, []);

    const runAnimateIn = useCallback(() => {
        const all = entries.current.filter(e => e !== null && e !== undefined && e.char !== '_');
        const pool = [...all];

        shuffle(pool);

        pool.slice(0, 2).forEach((entry, i) => {
            entry.letter.stop().set({ opacity: 0 }).animate({ opacity: 1 }, 2000, 'easeOutCubic', 100 + i * 15);
        });
    }, []);

    useImperativeHandle(ref, () => ({
        animateIn: runAnimateIn
    }), [runAnimateIn]);

    return (
        <h1 ref={rootRef} className="title">
            {title.split('').map((char, index) => (
                <Letter
                    key={`${index}-${char}`}
                    char={char}
                    index={index}
                    register={register}
                />
            ))}
        </h1>
    );
}
