import { useEffect, useRef, useState } from 'react';

import { useAnimation } from '../../motion/index.js';

import './AudioButtonInfo.css';

/**
 * Scrolling track-info panel that slides when `data` changes.
 * Mirrors `lib/ui/AudioButtonInfo.js`.
 *
 * @param {object} props
 * @param {object} [props.data] `{ name, title, image, link }` descriptor.
 * @example
 * <AudioButtonInfo data={{ name: 'Artist', title: 'Track' }} />
 */
export function AudioButtonInfo({ data }) {
    const [rootRef, root] = useAnimation();
    const [displayData, setDisplayData] = useState(data);

    // Set when a tween callback triggers the in-animation after React commits new data
    const pendingInRef = useRef(false);
    const prevDataRef = useRef(data);

    // Animate the wrapper in after displayData has been committed
    useEffect(() => {
        if (!pendingInRef.current) {
            return;
        }

        pendingInRef.current = false;
        root.set({ y: 10 }).animate({ y: 0, opacity: 1 }, 1000, 'easeOutCubic');
    }, [displayData, root]);

    // Slide out → swap data → slide in
    useEffect(() => {
        if (data === prevDataRef.current) {
            return;
        }

        prevDataRef.current = data;

        root.stop().animate({ y: -10, opacity: 0 }, 300, 'easeInSine', () => {
            pendingInRef.current = true;
            setDisplayData(data);
        });
    }, [data, root]);

    if (!displayData) {
        return <div ref={rootRef} className="info" />;
    }

    const { name, title, image, link } = displayData;

    const imageSrc = image instanceof HTMLElement ? image.src : image;

    const handleClick = () => {
        if (link) {
            window.open(link);
        }
    };

    return (
        <div ref={rootRef} className="info">
            <div
                className="wrapper"
                style={link ? { cursor: 'pointer', pointerEvents: 'auto' } : undefined}
                onClick={link ? handleClick : undefined}
            >
                {image && (
                    <div
                        className="thumbnail"
                        style={{
                            position: 'absolute',
                            left: -40,
                            top: 3,
                            boxSizing: 'border-box',
                            width: 30,
                            height: 30,
                            border: '1px solid var(--ui-color-divider-line)',
                            cursor: 'pointer'
                        }}
                    >
                        <img
                            src={imageSrc}
                            alt={name || ''}
                            style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                            }}
                        />
                    </div>
                )}
                <div className="name">{name}</div>
                <div className="title">{title}</div>
            </div>
        </div>
    );
}
