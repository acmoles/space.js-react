import { useEffect, useRef, useState } from 'react';

import { WebAudio, clamp, mapLinear, median, rms, ticker, tween } from '@lib/index.js';

import { Example } from '@/components';
import { Info } from '@/space/components/nav/index.js';
import { RadialGraphSegments } from '@/space/components/radial/index.js';
import { useResize } from '@/space/hooks/index.js';
import { UI } from '@/space/components/ui/UI.jsx';

import './AudioRadialGraph.css';

const AUDIO_BUTTON_INFO = {
    name: 'Cyberspace',
    title: 'cyberspace.app',
    link: 'https://cyberspace.app/'
};

// fftSize 4096 → frequencyBinCount = 2048
const BUFFER_LENGTH = 2048;

// Initial chunk=1 → arrayLength=2048, segmentSize=682
const INITIAL_SEGMENT_SIZE = Math.floor(BUFFER_LENGTH / 3);
const INITIAL_SEGMENTS = [
    INITIAL_SEGMENT_SIZE,
    INITIAL_SEGMENT_SIZE,
    BUFFER_LENGTH - INITIAL_SEGMENT_SIZE * 2
];

export default function AudioRadialGraphExample({ title }) {
    const uiRef = useRef(null);
    const graphRef = useRef(null);
    const instructionsRef = useRef(null);

    const [initialSound] = useState(() => {
        const v = localStorage.getItem('sound');

        return v ? JSON.parse(v) : true;
    });

    // Stable callback ref so AudioButton's onUpdate stays referentially stable
    const onAudioRef = useRef(null);

    // Mutable audio-analysis state — all in one ref so the ticker closure
    // always sees fresh values without causing re-renders.
    const audioState = useRef({
        highsRange: [0.4, 0.6],
        midsRange: [0, 1],
        lowsRange: [0.1, 0.3],
        multiplier: 0.5,
        peakInterval: 3,
        lastTime: 0,
        highs: 0,
        mids: 0,
        lows: 0,
        chunkSize: 1,
        chunkSizes: [],
        arrayLength: BUFFER_LENGTH,
        segmentPositions: [INITIAL_SEGMENT_SIZE, INITIAL_SEGMENT_SIZE * 2, BUFFER_LENGTH]
    });

    useEffect(() => {
        let alive = true;
        const as = audioState.current;

        // ── Audio setup ──────────────────────────────────────────────────────
        WebAudio.init({ sampleRate: 48000 });
        WebAudio.load({ cyberspace: 'https://icecast.cyberspace.app/dive.ogg' });

        const context = WebAudio.context;
        const cyberspace = WebAudio.get('cyberspace');
        cyberspace.gain.set(1);

        const analyserDelay = context.createDelay();
        analyserDelay.delayTime.value = 4 / 60;
        analyserDelay.connect(cyberspace.parent.input);

        const analyser = context.createAnalyser();
        analyser.fftSize = 4096;
        const bufferLength = analyser.frequencyBinCount;
        const data = new Uint8Array(bufferLength);

        cyberspace.output.disconnect();
        cyberspace.output.connect(analyser);
        analyser.connect(analyserDelay);

        // ── Chunk size lookup (same logic as original) ───────────────────────
        const chunkSizes = [];
        const segmentSizes = [];

        for (let i = 1; i < bufferLength; i++) {
            const al = Math.floor(bufferLength / i);
            const ss = Math.floor(al / 3);

            if (al - ss * 3 === 0 && ss >= 5 && !segmentSizes.includes(ss)) {
                segmentSizes.push(ss);
                chunkSizes.push(i);
            }
        }

        chunkSizes.unshift(1, 2, 3, 4, 5, 6, 7, 8, 9);
        as.chunkSizes = chunkSizes;

        const array = [];

        function setGraphSegments(size) {
            as.chunkSize = size;
            as.arrayLength = Math.floor(bufferLength / size);

            const ss = Math.floor(as.arrayLength / 3);
            const g = graphRef.current;

            if (g) {
                g.array.length = as.arrayLength;

                if (g.ghostArray) {
                    g.ghostArray.length = as.arrayLength;
                }
            }

            as.segmentPositions = [ss, ss * 2, as.arrayLength];
        }

        setGraphSegments(as.chunkSize);

        function getAverageFrequency(arr, start, end) {
            return rms(arr.slice(start, end).map(v => v / 256));
        }

        function mute() {
            tween(cyberspace.gain, { value: 0 }, 500, 'easeOutSine');
        }

        function unmute() {
            tween(cyberspace.gain, { value: 1 }, 500, 'easeOutSine');
        }

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

            if (!as.soundState) {
                // Sound is stored as off — leave gain at 0
                mute();
            }

            cyberspace.play();
        }

        function onAudio(sound) {
            if (sound) {
                unmute();
            } else {
                mute();
            }

            localStorage.setItem('sound', JSON.stringify(sound));
            as.soundState = sound;
        }

        onAudioRef.current = onAudio;

        function preventZoom(e) {
            e.preventDefault();
        }

        function onUpdate(time) {
            if (!alive) return;

            const { peakInterval, highsRange, midsRange, lowsRange, segmentPositions,
                chunkSize, arrayLength, multiplier } = as;
            const { lastTime } = as;
            let { highs, mids, lows } = as;

            if (time - lastTime > peakInterval) {
                as.lastTime = time;
                as.highs = 0;
                as.mids = 0;
                as.lows = 0;
                highs = 0;
                mids = 0;
                lows = 0;
            }

            analyser.getByteFrequencyData(data);

            array.length = 0;

            for (let i = 0; i < bufferLength; i += chunkSize) {
                array.push(median(data.slice(i, i + chunkSize)));
            }

            const currentHighs = getAverageFrequency(array, 0, Math.floor(arrayLength * 0.4));
            const currentMids = getAverageFrequency(array, Math.floor(arrayLength * 0.4), Math.floor(arrayLength * 0.6));
            const currentLows = getAverageFrequency(array, Math.floor(arrayLength * 0.6), arrayLength);

            as.highs = Math.max(highs, currentHighs);
            as.mids = Math.max(mids, currentMids);
            as.lows = Math.max(lows, currentLows);

            const g = graphRef.current;

            if (!g) return;

            g.ghostArray.fill(clamp(mapLinear(as.highs, highsRange[0], highsRange[1], 0, 1), 0, 1), 0, segmentPositions[0]);
            g.ghostArray.fill(clamp(mapLinear(as.mids, midsRange[0], midsRange[1], 0, 1), 0, 1), segmentPositions[0], segmentPositions[1]);
            g.ghostArray.fill(clamp(mapLinear(as.lows, lowsRange[0], lowsRange[1], 0, 1), 0, 1), segmentPositions[1], segmentPositions[2]);

            g.array.fill(clamp(mapLinear(currentHighs, highsRange[0], highsRange[1], 0, 1), 0, 1), 0, segmentPositions[0]);
            g.array.fill(clamp(mapLinear(currentMids, midsRange[0], midsRange[1], 0, 1), 0, 1), segmentPositions[0], segmentPositions[1]);
            g.array.fill(clamp(mapLinear(currentLows, lowsRange[0], lowsRange[1], 0, 1), 0, 1), segmentPositions[1], segmentPositions[2]);

            analyser.getByteTimeDomainData(data);

            array.length = 0;

            for (let i = 0; i < bufferLength; i += chunkSize) {
                array.push(median(data.slice(i, i + chunkSize)));
            }

            for (let i = 0; i < arrayLength; i++) {
                const v = array[i] / 128;
                const y = clamp(mapLinear(v, 0, 2, -0.5, 0.5), -0.5, 0.5);

                g.array[i] = g.array[i] + y * multiplier;
            }

            g.markDirty();
            g.update();
        }

        // ── Panel items ──────────────────────────────────────────────────────
        const panelItems = [
            { name: 'FPS' },
            { type: 'divider' },
            {
                type: 'slider',
                name: 'Volume',
                min: 0,
                max: 1,
                step: 0.01,
                value: cyberspace.gain.value,
                callback: value => {
                    cyberspace.gain.value = value;
                }
            },
            {
                type: 'slider',
                name: 'Delay',
                min: 0,
                max: 60,
                step: 1,
                value: analyserDelay.delayTime.value * 60,
                callback: value => {
                    analyserDelay.delayTime.value = value / 60;
                }
            },
            { type: 'divider' },
            {
                type: 'slider',
                name: 'Highs Min',
                min: 0,
                max: 1,
                step: 0.01,
                value: as.highsRange[0],
                callback: value => { as.highsRange[0] = value; }
            },
            {
                type: 'slider',
                name: 'Highs Max',
                min: 0,
                max: 1,
                step: 0.01,
                value: as.highsRange[1],
                callback: value => { as.highsRange[1] = value; }
            },
            { type: 'divider' },
            {
                type: 'slider',
                name: 'Mids Min',
                min: 0,
                max: 1,
                step: 0.01,
                value: as.midsRange[0],
                callback: value => { as.midsRange[0] = value; }
            },
            {
                type: 'slider',
                name: 'Mids Max',
                min: 0,
                max: 1,
                step: 0.01,
                value: as.midsRange[1],
                callback: value => { as.midsRange[1] = value; }
            },
            { type: 'divider' },
            {
                type: 'slider',
                name: 'Lows Min',
                min: 0,
                max: 1,
                step: 0.01,
                value: as.lowsRange[0],
                callback: value => { as.lowsRange[0] = value; }
            },
            {
                type: 'slider',
                name: 'Lows Max',
                min: 0,
                max: 1,
                step: 0.01,
                value: as.lowsRange[1],
                callback: value => { as.lowsRange[1] = value; }
            },
            { type: 'divider' },
            {
                type: 'slider',
                name: 'Oscope',
                min: 0,
                max: 1,
                step: 0.01,
                value: as.multiplier,
                callback: value => { as.multiplier = value; }
            },
            {
                type: 'slider',
                name: 'Chunk',
                min: 0,
                max: chunkSizes.length - 1,
                step: 1,
                value: chunkSizes.indexOf(as.chunkSize),
                callback: value => {
                    setGraphSegments(chunkSizes[value]);
                }
            }
        ];

        panelItems.forEach(item => {
            uiRef.current?.addPanel(item);
        });

        // ── Listeners & start ────────────────────────────────────────────────
        document.addEventListener('visibilitychange', onVisibility);
        document.addEventListener('click', onClick);
        document.addEventListener('dblclick', preventZoom);

        ticker.add(onUpdate);
        ticker.start();

        instructionsRef.current?.animateIn();
        graphRef.current?.animateIn();
        uiRef.current?.animateIn();

        return () => {
            alive = false;
            onAudioRef.current = null;

            document.removeEventListener('visibilitychange', onVisibility);
            document.removeEventListener('click', onClick);
            document.removeEventListener('dblclick', preventZoom);

            ticker.remove(onUpdate);

            cyberspace.stop();

            if (WebAudio.context) {
                WebAudio.destroy();
            }
        };
    }, []);  

    useResize(({ width, height }) => {
        const size = (width < height ? width : height) * 0.74;

        graphRef.current?.setSize(size, size);
    });

    return (
        <Example title={title}>
            <div className="audio-radial-graph-container">
                <RadialGraphSegments
                    ref={graphRef}
                    value={new Array(BUFFER_LENGTH).fill(0)}
                    ghost
                    start={-90}
                    precision={2}
                    lookupPrecision={100}
                    segments={INITIAL_SEGMENTS}
                    labels={['Highs', 'Mids', 'Lows']}
                    noHover
                />
            </div>
            <Info
                ref={instructionsRef}
                bottom
                content={`${navigator.maxTouchPoints ? 'Tap' : 'Click'} for sound`}
            />
            <UI
                ref={uiRef}
                fps
                audioButton={{ sound: initialSound, info: AUDIO_BUTTON_INFO, onUpdate: sound => onAudioRef.current?.(sound) }}
            />
        </Example>
    );
}


