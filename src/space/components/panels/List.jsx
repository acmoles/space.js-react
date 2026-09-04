import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { ListSelect } from './ListSelect.jsx';
import { ListToggle } from './ListToggle.jsx';

import './List.css';

/**
 * A list selector that renders either two `ListToggle` buttons (≤ 2 items)
 * or a cycling `ListSelect` (> 2 items). Behaviour is identical to the
 * original `List` class, including sub-panel content.
 *
 * @param {object}   props
 * @param {string}   props.name     Field label / path name.
 * @param {Map}      props.list     Map of key→value entries.
 * @param {*}        [props.value]  Initially selected value (matched by value, not key).
 * @param {function} [props.onChange] Called with `{ path, index, value, target }`.
 * @param {React.ReactNode} [props.children] Optional sub-panel rendered below.
 * @param {object}   [props.ref] Exposes `setIndex`, `setValue`, `setList`, `toggleContent`.
 * @example
 * <List
 *   name="Quality"
 *   list={new Map([['Low', 'low'], ['High', 'high']])}
 *   value="low"
 *   onChange={e => console.log(e.value)}
 * />
 */
export function List({ list, value, onChange, children, ref }) {
    const keys = useRef(Array.from(list.keys()));
    const values = useRef(Array.from(list.values()));

    // keysState mirrors keys.current for rendering (JSX cannot read ref.current)
    const [keysState, setKeysState] = useState(() => Array.from(list.keys()));
    const [index, setIndexState] = useState(() => Array.from(list.values()).indexOf(value));
    const [showContent, setShowContent] = useState(true);

    const indexRef = useRef(index);
    const itemRefs = useRef([]);
    const selectRef = useRef(null);

    // Dynamic content — set imperatively via setContent() (mirrors Slider pattern)
    const dynContentRef = useRef(null);
    const [dynContent, setDynContent] = useState(null);

    const emitChange = useCallback(newIndex => {
        if (onChange) {
            onChange({ path: [], index: newIndex, value: keys.current[newIndex], target: null });
        }
    }, [onChange]);

    // Sync toggle active state after every index change (toggle mode only)
    useEffect(() => {
        if (keys.current.length > 2) return;
        itemRefs.current.forEach((item, i) => {
            if (!item) return;
            if (i === indexRef.current) item.activate();
            else item.deactivate();
        });
    }, [index]);

    useImperativeHandle(ref, () => ({
        setIndex(newIndex, notify = true) {
            indexRef.current = newIndex;
            setIndexState(newIndex);
            if (keys.current.length > 2) selectRef.current?.setIndex(newIndex);
            if (notify) emitChange(newIndex);
        },
        setValue(val, notify = true) {
            const newIndex = values.current.indexOf(val);
            if (newIndex === -1) return;
            indexRef.current = newIndex;
            setIndexState(newIndex);
            if (keys.current.length > 2) selectRef.current?.setIndex(newIndex);
            if (notify) emitChange(newIndex);
        },
        setList(newMap) {
            keys.current = Array.from(newMap.keys());
            values.current = Array.from(newMap.values());
            setKeysState(keys.current.slice());
            if (keys.current.length > 2) {
                selectRef.current?.setList(keys.current);
            }
        },
        hasContent() {
            return dynContentRef.current !== null;
        },
        setContent(node) {
            dynContentRef.current = node;
            setDynContent(node);
        },
        toggleContent(show) {
            setShowContent(show);
        }
    }), [emitChange]);

    const handleClick = useCallback(({ target }) => {
        const newIndex = target.index;
        indexRef.current = newIndex;
        setIndexState(newIndex);
        emitChange(newIndex);
    }, [emitChange]);

    return (
        <div className="list">
            <div className="container">
                {keysState.length > 2 ? (
                    <ListSelect
                        ref={selectRef}
                        list={keysState}
                        index={index}
                        onClick={handleClick}
                    />
                ) : (
                    keysState.map((k, i) => (
                        <ListToggle
                            key={k}
                            ref={el => { itemRefs.current[i] = el; }}
                            name={k}
                            index={i}
                            onClick={handleClick}
                        />
                    ))
                )}
            </div>
            {(children || dynContent) && (
                <div className="group" style={{ display: showContent ? '' : 'none' }}>
                    {dynContent ?? children}
                </div>
            )}
        </div>
    );
}
