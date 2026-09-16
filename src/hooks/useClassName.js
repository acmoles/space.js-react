import { useEffect } from 'react';

/**
 * Adds class names to an element (`document.documentElement` by default) while
 * the component is mounted, removing them on unmount.
 */
export function useClassName(className, element = null) {
    useEffect(() => {
        if (!className) {
            return;
        }

        const target = element || document.documentElement;
        const names = className.split(' ').filter(name => name);

        target.classList.add(...names);

        return () => {
            target.classList.remove(...names);
        };
    }, [className, element]);
}
