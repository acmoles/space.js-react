import { useEffect, useRef } from 'react';

import { Stage, UI, ticker } from '@lib/index.js';

import { Example } from '@/components';

const store = {
    sound: true
};

export default function UiAudioExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        const container = ref.current;

        const sound = localStorage.getItem('sound');
        store.sound = sound ? JSON.parse(sound) : true;

        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = 'https://space.js.org/assets/meta/share.png';

        const ui = new UI({
            audioButton: {
                sound: store.sound,
                callback: value => {
                    console.log('AudioButton callback:', value);
                }
            }
        });
        container.appendChild(ui.element);

        ui.audioButton.setData({
            image,
            name: '127.0.0.1',
            title: 'localhost'
        });

        const onUI = e => {
            console.log('UI event:', e);
        };

        const onAudio = e => {
            console.log('AudioButton event:', e);

            localStorage.setItem('sound', JSON.stringify(e.sound));

            store.sound = e.sound;
        };

        const onClick = ({ clientX, clientY }) => {
            if (document.elementFromPoint(clientX, clientY) === document.body) {
                ui.audioButton.setData({
                    image,
                    name: '127.0.0.1',
                    title: 'localhost',
                    link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                });
            }
        };

        const onUpdate = () => {
            ui.update();
        };

        const onLoad = () => {
            ui.animateIn();
        };

        Stage.events.on('ui', onUI);
        ui.audioButton.events.on('update', onAudio);
        document.body.addEventListener('click', onClick);
        window.addEventListener('load', onLoad);
        ticker.add(onUpdate);
        ticker.start();

        if (document.readyState === 'complete') {
            onLoad();
        }

        return () => {
            Stage.events.off('ui', onUI);
            ui.audioButton.events.off('update', onAudio);
            document.body.removeEventListener('click', onClick);
            window.removeEventListener('load', onLoad);
            ticker.remove(onUpdate);
            ui.destroy();
        };
    }, []);

    return <Example title={title} ref={ref} center />;
}
