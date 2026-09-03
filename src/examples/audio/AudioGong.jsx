import { useEffect, useRef } from 'react';

import { BufferLoader, UI, WebAudio, clamp, delayedCall } from '@lib/index.js';

import { Example } from '@/components';

export default function AudioGongExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        const container = ref.current;
        let alive = true;

        let id = 0;

        const ui = new UI({
            instructions: {
                content: `${navigator.maxTouchPoints ? 'Tap' : 'Click'} for sound`
            }
        });

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
            // this.ui.instructions.animateOut();

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

            ui.instructions.animateIn();

            container.appendChild(ui.element);
        });

        return () => {
            alive = false;

            document.removeEventListener('visibilitychange', onVisibility);
            document.removeEventListener('pointerdown', onPointerDown);

            ui.destroy();

            if (WebAudio.context) {
                WebAudio.destroy();
            }
        };
    }, []);

    return <Example title={title} ref={ref} />;
}
