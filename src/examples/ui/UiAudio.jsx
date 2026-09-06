import { useEffect, useMemo, useRef, useState } from 'react';

import { Example } from '@/components';
import { useEventListener } from '@/space/index.js';
import { UI } from '@/space/index.js';

export default function UiAudioExample({ title }) {
    const uiRef = useRef(null);

    // Initialise sound from localStorage — stable, never written back via setState
    const [sound] = useState(() => {
        const saved = localStorage.getItem('sound');
        return saved ? JSON.parse(saved) : true;
    });

    // The share image is created once, mirroring the original setData call
    const [image] = useState(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = 'https://space.js.org/assets/meta/share.png';
        return img;
    });

    // The link is only added once the body has been clicked
    const [link, setLink] = useState(null);

    const audioInfo = useMemo(
        () => ({ image, name: '127.0.0.1', title: 'localhost', ...(link ? { link } : {}) }),
        [image, link]
    );

    useEffect(() => {
        // Animate in — mirrors window.addEventListener('load', ui.animateIn())
        uiRef.current.animateIn();
    }, []);

    // Body click: if the click landed on bare body, add the link to the info.
    useEventListener(document.body, 'click', ({ clientX, clientY }) => {
        if (document.elementFromPoint(clientX, clientY) === document.body) {
            setLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
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
