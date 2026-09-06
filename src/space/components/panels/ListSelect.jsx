import { useImperativeHandle, useRef } from 'react';

import { useAnimation } from '../../motion/index.js';

import './ListSelect.css';

/**
 * A cycling select widget used inside a `List` with more than two items.
 * Clicking advances to the next item with a slide animation that exactly
 * matches the original `ListSelect` class.
 *
 * @param {object}   props
 * @param {string[]} props.list  Array of key strings to cycle through.
 * @param {number}   props.index Current index into `list`.
 * @param {function} [props.onClick] Called with `{ target: { index } }` after cycling.
 * @param {object}   [props.ref] Exposes `setList(list)` and `setIndex(index)`.
 * @example
 * <ListSelect list={['A', 'B', 'C']} index={0} onClick={({ target }) => console.log(target.index)} />
 */
export function ListSelect({ list: listProp, index: indexProp, onClick, ref }) {
    const listRef = useRef(listProp);
    const indexRef = useRef(indexProp);
    const nextRef = useRef((indexProp + 1) % listProp.length);
    const activeRef = useRef(false);

    const [contentRef, content] = useAnimation();
    const [overRef, over] = useAnimation({ opacity: 0 });

    const syncText = () => {
        if (contentRef.current) contentRef.current.textContent = listRef.current[indexRef.current];
        if (overRef.current) overRef.current.textContent = listRef.current[nextRef.current];
    };

    useImperativeHandle(ref, () => ({
        setList(newList) {
            listRef.current = newList;
            nextRef.current = (indexRef.current + 1) % newList.length;
            syncText();
        },
        setIndex(newIndex) {
            indexRef.current = newIndex;
            nextRef.current = (newIndex + 1) % listRef.current.length;
            syncText();
        }
    }), []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleClick = () => {
        if (activeRef.current) return;
        activeRef.current = true;

        indexRef.current = nextRef.current;
        nextRef.current = (indexRef.current + 1) % listRef.current.length;

        content.animate({ y: -8, opacity: 0 }, 100, 'easeOutCubic');
        over.set({ y: 8, opacity: 0 }).animate({ y: 0, opacity: 1 }, 175, 'easeOutCubic', 50, () => {
            if (contentRef.current) contentRef.current.textContent = listRef.current[indexRef.current];
            content.set({ y: 0, opacity: 1 });
            if (overRef.current) overRef.current.textContent = listRef.current[nextRef.current];
            over.set({ y: 8, opacity: 0 });
            activeRef.current = false;
        });

        if (onClick) onClick({ target: { index: indexRef.current } });
    };

    return (
        <div className="list-select" onClick={handleClick}>
            <span ref={contentRef} className="content">{listProp[indexProp]}</span>
            <span ref={overRef} className="over">{listProp[(indexProp + 1) % listProp.length]}</span>
        </div>
    );
}
