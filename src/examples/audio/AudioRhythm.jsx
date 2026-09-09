import { useEffect, useRef } from 'react';

import { BufferLoader, WebAudio, headsTails } from '@lib/index.js';

import { Example } from '@/components';
import { useClassName } from '@/hooks';
import { Info } from '@/space/components/nav/index.js';
import { Panel, PanelDivider, PanelLabel, PanelSlider } from '@/space/components/panels/index.js';
import { UI } from '@/space/components/ui/UI.jsx';

import './AudioRhythm.css';


const TRACKS = [
    { key: 'drone', name: 'Drone', volume: 1 },
    { key: 'bells', name: 'Bells', volume: 0.5 },
    { key: 'accent1', name: 'Accent1', volume: 0.1 },
    { key: 'accent2', name: 'Accent2', volume: 0.05 },
    { key: 'kick', name: 'Kick', volume: 1 },
    { key: 'snare', name: 'Snare', volume: 1 },
    { key: 'hihat', name: 'Hihat', volume: 1 }
];

/**
 * One mixer strip: volume, stereo pan and playback rate for a single track.
 * `source` is read lazily because the audio nodes are created on first input.
 */
function TrackPanel({ name, volume, source, ref }) {
    return (
        <Panel ref={ref}>
            <PanelLabel name={name} />
            <PanelDivider />
            <PanelSlider
                name="Volume"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={e => { const s = source(); if (s) s.gain.value = e.value; }}
            />
            <PanelSlider
                name="Pan"
                min={-1}
                max={1}
                step={0.01}
                value={0}
                onChange={e => { const s = source(); if (s) s.stereoPan.value = e.value; }}
            />
            <PanelSlider
                name="Rate"
                min={0}
                max={2}
                step={0.01}
                value={1}
                onChange={e => { const s = source(); if (s) s.playbackRate.value = e.value; }}
            />
        </Panel>
    );
}
export default function AudioRhythmExample({ title }) {
    useClassName('scroll');

    const uiRef = useRef(null);
    const instructionsRef = useRef(null);

    const trackRefs = useRef([]);

    // Panel items are stable — defined once as module-level constants below.
    // The callbacks mutate audio state held in the effect closure via stateRef.
    const stateRef = useRef({
        drone: null,
        bells: null,
        accent1: null,
        accent2: null,
        kick: null,
        snare: null,
        hihat: null,
        context: null,
        lastTime: 0
    });

    useEffect(() => {
        let alive = true;
        let removeListeners = null;
        const st = stateRef.current;

        const loader = new BufferLoader();
        loader.setPath('/assets/sounds/');
        loader.loadAll([
            'metal_monk_loop.mp3',
            'ethereal_bells.mp3',
            'accent_transition_1.mp3',
            'accent_transition_2.mp3',
            'kick.mp3',
            'snare.mp3',
            'hihat.mp3'
        ]);

        loader.ready().then(() => {
            if (!alive) return;

            WebAudio.init({ sampleRate: 48000 });
            WebAudio.load(loader.files);

            st.context = WebAudio.context;

            st.drone = WebAudio.get('metal_monk_loop');
            st.drone.gain.set(1);
            st.drone.loop = true;
            st.drone.play();

            st.bells = WebAudio.get('ethereal_bells');
            st.bells.gain.set(0.5);

            st.accent1 = WebAudio.get('accent_transition_1');
            st.accent1.gain.set(0.1);

            st.accent2 = WebAudio.get('accent_transition_2');
            st.accent2.gain.set(0.05);

            st.kick = WebAudio.get('kick');
            st.kick.gain.set(1);

            st.snare = WebAudio.get('snare');
            st.snare.gain.set(1);

            st.hihat = WebAudio.get('hihat');
            st.hihat.gain.set(1);

            function onVisibility() {
                if (document.hidden) {
                    WebAudio.mute();
                } else {
                    WebAudio.unmute();
                }
            }

            function onPointerDown() {
                const tempo = 70;
                const eighthNoteTime = (60 / tempo) / 2;
                const barLength = 8 * eighthNoteTime;

                let startTime = Math.ceil(st.context.currentTime / barLength) * barLength;
                const lastLength = st.lastTime + 4 * barLength;

                if (st.lastTime !== 0 && startTime < lastLength) {
                    startTime = lastLength;
                }

                st.lastTime = startTime;

                st.bells.play(startTime + eighthNoteTime);

                if (headsTails()) {
                    st.accent1.play(startTime + barLength + 6 * eighthNoteTime);
                } else {
                    st.accent2.play(startTime + barLength + 6 * eighthNoteTime);
                }

                for (let bar = 0; bar < 4; bar++) {
                    const time = startTime + bar * barLength + eighthNoteTime;

                    st.kick.play(time);
                    st.kick.play(time + 4 * eighthNoteTime);
                    st.snare.play(time + 2 * eighthNoteTime);
                    st.snare.play(time + 6 * eighthNoteTime);

                    for (let i = 0; i < 8; i++) {
                        st.hihat.play(time + i * eighthNoteTime);
                    }
                }
            }

            document.addEventListener('visibilitychange', onVisibility);
            document.addEventListener('pointerdown', onPointerDown);

            // Animate panels in
            trackRefs.current.forEach(panel => panel?.animateIn());

            instructionsRef.current?.animateIn();
            uiRef.current?.animateIn();

            removeListeners = () => {
                document.removeEventListener('visibilitychange', onVisibility);
                document.removeEventListener('pointerdown', onPointerDown);
            };
        });

        return () => {
            alive = false;

            if (removeListeners) {
                removeListeners();
            }

            if (WebAudio.context) {
                WebAudio.destroy();
            }
        };
    }, []);  

    const st = stateRef.current;

    return (
        <Example title={title}>
            <div className="audio-rhythm-panels">
                <div className="audio-rhythm-container">
                    {TRACKS.map(({ key, name, volume }, i) => (
                        <TrackPanel
                            key={key}
                            ref={panel => { trackRefs.current[i] = panel; }}
                            name={name}
                            volume={volume}
                            source={() => st[key]}
                        />
                    ))}
                </div>
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


