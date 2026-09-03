import { useEffect, useRef } from 'react';

import { Stage, UI, ticker } from '@lib/index.js';

import { Example } from '@/components';
import { useClassName } from '@/hooks';

const store = {
    sound: true
};

export default function UiExample({ title }) {
    const ref = useRef(null);

    useClassName('scroll');

    useEffect(() => {
        const container = ref.current;

        const sound = localStorage.getItem('sound');
        store.sound = sound ? JSON.parse(sound) : true;

        const ui = new UI({
            fps: true,
            header: {
                title: {
                    name: 'Space.js',
                    caption: 'Minimal monospace UI library',
                    link: 'https://space.js.org/',
                    target: '_self'
                }
            },
            menu: {
                itemWidth: 44,
                items: ['POL', 'OBL', 'ISO'],
                active: 'OBL',
                callback: value => {
                    console.log('Menu callback:', value);
                }
            },
            info: {
                content: 'Info'
            },
            details: {
                title: 'Mars',
                content: [
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
                ]
            },
            instructions: {
                content: 'Instructions'
            },
            detailsButton: true,
            muteButton: {
                sound: store.sound,
                callback: value => {
                    console.log('MuteButton callback:', value);
                }
            }
        });
        ui.css({ position: 'static' });
        ui.info.animateIn();
        ui.instructions.animateIn();
        ui.detailsButton.setData({
            number: 1,
            total: 6
        });
        ui.toggleDetails(true);
        container.appendChild(ui.element);

        const onDetails = e => {
            console.log('Details event:', e);
        };

        const onUI = e => {
            console.log('UI event:', e);
        };

        const onMenu = e => {
            console.log('Menu event:', e);
        };

        const onMute = e => {
            console.log('MuteButton event:', e);

            localStorage.setItem('sound', JSON.stringify(e.sound));

            store.sound = e.sound;
        };

        const onKeyUp = e => {
            if (e.ctrlKey && e.keyCode >= 49 && e.keyCode <= 51) { // Ctrl 1-3
                ui.menu.index = e.keyCode - 49;
                ui.menu.update();
            }
        };

        const onUpdate = () => {
            ui.update();
        };

        const onLoad = () => {
            ui.animateIn();
        };

        Stage.events.on('details', onDetails);
        Stage.events.on('ui', onUI);
        ui.menu.events.on('update', onMenu);
        ui.muteButton.events.on('update', onMute);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('load', onLoad);
        ticker.add(onUpdate);
        ticker.start();

        if (document.readyState === 'complete') {
            onLoad();
        }

        return () => {
            Stage.events.off('details', onDetails);
            Stage.events.off('ui', onUI);
            ui.menu.events.off('update', onMenu);
            ui.muteButton.events.off('update', onMute);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('load', onLoad);
            ticker.remove(onUpdate);
            ui.destroy();
        };
    }, []);

    return <Example title={title} ref={ref} />;
}
