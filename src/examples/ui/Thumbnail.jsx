import { useCallback, useEffect, useRef, useState } from 'react';

import { Example } from '@/components';

import { useTicker } from '../../space/motion/index.js';
import { UI } from '../../space/components/ui/index.js';

// Based on https://codepen.io/zepha/pen/VpXvBJ

const TILE_SIZE = 250;

/**
 * Draws a frame of colour noise onto `canvas`, tiling a pre-generated `tile`
 * canvas. Kept as a plain function so it can be called from both a resize
 * handler and the per-frame ticker without creating wrapper objects.
 */
function drawNoise(canvas, tile) {
    if (!canvas || !tile) return;

    const ctx = canvas.getContext('2d');
    const tileCtx = tile.getContext('2d');
    const pixels = new ImageData(tile.width, tile.height);

    for (let i = 0, l = pixels.data.length; i < l; i += 4) {
        pixels.data[i] = Math.random() * 255;
        pixels.data[i + 1] = Math.random() * 255;
        pixels.data[i + 2] = Math.random() * 255;
        pixels.data[i + 3] = 255;
    }

    tileCtx.putImageData(pixels, 0, 0);

    const tilesX = Math.ceil(canvas.width / tile.width) + 1;
    const tilesY = Math.ceil(canvas.height / tile.height);

    for (let x = 0; x < tilesX; x++) {
        for (let y = 0; y < tilesY; y++) {
            ctx.drawImage(
                tile,
                x * tile.width - (y % 2 === 0 ? tile.width / 2 : 0),
                y * tile.height,
                tile.width,
                tile.height
            );
        }
    }
}

export default function ThumbnailExample({ title }) {
    const uiRef = useRef(null);
    const noiseRef = useRef(null);
    const tileRef = useRef(null);

    // `noiseCanvas` drives conditional rendering of <UI> so Thumbnail
    // receives the real DOM element on its first mount (not null).
    const [noiseCanvas, setNoiseCanvas] = useState(null);

    const resize = useCallback(() => {
        const canvas = noiseRef.current;
        const tile = tileRef.current;

        if (!canvas || !tile) return;

        const dpr = window.devicePixelRatio;
        const w = document.documentElement.clientWidth;
        const h = document.documentElement.clientHeight;

        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;

        tile.width = Math.round(TILE_SIZE * dpr);
        tile.height = Math.round(TILE_SIZE * dpr);

        drawNoise(canvas, tile);
    }, []);

    // Size canvases on mount and on window resize
    useEffect(() => {
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [resize]);

    // Make the canvas available to <UI> after first commit so Thumbnail's
    // imageRef is initialised with the real element (not null).
    useEffect(() => {
        setNoiseCanvas(noiseRef.current);
    }, []);

    // Animate UI in after the canvas is ready and UI has mounted
    useEffect(() => {
        if (!noiseCanvas) return;
        uiRef.current?.animateIn();
    }, [noiseCanvas]);

    // Redraw noise every frame via the shared ticker
    useTicker(() => drawNoise(noiseRef.current, tileRef.current));

    return (
        <Example title={title}>
            {/* Noise background (same element passed to the Thumbnail) */}
            <canvas
                ref={noiseRef}
                style={{ position: 'absolute', inset: 0, display: 'block' }}
            />
            {/* Off-screen tile canvas for pattern generation */}
            <canvas ref={tileRef} style={{ display: 'none' }} />

            {noiseCanvas && (
                <UI
                    ref={uiRef}
                    fps
                    thumbnail={{
                        image: noiseCanvas,
                        width: 150,
                        height: 100,
                        snapMargin: 20,
                        position: 'bl',
                        noCanvas: false,
                        onUpdate: (image, el) => {
                            console.log('Thumbnail event:', image, el);
                        },
                        onClick: () => {
                            console.log('Thumbnail click event');
                            window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
                        }
                    }}
                />
            )}
        </Example>
    );
}
