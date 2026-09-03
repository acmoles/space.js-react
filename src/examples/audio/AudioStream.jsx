import { useEffect, useRef } from 'react';

import { WebAudio } from '@lib/index.js';

import { Example } from '@/components';
import { Info } from '@/space/components/nav/index.js';
import { Panel } from '@/space/components/panels/index.js';
import { UI } from '@/space/components/ui/UI.jsx';

import './AudioStream.css';

export default function AudioStreamExample({ title }) {
    const uiRef = useRef(null);
    const panelRef = useRef(null);
    const instructionsRef = useRef(null);

    // Mutable slider state — callbacks in JSX close over stateRef
    const stateRef = useRef({ cyberspace: null });

    useEffect(() => {
        const st = stateRef.current;

        WebAudio.init({ sampleRate: 48000 });
        WebAudio.load({ cyberspace: 'https://icecast.cyberspace.app/dive.ogg' });

        st.cyberspace = WebAudio.get('cyberspace');
        st.cyberspace.gain.set(1);

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
            instructionsRef.current?.animateOut();
            st.cyberspace.play();
        }

        document.addEventListener('visibilitychange', onVisibility);
        document.addEventListener('click', onClick);

        instructionsRef.current?.animateIn();
        panelRef.current?.animateIn();
        uiRef.current?.animateIn();

        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            document.removeEventListener('click', onClick);

            st.cyberspace?.stop();

            if (WebAudio.context) {
                WebAudio.destroy();
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const st = stateRef.current;

    return (
        <Example title={title}>
            <div className="audio-stream-panel">
                <Panel
                    ref={panelRef}
                    items={[
                        { name: 'Cyberspace' },
                        { type: 'divider' },
                        {
                            type: 'slider',
                            name: 'Volume',
                            min: 0,
                            max: 1,
                            step: 0.01,
                            value: 1,
                            callback: v => { if (st.cyberspace) st.cyberspace.gain.value = v; }
                        },
                        {
                            type: 'slider',
                            name: 'Pan',
                            min: -1,
                            max: 1,
                            step: 0.01,
                            value: 0,
                            callback: v => { if (st.cyberspace) st.cyberspace.stereoPan.value = v; }
                        }
                    ]}
                />
            </div>
            <Info
                ref={instructionsRef}
                bottom
                content={`${navigator.maxTouchPoints ? 'Tap' : 'Click'} for sound`}
            />
            <UI ref={uiRef} />
        </Example>
    );
}


