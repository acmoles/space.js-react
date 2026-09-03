import { useCallback, useEffect, useImperativeHandle, useRef } from 'react';

import { useAnimation } from '../../motion/index.js';
import { useResize } from '../../hooks/index.js';
import { DetailsTitle } from './DetailsTitle.jsx';

import './DetailsInfo.css';

/**
 * Animated wrapper for a direct container child, registered via the NavLink pattern.
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
 * An absolutely-positioned overlay panel that slides in from the left.
 * Mirrors `lib/ui/DetailsInfo.js`.
 *
 * @param {object} props
 * @param {object} props.data `{ title?, content? }` descriptor.
 * @param {boolean} [props.hasDetailsButton=false] Adjusts narrow-viewport padding.
 * @param {number} [props.breakpoint=0] Pixel width below which narrow padding applies.
 * @param {object} [props.ref] Exposes `animateIn` and `animateOut`.
 * @example
 * <DetailsInfo data={{ title: 'Moon', content: 'Some description' }} ref={infoRef} />
 */
export function DetailsInfo({ data, hasDetailsButton = false, breakpoint = 0, ref }) {
    const [rootRef, root] = useAnimation({ visibility: 'hidden', opacity: 0, x: -10 });
    const [containerRef, container] = useAnimation();

    const titleHandle = useRef(null);
    const childAnims = useRef([]);

    const register = useCallback((index, ctrl) => {
        childAnims.current[index] = ctrl;
    }, []);

    useResize(({ width }) => {
        if (width < breakpoint) {
            const padding = hasDetailsButton ? '0 20px 60px' : '0 20px 24px';

            container.set({ padding });
        } else {
            container.set({ padding: '10% 10% 6%' });
        }
    });

    useImperativeHandle(ref, () => ({
        animateIn() {
            const duration = 2000;
            const stagger = 175;

            root.stop().set({ visibility: 'visible', x: -10, opacity: 0 });
            root.animate({ x: 0, opacity: 1 }, duration, 'easeOutCubic');

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
            root.stop().animate({ opacity: 0 }, 400, 'easeOutCubic', () => {
                root.set({ visibility: 'hidden' });

                if (callback) {
                    callback();
                }
            });
        }
    }), [root]);

    // Precompute stable child indices matching original DOM order
    const titleIndex = 0;
    const contentIndex = data && data.title !== undefined ? 1 : 0;

    return (
        <div ref={rootRef} className="details details-info">
            <div ref={containerRef} className="container">
                {data && data.title && (
                    <AnimatedChild index={titleIndex} register={register}>
                        <DetailsTitle title={data.title} ref={titleHandle} />
                    </AnimatedChild>
                )}
                {data && data.content && (
                    <AnimatedChild index={contentIndex} register={register}>
                        <p
                            className="info"
                            style={{ width: 'fit-content', textTransform: 'uppercase' }}
                            dangerouslySetInnerHTML={{ __html: data.content }}
                        />
                    </AnimatedChild>
                )}
            </div>
        </div>
    );
}
