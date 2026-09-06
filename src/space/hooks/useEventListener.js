import { useEffect, useRef } from 'react';

/**
 * Adds an event listener for the lifetime of the component.
 *
 * The handler is stored in a ref so it can be defined inline without
 * resubscribing on every render.
 *
 * @param {EventTarget|object} target Element, ref object, or `window`.
 * @param {string} type Event type.
 * @param {function} handler Event handler.
 * @param {object} [options] `addEventListener` options.
 */
export function useEventListener(target, type, handler, options) {
    const handlerRef = useRef(handler);

    useEffect(() => {
        handlerRef.current = handler;
    });

    useEffect(() => {
        const element = target && 'current' in target ? target.current : target;

        if (!element || !element.addEventListener) {
            return;
        }

        const listener = event => handlerRef.current(event);

        element.addEventListener(type, listener, options);

        return () => element.removeEventListener(type, listener, options);
    });
}
