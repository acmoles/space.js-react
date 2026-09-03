import { useEffect, useRef, useState } from 'react';

import { Example } from '@/components';
import { useClassName } from '@/hooks';

import { UI } from '../../space/components/ui/index.js';

const DETAILS_CONTENT = [
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

export default function UiExample({ title }) {
    useClassName('scroll');

    const uiRef = useRef(null);

    const [sound, setSound] = useState(() => {
        const stored = localStorage.getItem('sound');
        return stored !== null ? JSON.parse(stored) : true;
    });

    // On mount: show info/instructions, open details panel, animate everything in
    useEffect(() => {
        const ui = uiRef.current;

        if (!ui) return;

        ui.animateInfoIn();
        ui.animateInstructionsIn();
        ui.toggleDetails(true);
        ui.animateIn();
    }, []);

    return (
        <Example title={title}>
            <UI
                ref={uiRef}
                style={{ position: 'static' }}
                fps
                header={{
                    title: {
                        name: 'Space.js',
                        caption: 'Minimal monospace UI library',
                        link: 'https://space.js.org/',
                        target: '_self'
                    }
                }}
                menu={{
                    itemWidth: 44,
                    items: ['POL', 'OBL', 'ISO'],
                    active: 'OBL',
                    onUpdate: (name) => {
                        console.log('Menu callback:', name);
                    }
                }}
                info={{ content: 'Info' }}
                instructions={{ content: 'Instructions' }}
                details={{
                    title: 'Mars',
                    content: DETAILS_CONTENT
                }}
                detailsButton={{ number: 1, total: 6 }}
                muteButton={{
                    sound,
                    onUpdate: e => {
                        console.log('MuteButton callback:', e);
                        localStorage.setItem('sound', JSON.stringify(e.sound));
                        setSound(e.sound);
                    }
                }}
                onDetails={e => console.log('Details event:', e)}
                onUI={e => console.log('UI event:', e)}
            />
        </Example>
    );
}
