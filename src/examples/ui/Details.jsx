import { useEffect, useRef } from 'react';

import { Example } from '@/components';
import { useClassName } from '@/hooks';

import { UI } from '../../space/components/ui/index.js';

const DETAILS_CONTENT = [
    // '<p>Mars is the fourth planet from the Sun...</p>',
    {
        content: /* html */ `
<p>Mars is the fourth planet from the Sun. The surface of Mars is orange-red because it is covered in iron(III) oxide dust, giving it the nickname "the Red Planet". It is classified as a terrestrial planet and is the second smallest of the Solar System's planets with a diameter of 6,779 km.</p>
        `,
        links: [
            {
                title: 'Wikipedia',
                link: 'https://en.wikipedia.org/wiki/Mars'
            }
        ]
    },
    {
        title: 'Distance from Sun',
        content: '230 million km'
    },
    {
        title: 'Mass',
        content: '0.107 Earths'
    },
    {
        title: 'Surface gravity',
        content: '0.3794 Earths'
    }
];

export default function DetailsExample({ title }) {
    useClassName('scroll');

    const uiRef = useRef(null);

    useEffect(() => {
        const ui = uiRef.current;

        if (!ui) return;

        // Mirror the original: show details before animating in
        ui.toggleDetails(true);
        ui.animateIn();
    }, []);

    return (
        <Example title={title}>
            <UI
                ref={uiRef}
                style={{ position: 'static' }}
                details={{
                    // background: true,
                    // dividerLine: true,
                    // width: 'max(50vw, 250px)',
                    title: 'Mars',
                    content: DETAILS_CONTENT
                }}
            />
        </Example>
    );
}
