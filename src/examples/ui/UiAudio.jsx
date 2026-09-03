import { useEffect, useRef, useState } from 'react';

import { Example } from '@/components';
import { useEventListener } from '@/space/index.js';
import { UI } from '@/space/index.js';

export default function UiAudioExample({ title }) {
    const uiRef = useRef(null);
    const imageRef = useRef(null);

    // Initialise sound from localStorage — stable, never written back via setState
    const [sound] = useState(() => {
        const saved = localStorage.getItem('sound');
        return saved ? JSON.parse(saved) : true;
    });

    // audioInfo drives the AudioButtonInfo panel; starts null until the image
    // object is created in the effect (mirrors the original setData call).
    const [audioInfo, setAudioInfo] = useState(null);

    useEffect(() => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = 'https://space.js.org/assets/meta/share.png';
        imageRef.current = image;

        setAudioInfo({ image, name: '127.0.0.1', title: 'localhost' });

        // Animate in — mirrors window.addEventListener('load', ui.animateIn())
        uiRef.current.animateIn();
    }, []);

    // Body click: if the click landed on bare body, add the link to the info.
    useEventListener(document.body, 'click', ({ clientX, clientY }) => {
        if (document.elementFromPoint(clientX, clientY) === document.body) {
            setAudioInfo({
                image: imageRef.current,
                name: '127.0.0.1',
                title: 'localhost',
                link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
            });
        }
    });

    return (
        <Example title={title}>
            <UI
                audioButton={{
                    sound,
                    info: audioInfo,
                    onUpdate: soundOn => {
                        console.log('AudioButton event:', { sound: soundOn });
                        localStorage.setItem('sound', JSON.stringify(soundOn));
                    }
                }}
                onUI={e => console.log('UI event:', e)}
                ref={uiRef}
            />
        </Example>
    );
}
