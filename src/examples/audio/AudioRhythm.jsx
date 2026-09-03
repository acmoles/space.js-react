import { useEffect, useRef } from 'react';

import { BufferLoader, Interface, Panel, PanelItem, UI, WebAudio, headsTails } from '@lib/index.js';

import { Example } from '@/components';
import { useClassName } from '@/hooks';

class Panels extends Interface {
    constructor() {
        super('.panels');

        this.init();
    }

    init() {
        this.css({
            minHeight: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '55px 0 125px'
        });

        this.container = new Interface('.container');
        this.container.css({
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 20
        });
        this.add(this.container);
    }

    // Public methods

    animateIn = () => {
        this.container.children.forEach(panel => panel.animateIn());
    };
}

export default function AudioRhythmExample({ title }) {
    useClassName('scroll');

    const ref = useRef(null);

    useEffect(() => {
        const container = ref.current;
        let alive = true;
        let removeListeners = null;

        const panels = new Panels();
        const ui = new UI({
            instructions: {
                content: `${navigator.maxTouchPoints ? 'Tap' : 'Click'} for sound`
            }
        });

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

            const context = WebAudio.context;
            let lastTime = 0;

            const drone = WebAudio.get('metal_monk_loop');
            drone.gain.set(1);
            drone.loop = true;
            drone.play();

            const bells = WebAudio.get('ethereal_bells');
            bells.gain.set(0.5);

            const accent1 = WebAudio.get('accent_transition_1');
            accent1.gain.set(0.1);

            const accent2 = WebAudio.get('accent_transition_2');
            accent2.gain.set(0.05);

            const kick = WebAudio.get('kick');
            kick.gain.set(1);

            const snare = WebAudio.get('snare');
            snare.gain.set(1);

            const hihat = WebAudio.get('hihat');
            hihat.gain.set(1);

            function onVisibility() {
                if (document.hidden) {
                    WebAudio.mute();
                } else {
                    WebAudio.unmute();
                }
            }

            function onPointerDown() {
                // this.ui.instructions.animateOut();

                // Based on https://www.html5rocks.com/en/tutorials/webaudio/intro/ by smus

                const tempo = 70; // Beats per minute
                const eighthNoteTime = (60 / tempo) / 2;
                const barLength = 8 * eighthNoteTime;

                // Snap to bar length
                let startTime = Math.ceil(context.currentTime / barLength) * barLength;

                // Next 4 bars
                const lastLength = lastTime + 4 * barLength;

                if (lastTime !== 0 && startTime < lastLength) {
                    startTime = lastLength;
                }

                lastTime = startTime;

                // Play the bells on the first eighth note
                bells.play(startTime + eighthNoteTime);

                // Play the accents on bar 2, beat 4
                if (headsTails()) {
                    accent1.play(startTime + barLength + 6 * eighthNoteTime);
                } else {
                    accent2.play(startTime + barLength + 6 * eighthNoteTime);
                }

                // Play 4 bars
                for (let bar = 0; bar < 4; bar++) {
                    // We'll start playing the rhythm one eighth note from "now"
                    const time = startTime + bar * barLength + eighthNoteTime;

                    // Play the bass (kick) drum on beats 1, 3
                    kick.play(time);
                    kick.play(time + 4 * eighthNoteTime);

                    // Play the snare drum on beats 2, 4
                    snare.play(time + 2 * eighthNoteTime);
                    snare.play(time + 6 * eighthNoteTime);

                    // Play the hi-hat every eighth note
                    for (let i = 0; i < 8; i++) {
                        hihat.play(time + i * eighthNoteTime);
                    }
                }
            }

            document.addEventListener('visibilitychange', onVisibility);
            document.addEventListener('pointerdown', onPointerDown);

            ui.instructions.animateIn();

            // Panels
            const track1 = new Panel();
            panels.container.add(track1);

            [
                { name: 'Drone' },
                { type: 'divider' },
                {
                    type: 'slider',
                    name: 'Volume',
                    min: 0,
                    max: 1,
                    step: 0.01,
                    value: drone.gain.value,
                    callback: value => {
                        drone.gain.value = value;
                    }
                },
                {
                    type: 'slider',
                    name: 'Pan',
                    min: -1,
                    max: 1,
                    step: 0.01,
                    value: drone.stereoPan.value,
                    callback: value => {
                        drone.stereoPan.value = value;
                    }
                },
                {
                    type: 'slider',
                    name: 'Rate',
                    min: 0,
                    max: 2,
                    step: 0.01,
                    value: drone.playbackRate.value,
                    callback: value => {
                        drone.playbackRate.value = value;
                    }
                }
            ].forEach(data => {
                track1.add(new PanelItem(data));
            });

            const track2 = new Panel();
            panels.container.add(track2);

            [
                { name: 'Bells' },
                { type: 'divider' },
                {
                    type: 'slider',
                    name: 'Volume',
                    min: 0,
                    max: 1,
                    step: 0.01,
                    value: bells.gain.value,
                    callback: value => {
                        bells.gain.value = value;
                    }
                },
                {
                    type: 'slider',
                    name: 'Pan',
                    min: -1,
                    max: 1,
                    step: 0.01,
                    value: bells.stereoPan.value,
                    callback: value => {
                        bells.stereoPan.value = value;
                    }
                },
                {
                    type: 'slider',
                    name: 'Rate',
                    min: 0,
                    max: 2,
                    step: 0.01,
                    value: bells.playbackRate.value,
                    callback: value => {
                        bells.playbackRate.value = value;
                    }
                }
            ].forEach(data => {
                track2.add(new PanelItem(data));
            });

            const track3 = new Panel();
            panels.container.add(track3);

            [
                { name: 'Accent1' },
                { type: 'divider' },
                {
                    type: 'slider',
                    name: 'Volume',
                    min: 0,
                    max: 1,
                    step: 0.01,
                    value: accent1.gain.value,
                    callback: value => {
                        accent1.gain.value = value;
                    }
                },
                {
                    type: 'slider',
                    name: 'Pan',
                    min: -1,
                    max: 1,
                    step: 0.01,
                    value: accent1.stereoPan.value,
                    callback: value => {
                        accent1.stereoPan.value = value;
                    }
                },
                {
                    type: 'slider',
                    name: 'Rate',
                    min: 0,
                    max: 2,
                    step: 0.01,
                    value: accent1.playbackRate.value,
                    callback: value => {
                        accent1.playbackRate.value = value;
                    }
                }
            ].forEach(data => {
                track3.add(new PanelItem(data));
            });

            const track4 = new Panel();
            panels.container.add(track4);

            [
                { name: 'Accent2' },
                { type: 'divider' },
                {
                    type: 'slider',
                    name: 'Volume',
                    min: 0,
                    max: 1,
                    step: 0.01,
                    value: accent2.gain.value,
                    callback: value => {
                        accent2.gain.value = value;
                    }
                },
                {
                    type: 'slider',
                    name: 'Pan',
                    min: -1,
                    max: 1,
                    step: 0.01,
                    value: accent2.stereoPan.value,
                    callback: value => {
                        accent2.stereoPan.value = value;
                    }
                },
                {
                    type: 'slider',
                    name: 'Rate',
                    min: 0,
                    max: 2,
                    step: 0.01,
                    value: accent2.playbackRate.value,
                    callback: value => {
                        accent2.playbackRate.value = value;
                    }
                }
            ].forEach(data => {
                track4.add(new PanelItem(data));
            });

            const track5 = new Panel();
            panels.container.add(track5);

            [
                { name: 'Kick' },
                { type: 'divider' },
                {
                    type: 'slider',
                    name: 'Volume',
                    min: 0,
                    max: 1,
                    step: 0.01,
                    value: kick.gain.value,
                    callback: value => {
                        kick.gain.value = value;
                    }
                },
                {
                    type: 'slider',
                    name: 'Pan',
                    min: -1,
                    max: 1,
                    step: 0.01,
                    value: kick.stereoPan.value,
                    callback: value => {
                        kick.stereoPan.value = value;
                    }
                },
                {
                    type: 'slider',
                    name: 'Rate',
                    min: 0,
                    max: 2,
                    step: 0.01,
                    value: kick.playbackRate.value,
                    callback: value => {
                        kick.playbackRate.value = value;
                    }
                }
            ].forEach(data => {
                track5.add(new PanelItem(data));
            });

            const track6 = new Panel();
            panels.container.add(track6);

            [
                { name: 'Snare' },
                { type: 'divider' },
                {
                    type: 'slider',
                    name: 'Volume',
                    min: 0,
                    max: 1,
                    step: 0.01,
                    value: snare.gain.value,
                    callback: value => {
                        snare.gain.value = value;
                    }
                },
                {
                    type: 'slider',
                    name: 'Pan',
                    min: -1,
                    max: 1,
                    step: 0.01,
                    value: snare.stereoPan.value,
                    callback: value => {
                        snare.stereoPan.value = value;
                    }
                },
                {
                    type: 'slider',
                    name: 'Rate',
                    min: 0,
                    max: 2,
                    step: 0.01,
                    value: snare.playbackRate.value,
                    callback: value => {
                        snare.playbackRate.value = value;
                    }
                }
            ].forEach(data => {
                track6.add(new PanelItem(data));
            });

            const track7 = new Panel();
            panels.container.add(track7);

            [
                { name: 'Hihat' },
                { type: 'divider' },
                {
                    type: 'slider',
                    name: 'Volume',
                    min: 0,
                    max: 1,
                    step: 0.01,
                    value: hihat.gain.value,
                    callback: value => {
                        hihat.gain.value = value;
                    }
                },
                {
                    type: 'slider',
                    name: 'Pan',
                    min: -1,
                    max: 1,
                    step: 0.01,
                    value: hihat.stereoPan.value,
                    callback: value => {
                        hihat.stereoPan.value = value;
                    }
                },
                {
                    type: 'slider',
                    name: 'Rate',
                    min: 0,
                    max: 2,
                    step: 0.01,
                    value: hihat.playbackRate.value,
                    callback: value => {
                        hihat.playbackRate.value = value;
                    }
                }
            ].forEach(data => {
                track7.add(new PanelItem(data));
            });

            container.appendChild(panels.element);
            container.appendChild(ui.element);

            panels.animateIn();
            ui.animateIn();

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

            panels.destroy();
            ui.destroy();

            if (WebAudio.context) {
                WebAudio.destroy();
            }
        };
    }, []);

    return <Example title={title} ref={ref} />;
}
