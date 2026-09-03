import { useEffect, useRef } from 'react';

import { BufferLoader, WebAudio } from '@lib/index.js';

import { Example } from '@/components';

export default function TestSoundExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        let destroyed = false;

        async function init() {
            const loader = new BufferLoader();
            await loader.loadAllAsync(['/assets/sounds/gong.mp3']);

            if (destroyed) {
                return;
            }

            WebAudio.init({ sampleRate: 48000 });
            WebAudio.load(loader.files);

            const gong = WebAudio.get('gong');
            gong.gain.set(0.5);

            document.addEventListener('pointerdown', onPointerDown);

            function onPointerDown() {
                gong.play();
            }

            cleanup = () => {
                document.removeEventListener('pointerdown', onPointerDown);
                WebAudio.destroy();
            };
        }

        let cleanup = () => {};

        init();

        return () => {
            destroyed = true;
            cleanup();
        };
    }, []);

    return <Example title={title} ref={ref} />;
}
