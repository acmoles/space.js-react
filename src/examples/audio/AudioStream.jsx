import { useEffect, useRef } from 'react';

import { Panel, PanelItem, UI, WebAudio } from '@lib/index.js';

import { Example } from '@/components';

export default function AudioStreamExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        const container = ref.current;

        const ui = new UI({
            instructions: {
                content: `${navigator.maxTouchPoints ? 'Tap' : 'Click'} for sound`
            }
        });
        ui.css({
            minHeight: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '55px 0 125px'
        });
        container.appendChild(ui.element);

        WebAudio.init({ sampleRate: 48000 });
        WebAudio.load({ cyberspace: 'https://icecast.cyberspace.app/dive.ogg' });

        const cyberspace = WebAudio.get('cyberspace');
        cyberspace.gain.set(1);

        function onVisibility() {
            if (document.hidden) {
                WebAudio.mute();
            } else {
                WebAudio.unmute();
            }
        }

        function onClick() {
            document.removeEventListener('click', onClick);

            WebAudio.resume();

            ui.instructions.animateOut();

            cyberspace.play();
        }

        document.addEventListener('visibilitychange', onVisibility);
        document.addEventListener('click', onClick);

        ui.instructions.animateIn();

        // Panel
        const panel = new Panel();
        panel.animateIn();
        ui.add(panel);

        [
            {
                name: 'Cyberspace'
            },
            {
                type: 'divider'
            },
            {
                type: 'slider',
                name: 'Volume',
                min: 0,
                max: 1,
                step: 0.01,
                value: cyberspace.gain.value,
                callback: value => {
                    cyberspace.gain.value = value;
                }
            },
            {
                type: 'slider',
                name: 'Pan',
                min: -1,
                max: 1,
                step: 0.01,
                value: cyberspace.stereoPan.value,
                callback: value => {
                    cyberspace.stereoPan.value = value;
                }
            }
        ].forEach(data => {
            panel.add(new PanelItem(data));
        });

        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            document.removeEventListener('click', onClick);

            cyberspace.stop();
            ui.destroy();

            if (WebAudio.context) {
                WebAudio.destroy();
            }
        };
    }, []);

    return <Example title={title} ref={ref} />;
}
