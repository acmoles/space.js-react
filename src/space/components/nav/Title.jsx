import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { shuffle } from '@lib/utils/Utils.js';

import { useAnimation } from '../../motion/index.js';

import './Title.css';

function TitleLetter({ character, index, register }) {
    const [letterRef, letter] = useAnimation();

    useEffect(() => {
        register(index, { controls: letter, character });

        return () => register(index, null);
    }, [register, index, letter, character]);

    return (
        <span ref={letterRef} className="letter">
            {character === ' ' ? '\u00a0' : character}
        </span>
    );
}

/**
 * An animated `h1` title whose letters shuffle-flicker on `animateIn`. Exposes
 * `animateIn`, `animateOut` and `setTitle` imperatively on `ref`.
 *
 * @param {object} props
 * @param {string} props.title Initial title text.
 * @param {object} [props.ref] Exposes `animateIn`, `animateOut` and
 *   `setTitle(title, direction)`.
 * @example
 * const titleRef = useRef(null);
 * <Title title="Hello World" ref={titleRef} />
 * titleRef.current.animateIn();
 */
export function Title({ title: titleProp, ref }) {
    const [rootRef, root] = useAnimation({ visibility: 'hidden', opacity: 0 });
    const [titleState, setTitleState] = useState(titleProp);
    const pendingRef = useRef(null);
    const didMountRef = useRef(false);
    const letters = useRef([]);

    const register = useCallback((index, entry) => {
        letters.current[index] = entry;
    }, []);

    const doAnimateIn = useCallback(() => {
        root.stop();
        root.set({ visibility: '' });

        // Pick up to 2 random non-underscore letters and flicker them
        const all = letters.current.filter(Boolean);
        const picked = shuffle([...all]).filter(e => e.character !== '_').slice(0, 2);

        picked.forEach((entry, i) => {
            entry.controls.stop().set({ opacity: 0 }).animate({ opacity: 1 }, 2000, 'easeOutCubic', 100 + i * 15);
        });

        root.animate({ opacity: 1 }, 1000, 'easeOutSine');
    }, [root]);

    // After setTitle triggers a re-render, re-animate the new letters in
    useEffect(() => {
        if (!didMountRef.current) {
            didMountRef.current = true;
            return;
        }

        const direction = pendingRef.current?.direction ?? 1;
        pendingRef.current = null;

        doAnimateIn();
        // Concurrent root opacity tween from setTitle context — same values
        root.set({ y: 10 * direction }).animate({ y: 0, opacity: 1 }, 1000, 'easeOutCubic');
    }, [titleState]); // eslint-disable-line react-hooks/exhaustive-deps

    useImperativeHandle(ref, () => ({
        animateIn: doAnimateIn,

        animateOut: callback => {
            root.stop().animate({ opacity: 0 }, 300, 'easeInSine').then(() => {
                root.set({ visibility: 'hidden' });
                callback?.();
            });
        },

        setTitle: (title, direction = 1) => {
            pendingRef.current = { direction };
            // Clear letter registry before re-render so stale entries don't linger
            letters.current = [];
            root.stop().animate({ y: -10 * direction, opacity: 0 }, 300, 'easeInSine').then(() => {
                setTitleState(title);
            });
        }
    }), [root, doAnimateIn]);

    return (
        <h1 ref={rootRef} className="title">
            {titleState.split('').map((char, index) => (
                <TitleLetter
                    key={`${index}-${char}`}
                    character={char}
                    index={index}
                    register={register}
                />
            ))}
        </h1>
    );
}
