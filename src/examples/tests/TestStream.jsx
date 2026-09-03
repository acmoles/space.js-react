import { useEffect, useRef } from 'react';

import { WebAudio } from '@lib/index.js';

import { Example } from '@/components';

export default function TestStreamExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        WebAudio.init({ sampleRate: 48000 });
        WebAudio.load({ cyberspace: 'https://icecast.cyberspace.app/dive.ogg' });

        const cyberspace = WebAudio.get('cyberspace');
        cyberspace.gain.set(1);

        function onPointerDown() {
            cyberspace.play();
        }

        document.addEventListener('pointerdown', onPointerDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            WebAudio.destroy();
        };
    }, []);

    return <Example title={title} ref={ref} />;
}
