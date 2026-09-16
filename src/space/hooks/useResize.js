import { useEffect, useRef } from 'react';

/**
 * Calls back on window resize, and once on mount, which is the pattern the
 * Space.js views use to lay themselves out.
 *
 * @param {function} callback Called with the current window size.
 */
export function useResize(callback) {
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    });

    useEffect(() => {
        const onResize = () => callbackRef.current({
            width: window.innerWidth,
            height: window.innerHeight,
            dpr: window.devicePixelRatio
        });

        window.addEventListener('resize', onResize);

        onResize();

        return () => window.removeEventListener('resize', onResize);
    }, []);
}
