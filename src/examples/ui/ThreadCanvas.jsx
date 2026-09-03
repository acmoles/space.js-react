import { useEffect, useRef } from 'react';

import { Example } from '@/components';

// Vite module worker — bundler-friendly equivalent of the blob-based Thread approach.
// Main thread posts { message: { fn, ...params } } (matching space.js Thread protocol);
// the worker dispatches on data.message.fn.

function makeThread(worker) {
    return {
        init: (params, buffer) => worker.postMessage({ message: { fn: 'init', ...params } }, buffer || []),
        resize: params => worker.postMessage({ message: { fn: 'resize', ...params } }),
        start: params => worker.postMessage({ message: { fn: 'start', ...params } }),
        stop: () => worker.postMessage({ message: { fn: 'stop' } }),
        terminate: () => worker.terminate()
    };
}

// Based on https://codepen.io/zepha/pen/VpXvBJ

export default function ThreadCanvasExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        const container = ref.current;

        const canvas = document.createElement('canvas');
        container.appendChild(canvas);

        const worker = new Worker(new URL('./threadCanvasWorker.js', import.meta.url), { type: 'module' });
        const thread = makeThread(worker);

        const offscreen = canvas.transferControlToOffscreen();

        thread.init({ params: { canvas: offscreen } }, [offscreen]);

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
            thread.terminate();
            if (canvas.parentNode) {
                canvas.parentNode.removeChild(canvas);
            }
        };
    }, []);

    return <Example title={title} ref={ref} />;
}
