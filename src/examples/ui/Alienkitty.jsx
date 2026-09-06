import { useEffect, useState } from 'react';

import { headsTails, randInt } from '@lib/index.js';

import { Example } from '@/components';
import { useAnimation, useDelayedCall } from '@/space';

import './Alienkitty.css';

/**
 * The mascot, blinking at random intervals, fading out when clicked.
 */
function AlienKitty({ onComplete }) {
    const [rootRef, root] = useAnimation({ opacity: 0 });
    const [eyelid1Ref, eyelid1] = useAnimation({ transformOrigin: 'top center', scaleX: 1.5, scaleY: 0.01 });
    const [eyelid2Ref, eyelid2] = useAnimation({ transformOrigin: 'top left', scaleX: 1, scaleY: 0.01 });

    const delay = useDelayedCall();

    useEffect(() => {
        const blink = () => {
            delay(randInt(0, 10000), headsTails(onBlink1, onBlink2));
        };

        const onBlink1 = () => {
            eyelid1.animate({ scaleY: 1.5 }, 120, 'easeOutCubic', () => {
                eyelid1.animate({ scaleY: 0.01 }, 180, 'easeOutCubic');
            });
            eyelid2.animate({ scaleX: 1.3, scaleY: 1.3 }, 120, 'easeOutCubic', () => {
                eyelid2.animate({ scaleX: 1, scaleY: 0.01 }, 180, 'easeOutCubic', blink);
            });
        };

        const onBlink2 = () => {
            eyelid1.animate({ scaleY: 1.5 }, 120, 'easeOutCubic', () => {
                eyelid1.animate({ scaleY: 0.01 }, 180, 'easeOutCubic');
            });
            eyelid2.animate({ scaleX: 1.3, scaleY: 1.3 }, 180, 'easeOutCubic', () => {
                eyelid2.animate({ scaleX: 1, scaleY: 0.01 }, 240, 'easeOutCubic', blink);
            });
        };

        blink();

        root.animate({ opacity: 1 }, 1000, 'easeOutSine');
    }, [root, eyelid1, eyelid2, delay]);

    const handleClick = () => {
        root.animate({ opacity: 0 }, 500, 'easeInOutQuad', onComplete);
    };

    return (
        <div ref={rootRef} className="alienkitty" onClick={handleClick}>
            <div ref={eyelid1Ref} className="eyelid1" />
            <div ref={eyelid2Ref} className="eyelid2" />
        </div>
    );
}

export default function AlienkittyExample({ title }) {
    const [visible, setVisible] = useState(true);

    return (
        <Example title={title}>
            {visible && <AlienKitty onComplete={() => setVisible(false)} />}
        </Example>
    );
}
