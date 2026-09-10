import { useEffect, useRef } from 'react';

import { BufferLoader, WebAudio, clamp, delayedCall } from '@lib/index.js';

import { Example } from '@/components';
import { Info } from '@/space/components/nav/index.js';
import { UI } from '@/space/components/ui/UI.jsx';

export default function AudioGongExample({ title }) {
    const uiRef = useRef(null);
    const instructionsRef = useRef(null);

    useEffect(() => {
        let alive = true;
        let id = 0;

        const loader = new BufferLoader();
        loader.setPath('/assets/sounds/');
        loader.loadAll(['gong.mp3']);

        function onVisibility() {
            if (document.hidden) {
                WebAudio.mute();
            } else {
                WebAudio.unmute();
            }
        }

        function onPointerDown({ clientX, clientY }) {
            const normalX = clientX / document.documentElement.clientWidth;
            const normalY = clientY / document.documentElement.clientHeight;
            const pan = clamp(((normalX * 2) - 1) * 0.8, -1, 1);
            const rate = clamp(0.8 + (1 - normalY) * 0.4, 0.8, 1.2);

            const gong = WebAudio.clone('gong', ++id);
            gong.gain.set(0.5);
            gong.stereoPan.set(pan);
            gong.playbackRate.set(rate);
            gong.play();

            delayedCall(6000, () => {
                gong.destroy();
            });
        }

        loader.ready().then(() => {
            if (!alive) return;

            WebAudio.init({ sampleRate: 48000 });
            WebAudio.load(loader.files);

            document.addEventListener('visibilitychange', onVisibility);
            document.addEventListener('pointerdown', onPointerDown);

            instructionsRef.current?.animateIn();
            uiRef.current?.animateIn();
        });

        return () => {
            alive = false;

            document.removeEventListener('visibilitychange', onVisibility);
            document.removeEventListener('pointerdown', onPointerDown);

            if (WebAudio.context) {
                WebAudio.destroy();
            }
        };
    }, []);  

    return (
        <Example title={title}>
            <Info
                ref={instructionsRef}
                bottom
                content={`${navigator.maxTouchPoints ? 'Tap' : 'Click'} for sound`}
            />
            <UI ref={uiRef} />
        </Example>
    );
}


