import { useEffect, useRef } from 'react';

import { UI } from '@lib/index.js';

import { Example } from '@/components';

import './DetailsInfoExample.css';

export default function DetailsInfoExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        const container = ref.current;

        let animatedIn = false;

        const ui = new UI({
            detailsInfo: {
                title: 'Mars',
                content: /* html */ `
Distance from Sun: 230 million km
<br>Mass: 0.107 Earths
<br>Surface gravity: 0.3794 Earths
                `
            }
        });
        ui.detailsInfo.animateIn();
        container.appendChild(ui.element);

        const onClick = () => {
            if (animatedIn) {
                ui.detailsInfo.animateOut();
                animatedIn = false;
            } else {
                ui.detailsInfo.animateIn();
                animatedIn = true;
            }
        };

        document.body.addEventListener('click', onClick);

        animatedIn = true;

        ui.animateIn();

        return () => {
            document.body.removeEventListener('click', onClick);
            ui.destroy();
        };
    }, []);

    return <Example title={title} ref={ref} className='details-info-example' />;
}
