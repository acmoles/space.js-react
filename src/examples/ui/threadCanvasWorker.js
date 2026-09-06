// Vite module worker — bundler-friendly equivalent of the blob-based Thread approach.
// Based on https://codepen.io/zepha/pen/VpXvBJ

import { ticker } from '@lib/index.js';

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

        this.tile = new OffscreenCanvas(this.params.tileSize, this.params.tileSize);
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

new CanvasNoiseThread();
