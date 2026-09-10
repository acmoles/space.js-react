import { useEffect } from 'react';

import { Example } from '@/components';
import { useAnimation, useEventListener, useResize } from '@/space';

import './Logo.css';

/**
 * The alienkitty logo at the top-left corner, resizing with the viewport,
 * fading in on mount and reacting to hover and click.
 */
export default function LogoExample({ title }) {
    const [logoRef, logo] = useAnimation({ left: 50, top: 50, width: 64, height: 64, opacity: 0 });

    useResize(({ width, height }) => {
        if (width < height) {
            logo.set({ left: 30, top: 30, width: 40, height: 40 });
        } else {
            logo.set({ left: 50, top: 50, width: 64, height: 64 });
        }
    });

    useEffect(() => {
        logo.animate({ opacity: 1 }, 600, 'easeInOutSine');
    }, [logo]);

    useEventListener(logoRef, 'mouseenter', () => {
        logo.stop().animate({ opacity: 0.6 }, 300, 'easeOutCubic');
    });

    useEventListener(logoRef, 'mouseleave', () => {
        logo.stop().animate({ opacity: 1 }, 300, 'easeOutCubic');
    });

    const handleClick = () => {
        open('https://alien.js.org/');
    };

    return (
        <Example title={title}>
            <div ref={logoRef} className="logo" onClick={handleClick}>
                <img src="/assets/images/alienkitty.svg" alt="" />
            </div>
        </Example>
    );
}
