import { useEffect, useRef } from 'react';

import { Example } from '@/components';

import { UI } from '../../space/components/ui/index.js';

import './DetailsInfo.css';

export default function DetailsInfoExample({ title }) {
    const uiRef = useRef(null);
    const animatedInRef = useRef(false);

    useEffect(() => {
        const ui = uiRef.current;

        if (!ui) return;

        // Mirror the original: animateIn detailsInfo, then whole UI
        ui.animateDetailsInfoIn();
        ui.animateIn();

        animatedInRef.current = true;

        const onClick = () => {
            if (animatedInRef.current) {
                uiRef.current?.animateDetailsInfoOut();
                animatedInRef.current = false;
            } else {
                uiRef.current?.animateDetailsInfoIn();
                animatedInRef.current = true;
            }
        };

        document.body.addEventListener('click', onClick);

        return () => {
            document.body.removeEventListener('click', onClick);
        };
    }, []);

    return (
        <Example title={title} className="details-info-example">
            <UI
                ref={uiRef}
                detailsInfo={{
                    title: 'Mars',
                    content: /* html */ `
Distance from Sun: 230 million km
<br>Mass: 0.107 Earths
<br>Surface gravity: 0.3794 Earths
                    `
                }}
            />
        </Example>
    );
}
