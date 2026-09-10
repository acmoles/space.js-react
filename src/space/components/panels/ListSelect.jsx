import { useEffect, useImperativeHandle, useRef } from 'react';

import { useAnimation } from '../../motion/index.js';

import './ListSelect.css';

/**
 * A cycling select widget used inside a `List` with more than two items.
 * Clicking advances to the next item with a slide animation that exactly
 * matches the original `ListSelect` class.
 *
 * @param {object}   props
 * @param {string[]} props.list  Array of key strings to cycle through.
 * @param {number}   props.index Initial index into `list`. Like the original,
 *                                the widget owns its index after mount; later
 *                                changes must go through the `setIndex` handle.
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

    // The original owns both labels imperatively and only rewrites them when
    // the cycle animation completes.  Rendering them as JSX children instead
    // would let the re-render triggered by the click commit the new text
    // immediately, so `content` would jump to the incoming item while it is
    // still animating out — the visible "skips an item" glitch.
    useEffect(syncText, []); // eslint-disable-line react-hooks/exhaustive-deps

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
            <span ref={contentRef} className="content" />
            <span ref={overRef} className="over" />
        </div>
    );
}
