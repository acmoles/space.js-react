import { useEffect, useRef } from 'react';

import { Example } from '@/components';

import './ThreadCanvas.css';

/**
 * Full-viewport animated canvas noise, rendered on a dedicated worker thread
 * via the Space.js Thread protocol (init / resize / start / stop messages).
 *
 * Based on https://codepen.io/zepha/pen/VpXvBJ
 */
export default function ThreadCanvasExample({ title }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;

        const worker = new Worker(new URL('./threadCanvasWorker.js', import.meta.url), { type: 'module' });

        const thread = {
            init: (params, buffer) => worker.postMessage({ message: { fn: 'init', ...params } }, buffer || []),
            resize: params => worker.postMessage({ message: { fn: 'resize', ...params } }),
            start: params => worker.postMessage({ message: { fn: 'start', ...params } }),
            stop: () => worker.postMessage({ message: { fn: 'stop' } }),
            terminate: () => worker.terminate()
        };

        const offscreen = canvas.transferControlToOffscreen();

        thread.init({ params: { canvas: offscreen } }, [offscreen]);

        const onResize = () => {
            const width = document.documentElement.clientWidth;
            const height = document.documentElement.clientHeight;
            const dpr = window.devicePixelRatio;

            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            thread.resize({ width, height, dpr });
        };

        window.addEventListener('resize', onResize);
        onResize();

        thread.start({ fps: 20 });

        return () => {
            window.removeEventListener('resize', onResize);
            thread.stop();
            thread.terminate();
        };
    }, []);

    return (
        <Example title={title}>
            <canvas ref={canvasRef} className="thread-canvas" />
        </Example>
    );
}
