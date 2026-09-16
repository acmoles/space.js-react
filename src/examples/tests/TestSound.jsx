import { useEffect } from 'react';

import { BufferLoader, WebAudio } from '@lib/index.js';

import { Example } from '@/components';

/**
 * Loads a gong sound and plays it on pointer-down, matching the original
 * test_sound.html.
 */
export default function TestSoundExample({ title }) {
    useEffect(() => {
        let destroyed = false;
        let cleanup = () => {};

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

            function onPointerDown() {
                gong.play();
            }

            document.addEventListener('pointerdown', onPointerDown);

            cleanup = () => {
                document.removeEventListener('pointerdown', onPointerDown);
                WebAudio.destroy();
            };
        }

        init();

        return () => {
            destroyed = true;
            cleanup();
        };
    }, []);

    return <Example title={title} />;
}
