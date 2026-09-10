import { useEffect, useImperativeHandle, useState } from 'react';

import './Content.css';

/**
 * A transparent content container that holds an arbitrary sub-panel and
 * forwards change events upward, matching the original `Content` class.
 *
 * @param {object}   props
 * @param {function} [props.onChange] Called on mount and whenever a child emits a change.
 * @param {React.ReactNode} [props.children] Sub-panel content.
 * @param {object}   [props.ref] Exposes `setContent(node)`.
 * @example
 * <Content onChange={e => console.log(e)}>
 *   <Panel items={[...]} />
 * </Content>
 */
export function Content({ onChange, children, ref }) {
    const [dynContent, setDynContent] = useState(null);

    useImperativeHandle(ref, () => ({
        setContent(node) {
            setDynContent(node);
        }
    }), []);

    // Mirror the original: emit once on mount so callbacks can populate content
    useEffect(() => {
        if (onChange) onChange({ target: null });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const content = dynContent ?? children;

    return (
        <div className="content">
            {content && (
                <div className="group">
                    {content}
                </div>
            )}
        </div>
    );
}
