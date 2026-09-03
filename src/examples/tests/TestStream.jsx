import { useEffect } from 'react';

import { WebAudio } from '@lib/index.js';

import { Example } from '@/components';

/**
 * Initialises a streaming audio source and plays it on pointer-down, matching
 * the original test_stream.html.
 */
export default function TestStreamExample({ title }) {
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

    return <Example title={title} />;
}
