import { useCallback, useEffect, useImperativeHandle, useRef } from 'react';

import { useAnimation } from '../../motion/index.js';
import { useResize } from '../../hooks/index.js';
import { Graph } from '../graphs/Graph.jsx';
import { GraphSegments } from '../graphs/GraphSegments.jsx';
import { Meter } from '../graphs/Meter.jsx';
import { DetailsLink } from './DetailsLink.jsx';
import { DetailsTitle } from './DetailsTitle.jsx';
import { DividerLine } from '../nav/DividerLine.jsx';

import './Details.css';

/**
 * Animated wrapper for a direct container child.
 * Uses the NavLink registration pattern.
 *
 * @param {object} props
 * @param {*} props.children
 * @param {number} props.index
 * @param {function} props.register
 */
function AnimatedChild({ children, index, register }) {
    const [blockRef, block] = useAnimation({ opacity: 0 });

    useEffect(() => {
        register(index, block);

        return () => register(index, null);
    }, [register, index, block]);

    return <div ref={blockRef}>{children}</div>;
}

/**
 * Recursively renders the `content` data schema used by Details.
 *
 * @param {string|object} item
 * @param {string} key React key prefix.
 * @returns {React.ReactNode}
 */
function renderContentItem(item, key) {
    if (typeof item === 'string') {
        return (
            <div
                key={key}
                className="content"
                style={{ width: 'fit-content' }}
                dangerouslySetInnerHTML={{ __html: item }}
            />
        );
    }

    if (item.group !== undefined) {
        return (
            <div
                key={key}
                className="content"
                style={{ display: 'flex', flexWrap: 'wrap', width: item.width }}
            >
                {item.group.map((child, i) => renderContentItem(child, `${key}-${i}`))}
            </div>
        );
    }

    return (
        <div
            key={key}
            className="content"
            style={{ flexGrow: 1, width: item.width, marginRight: 20 }}
        >
            {item.title !== undefined && (
                <h2
                    style={{ width: 'fit-content' }}
                    dangerouslySetInnerHTML={{ __html: item.title }}
                />
            )}
            {item.content !== undefined && (
                <div
                    className="content"
                    style={{ width: 'fit-content' }}
                    dangerouslySetInnerHTML={{ __html: item.content }}
                />
            )}
            {item.graph !== undefined && (
                item.graph.segments
                    ? <GraphSegments {...item.graph} />
                    : <Graph {...item.graph} />
            )}
            {item.meter !== undefined && (
                <Meter {...item.meter} />
            )}
            {Array.isArray(item.links) && item.links.map((link, i) => (
                <DetailsLink
                    key={i}
                    title={link.title}
                    link={link.link}
                    target={link.target}
                    style={{ display: 'block' }}
                />
            ))}
        </div>
    );
}

/**
 * Full-width details panel with animated title, content blocks and optional background.
 * Mirrors `lib/ui/Details.js`.
 *
 * @param {object} props
 * @param {object} props.data Panel data descriptor.
 * @param {string} [props.data.width='100vw'] CSS width of the panel.
 * @param {boolean} [props.data.background] Render a fixed background overlay.
 * @param {boolean} [props.data.dividerLine] Render a `DividerLine` at the edge.
 * @param {string} [props.data.title] `<h1>` title text.
 * @param {Array|object|string} [props.data.content] Content schema items.
 * @param {number} [props.breakpoint=0] Pixel width below which narrow padding applies.
 * @param {function} [props.onClick] Called when the background overlay is clicked.
 * @param {object} [props.ref] Exposes `animateIn` and `animateOut`.
 * @example
 * <Details data={{ title: 'Apollo', content: 'Info text' }} ref={detailsRef} />
 */
export function Details({ data, breakpoint = 0, onClick, ref }) {
    const width = (data && data.width) || '100vw';

    const [rootRef, root] = useAnimation({ visibility: 'hidden', opacity: 0 });
    const [bgRef, bg] = useAnimation({ opacity: 0 });
    const [containerRef, container] = useAnimation();

    const dividerRef = useRef(null);
    const titleHandle = useRef(null);
    const childAnims = useRef([]);

    const register = useCallback((index, ctrl) => {
        childAnims.current[index] = ctrl;
    }, []);

    useResize(({ width: w }) => {
        if (w < breakpoint) {
            container.set({ padding: '80px 20px 60px' });
        } else {
            container.set({ padding: `10vw calc(${width} - 10vw - 440px) 13vw 10vw` });
        }
    });

    useImperativeHandle(ref, () => ({
        animateIn() {
            const duration = 2000;
            const stagger = 175;

            root.stop().set({ visibility: 'visible', opacity: 1 });

            if (data && data.background) {
                bg.stop().set({ opacity: 0 }).animate({ opacity: 0.35 }, duration, 'easeOutSine');
            }

            if (dividerRef.current) {
                dividerRef.current.animateIn();
            }

            childAnims.current.forEach((ctrl, i) => {
                if (!ctrl) {
                    return;
                }

                const delay = i === 0 ? 0 : 200;

                ctrl.stop().set({ opacity: 0 }).animate({ opacity: 1 }, duration, 'easeOutCubic', delay + i * stagger);
            });

            if (titleHandle.current) {
                titleHandle.current.animateIn();
            }
        },

        animateOut(callback) {
            if (dividerRef.current) {
                dividerRef.current.animateOut();
            }

            root.stop().animate({ opacity: 0 }, 400, 'easeOutCubic', () => {
                root.set({ visibility: 'hidden' });

                if (callback) {
                    callback();
                }
            });
        }
    }), [root, bg, data]);

    const contentItems = data && data.content
        ? (Array.isArray(data.content) ? data.content : [data.content])
        : [];

    // Precompute stable child indices: title first, then content items
    const hasTitle = !!(data && data.title !== undefined);
    const titleChildIndex = 0;
    const contentStartIndex = hasTitle ? 1 : 0;

    return (
        <div ref={rootRef} className="details">
            {data && data.background && (
                <div
                    ref={bgRef}
                    className="bg"
                    onClick={onClick}
                />
            )}
            {data && data.dividerLine && (
                <DividerLine ref={dividerRef} left={width} />
            )}
            <div ref={containerRef} className="container">
                {hasTitle && (
                    <AnimatedChild index={titleChildIndex} register={register}>
                        <DetailsTitle title={data.title} ref={titleHandle} />
                    </AnimatedChild>
                )}
                {contentItems.map((item, i) => (
                    <AnimatedChild key={i} index={contentStartIndex + i} register={register}>
                        {renderContentItem(item, `content-${i}`)}
                    </AnimatedChild>
                ))}
            </div>
        </div>
    );
}
