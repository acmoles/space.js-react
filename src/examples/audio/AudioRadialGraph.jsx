import { useEffect, useRef } from 'react';

import { PanelItem, RadialGraphSegments, UI, WebAudio, clamp, mapLinear, median, rms, ticker, tween } from '@lib/index.js';

import { Example } from '@/components';

export default function AudioRadialGraphExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        const container = ref.current;

        const store = {
            sound: true
        };

        const sound = localStorage.getItem('sound');
        store.sound = sound ? JSON.parse(sound) : true;

        // Views
        const ui = new UI({
            fps: true,
            instructions: {
                content: `${navigator.maxTouchPoints ? 'Tap' : 'Click'} for sound`
            },
            audioButton: {
                sound: store.sound
            }
        });
        ui.css({
            minHeight: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        });
        container.appendChild(ui.element);

        ui.audioButton.setData({
            name: 'Cyberspace',
            title: 'cyberspace.app',
            link: 'https://cyberspace.app/'
        });

        // Radial graph with 3 segments, ghost and labels
        const graph = new RadialGraphSegments({
            value: new Array(2048).fill(0),
            ghost: true,
            start: -90,
            precision: 2,
            lookupPrecision: 100,
            segments: [1, 1, 1],
            labels: ['Highs', 'Mids', 'Lows'],
            noHover: true
        });
        ui.add(graph);

        // Audio
        WebAudio.init({ sampleRate: 48000 });
        WebAudio.load({ cyberspace: 'https://icecast.cyberspace.app/dive.ogg' });

        const context = WebAudio.context;

        const cyberspace = WebAudio.get('cyberspace');
        cyberspace.gain.set(1);

        // Median downsample
        const array = [];
        const chunkSizes = [];
        let chunkSize = 1;

        // Peak levels for ghost graph
        const peakInterval = 3; // 3 seconds
        let lastTime = 0;
        let highs = 0;
        let mids = 0;
        let lows = 0;

        // Bars
        const highsRange = [0.4, 0.6];
        const midsRange = [0, 1];
        const lowsRange = [0.1, 0.3];

        // Oscilloscope
        let multiplier = 0.5;

        // Delay the output to sync with the analyser
        const analyserDelay = context.createDelay();
        analyserDelay.delayTime.value = 4 / 60; // seconds
        analyserDelay.connect(cyberspace.parent.input);

        const analyser = context.createAnalyser();
        analyser.fftSize = 4096;

        const bufferLength = analyser.frequencyBinCount;
        const data = new Uint8Array(bufferLength);

        // Connect the source to be analyzed (directly without output)
        // cyberspace.source.connect(analyser);

        // Reconnect the output to be analyzed (with analyser output)
        cyberspace.output.disconnect();
        cyberspace.output.connect(analyser);
        analyser.connect(analyserDelay);

        // Find all the chunk sizes evenly divisible by 3
        const segmentSizes = [];

        for (let i = 1; i < bufferLength; i++) {
            const arrayLength = Math.floor(bufferLength / i);
            const segmentSize = Math.floor(arrayLength / 3);

            if (arrayLength - segmentSize * 3 === 0 && segmentSize >= 5 && !segmentSizes.includes(segmentSize)) {
                segmentSizes.push(segmentSize);

                chunkSizes.push(i);
            }
        }

        chunkSizes.unshift(1, 2, 3, 4, 5, 6, 7, 8, 9);

        let arrayLength = Math.floor(bufferLength / chunkSize);
        let segmentPositions;

        function setGraphSegments(size) {
            chunkSize = size;

            arrayLength = Math.floor(bufferLength / chunkSize);

            const segmentSize = Math.floor(arrayLength / 3);

            graph.segments = [segmentSize, segmentSize, arrayLength - segmentSize * 2];
            graph.array.length = arrayLength;
            graph.ghostArray.length = arrayLength;

            segmentPositions = [segmentSize, segmentSize * 2, arrayLength];
        }

        setGraphSegments(chunkSize);

        function getAverageFrequency(arr, start = 0, end = arr.length) {
            // Calculate the root median square (RMS)
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

            ui.instructions.animateOut();

            if (!store.sound) {
                ui.audioButton.onClick();
            }

            cyberspace.play();
        }

        function onAudio({ sound: s }) {
            if (s) {
                unmute();
            } else {
                mute();
            }

            localStorage.setItem('sound', JSON.stringify(s));

            store.sound = s;
        }

        function preventZoom(e) {
            e.preventDefault();
        }

        function onResize() {
            const width = document.documentElement.clientWidth;
            const height = document.documentElement.clientHeight;

            if (width < height) {
                const size = document.documentElement.clientWidth * 0.74;

                graph.setSize(size, size);
            } else {
                const size = document.documentElement.clientHeight * 0.74;

                graph.setSize(size, size);
            }

            ui.instructions.css({ bottom: Math.round(height / 2) - 16 });
        }

        function onUpdate(time) {
            if (time - lastTime > peakInterval) {
                lastTime = time;
                highs = 0;
                mids = 0;
                lows = 0;
            }

            // Bars
            analyser.getByteFrequencyData(data);

            // Median downsample
            array.length = 0;

            for (let i = 0; i < bufferLength; i += chunkSize) {
                array.push(median(data.slice(i, i + chunkSize)));
            }

            const currentHighs = getAverageFrequency(array, 0, Math.floor(arrayLength * 0.4));
            const currentMids = getAverageFrequency(array, Math.floor(arrayLength * 0.4), Math.floor(arrayLength * 0.6));
            const currentLows = getAverageFrequency(array, Math.floor(arrayLength * 0.6), arrayLength);

            highs = Math.max(highs, currentHighs);
            mids = Math.max(mids, currentMids);
            lows = Math.max(lows, currentLows);

            graph.ghostArray.fill(clamp(mapLinear(highs, highsRange[0], highsRange[1], 0, 1), 0, 1), 0, segmentPositions[0]);
            graph.ghostArray.fill(clamp(mapLinear(mids, midsRange[0], midsRange[1], 0, 1), 0, 1), segmentPositions[0], segmentPositions[1]);
            graph.ghostArray.fill(clamp(mapLinear(lows, lowsRange[0], lowsRange[1], 0, 1), 0, 1), segmentPositions[1], segmentPositions[2]);

            graph.array.fill(clamp(mapLinear(currentHighs, highsRange[0], highsRange[1], 0, 1), 0, 1), 0, segmentPositions[0]);
            graph.array.fill(clamp(mapLinear(currentMids, midsRange[0], midsRange[1], 0, 1), 0, 1), segmentPositions[0], segmentPositions[1]);
            graph.array.fill(clamp(mapLinear(currentLows, lowsRange[0], lowsRange[1], 0, 1), 0, 1), segmentPositions[1], segmentPositions[2]);

            // Oscilloscope
            analyser.getByteTimeDomainData(data);

            // Median downsample
            array.length = 0;

            for (let i = 0; i < bufferLength; i += chunkSize) {
                array.push(median(data.slice(i, i + chunkSize)));
            }

            for (let i = 0; i < arrayLength; i++) {
                const v = array[i] / 128;
                const y = clamp(mapLinear(v, 0, 2, -0.5, 0.5), -0.5, 0.5);

                graph.array[i] = graph.array[i] + y * multiplier;
            }

            graph.needsUpdate = true;

            graph.update();
            ui.update();
        }

        document.addEventListener('visibilitychange', onVisibility);
        document.addEventListener('click', onClick);
        document.addEventListener('dblclick', preventZoom);
        window.addEventListener('resize', onResize);

        ui.audioButton.events.on('update', onAudio);

        ticker.add(onUpdate);
        ticker.start();

        onResize();

        // Panel
        const items = [
            {
                name: 'FPS'
            },
            {
                type: 'divider'
            },
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
            {
                type: 'divider'
            },
            {
                type: 'slider',
                name: 'Highs Min',
                min: 0,
                max: 1,
                step: 0.01,
                value: highsRange[0],
                callback: value => {
                    highsRange[0] = value;
                }
            },
            {
                type: 'slider',
                name: 'Highs Max',
                min: 0,
                max: 1,
                step: 0.01,
                value: highsRange[1],
                callback: value => {
                    highsRange[1] = value;
                }
            },
            {
                type: 'divider'
            },
            {
                type: 'slider',
                name: 'Mids Min',
                min: 0,
                max: 1,
                step: 0.01,
                value: midsRange[0],
                callback: value => {
                    midsRange[0] = value;
                }
            },
            {
                type: 'slider',
                name: 'Mids Max',
                min: 0,
                max: 1,
                step: 0.01,
                value: midsRange[1],
                callback: value => {
                    midsRange[1] = value;
                }
            },
            {
                type: 'divider'
            },
            {
                type: 'slider',
                name: 'Lows Min',
                min: 0,
                max: 1,
                step: 0.01,
                value: lowsRange[0],
                callback: value => {
                    lowsRange[0] = value;
                }
            },
            {
                type: 'slider',
                name: 'Lows Max',
                min: 0,
                max: 1,
                step: 0.01,
                value: lowsRange[1],
                callback: value => {
                    lowsRange[1] = value;
                }
            },
            {
                type: 'divider'
            },
            {
                type: 'slider',
                name: 'Oscope',
                min: 0,
                max: 1,
                step: 0.01,
                value: multiplier,
                callback: value => {
                    multiplier = value;
                }
            },
            {
                type: 'slider',
                name: 'Chunk',
                min: 0,
                max: chunkSizes.length - 1,
                step: 1,
                value: chunkSizes.indexOf(chunkSize),
                callback: value => {
                    setGraphSegments(chunkSizes[value]);
                }
            }
        ];

        items.forEach(data => {
            ui.addPanel(new PanelItem(data));
        });

        ui.instructions.animateIn();

        graph.animateIn();
        ui.animateIn();

        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            document.removeEventListener('click', onClick);
            document.removeEventListener('dblclick', preventZoom);
            window.removeEventListener('resize', onResize);

            ui.audioButton.events.off('update', onAudio);

            ticker.remove(onUpdate);

            cyberspace.stop();
            ui.destroy();

            if (WebAudio.context) {
                WebAudio.destroy();
            }
        };
    }, []);

    return <Example title={title} ref={ref} />;
}
