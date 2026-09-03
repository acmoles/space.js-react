import { useEffect, useRef } from 'react';

import { Thread, ticker } from '@lib/index.js';

import { Example } from '@/components';

// Based on https://codepen.io/zepha/pen/VpXvBJ

class CanvasNoise {
    constructor(params) {
        const defaults = {
            width: 1,
            height: 1,
            tileSize: 250,
            monochrome: true
        };

        this.params = Object.assign(defaults, params);

        this.initCanvas();
    }

    initCanvas() {
        this.canvas = this.params.canvas;
        this.canvas.width = this.params.width;
        this.canvas.height = this.params.height;
        this.context = this.canvas.getContext('2d');

        this.tile = typeof window === 'undefined' ? new OffscreenCanvas(this.params.tileSize, this.params.tileSize) : document.createElement('canvas');
        this.tile.width = this.params.tileSize;
        this.tile.height = this.params.tileSize;
        this.tileContext = this.tile.getContext('2d');
    }

    // Public methods

    resize = (width, height, dpr) => {
        this.canvas.width = Math.round(width * dpr);
        this.canvas.height = Math.round(height * dpr);

        this.tile.width = Math.round(this.params.tileSize * dpr);
        this.tile.height = Math.round(this.params.tileSize * dpr);

        this.width = this.canvas.width / this.tile.width + 1; // One extra tile for row offset
        this.height = this.canvas.height / this.tile.height;

        this.update();
    };

    update = () => {
        const pixels = new ImageData(this.tile.width, this.tile.height);

        for (let i = 0, l = pixels.data.length; i < l; i += 4) {
            const rand = 255 * Math.random();

            pixels.data[i] = this.params.monochrome ? rand : 255 * Math.random();
            pixels.data[i + 1] = this.params.monochrome ? rand : 255 * Math.random();
            pixels.data[i + 2] = this.params.monochrome ? rand : 255 * Math.random();
            pixels.data[i + 3] = 255;
        }

        this.tileContext.putImageData(pixels, 0, 0);

        for (let x = 0, xl = this.width; x < xl; x++) {
            for (let y = 0, yl = this.height; y < yl; y++) {
                this.context.drawImage(this.tile, x * this.tile.width - (y % 2 === 0 ? this.tile.width / 2 : 0), y * this.tile.height, this.tile.width, this.tile.height);
            }
        }
    };
}

class CanvasNoiseThread {
    constructor() {
        this.addListeners();
    }

    addListeners() {
        addEventListener('message', this.onMessage);
        ticker.start();
    }

    // Event handlers

    onMessage = ({ data }) => {
        this[data.message.fn].call(this, data.message);
    };

    onUpdate = () => {
        this.noise.update();
    };

    // Public methods

    init = ({ params }) => {
        this.noise = new CanvasNoise(params);
    };

    resize = ({ width, height, dpr }) => {
        this.noise.resize(width, height, dpr);
    };

    start = ({ fps }) => {
        ticker.add(this.onUpdate, fps);
    };

    stop = () => {
        ticker.remove(this.onUpdate);
    };
}

export default function ThreadCanvasExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        const container = ref.current;

        const canvas = document.createElement('canvas');
        container.appendChild(canvas);

        const thread = new Thread({
            imports: [
                ['@lib/index.js', 'ticker']
            ],
            classes: [CanvasNoise],
            controller: [CanvasNoiseThread, 'void init', 'void resize', 'void start', 'void stop']
        });

        const offscreen = canvas.transferControlToOffscreen();

        thread.init({ params: { canvas: offscreen }, buffer: [offscreen] });

        let started = false;

        const onResize = () => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            const dpr = window.devicePixelRatio;

            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            thread.resize({ width, height, dpr });
        };

        const onLoad = () => {
            if (!started) {
                started = true;
                thread.start({ fps: 20 });
            }
        };

        window.addEventListener('resize', onResize);
        window.addEventListener('load', onLoad);
        onResize();

        if (document.readyState === 'complete') {
            onLoad();
        }

        return () => {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('load', onLoad);
            thread.stop();
            thread.destroy();
            if (canvas.parentNode) {
                canvas.parentNode.removeChild(canvas);
            }
        };
    }, []);

    return <Example title={title} ref={ref} />;
}
