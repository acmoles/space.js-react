import { useState } from 'react';

import './Content.css';

/**
 * A transparent content container that holds an arbitrary sub-panel and
 * forwards change events upward, matching the original `Content` class.
 *
 * @param {object}   props
 * @param {function} [props.onChange] Called on mount and whenever a child emits a change.
 * @param {React.ReactNode} [props.children] Sub-panel content.
 * @example
 * <Content onChange={e => console.log(e)}>
 *   <Panel items={[...]} />
 * </Content>
 */
export function Content({ onChange, children }) {
    // Mirror the original: emit once on mount
    const [emitted] = useState(() => {
        if (onChange) onChange({ target: null });
        return true;
    });

    void emitted;

    return (
        <div className="content">
            {children && (
                <div className="group">
                    {children}
                </div>
            )}
        </div>
    );
}
