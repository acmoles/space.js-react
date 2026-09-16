import { useEffect } from 'react';

import { Example } from '@/components';
import { useAnimation } from '@/space';

import './TestInterface.css';

/**
 * Demonstrates the equivalent of Interface: an element that tweens its scale
 * and opacity in on mount, identical to what `Interface.tween` produces.
 */
export default function TestInterfaceExample({ title }) {
    const [logoRef, logo] = useAnimation({ scale: 0.96, opacity: 0 });

    useEffect(() => {
        logo.animate({ scale: 1, opacity: 1 }, 2000, 'easeOutCubic');
    }, [logo]);

    return (
        <Example title={title}>
            <div ref={logoRef} className="logo">
                <img src="/assets/images/alienkitty.svg" alt="" />
            </div>
        </Example>
    );
}
