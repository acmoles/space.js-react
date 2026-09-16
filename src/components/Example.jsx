import { useDocumentTitle } from '../hooks/index.js';

/**
 * Full viewport container for an example. Sets the document title and, when
 * `center` is set, centers its contents like the original examples did with
 * flexbox on the body element.
 */
export function Example({ title, className = '', center = false, ref, children, ...props }) {
    useDocumentTitle(`${title} — Space.js`);

    const classNames = ['example'];

    if (center) {
        classNames.push('example-center');
    }

    if (className) {
        classNames.push(className);
    }

    return (
        <div ref={ref} className={classNames.join(' ')} {...props}>
            {children}
        </div>
    );
}
