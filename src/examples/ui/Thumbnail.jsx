import { useEffect, useRef } from 'react';

import { Interface, UI, ticker } from '@lib/index.js';

import { Example } from '@/components';

// Based on https://codepen.io/zepha/pen/VpXvBJ

class CanvasNoise extends Interface {
    constructor(params) {
        super(null, 'canvas');

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
        this.context = this.element.getContext('2d');

        this.tile = document.createElement('canvas');
        this.tileContext = this.tile.getContext('2d');
    }

    // Public methods

    resize = (width, height, dpr) => {
        this.element.width = Math.round(width * dpr);
        this.element.height = Math.round(height * dpr);
        this.element.style.width = `${width}px`;
        this.element.style.height = `${height}px`;

        this.tile.width = Math.round(this.params.tileSize * dpr);
        this.tile.height = Math.round(this.params.tileSize * dpr);

        this.width = this.element.width / this.tile.width + 1; // One extra tile for row offset
        this.height = this.element.height / this.tile.height;

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

export default function ThumbnailExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        const container = ref.current;

        const noise = new CanvasNoise({
            monochrome: false
        });
        container.appendChild(noise.element);

        const ui = new UI({
            fps: true,
            // thumbnail: noise.element,
            thumbnail: {
                image: noise.element,
                width: 150,
                height: 100,
                snapMargin: 20,
                position: 'bl', // tl, bl, br, tr
                noCanvas: false,
                callback: value => {
                    console.log('Thumbnail callback:', value);
                }
            }
        });
        ui.animateIn();
        container.appendChild(ui.element);

        const onThumbnail = e => {
            console.log('Thumbnail event:', e);
        };

        const onThumbnailClick = e => {
            console.log('Thumbnail click event:', e);

            open('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        };

        ui.thumbnail.events.on('update', onThumbnail);
        ui.thumbnail.events.on('click', onThumbnailClick);

        const onResize = () => {
            const width = document.documentElement.clientWidth;
            const height = document.documentElement.clientHeight;
            const dpr = window.devicePixelRatio;

            noise.resize(width, height, dpr);
        };

        const onUpdate = () => {
            noise.update();
            ui.update();
        };

        window.addEventListener('resize', onResize);
        ticker.add(onUpdate, 20);
        ticker.start();
        onResize();

        return () => {
            window.removeEventListener('resize', onResize);
            ticker.remove(onUpdate);
            ui.thumbnail.events.off('update', onThumbnail);
            ui.thumbnail.events.off('click', onThumbnailClick);
            noise.destroy();
            ui.destroy();
        };
    }, []);

    return <Example title={title} ref={ref} />;
}
