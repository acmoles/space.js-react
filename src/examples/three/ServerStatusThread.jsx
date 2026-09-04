import { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';

import { EventEmitter } from '@lib/three.js';

import { Example } from '@/components';
import { useClassName } from '@/hooks';

import { SceneContent } from './server-status/SceneContent.jsx';

const isDebug = /[?&]debug/.test(location.search);

class WorkerEmitter extends EventEmitter {
    constructor(workerUrl) {
        super();
        this._worker = new Worker(workerUrl, { type: 'module' });
        this._worker.addEventListener('message', ({ data }) => {
            if (data && data.event) {
                this.emit(data.event, data.message);
            }
        });
    }

    call(fn, args) {
        this._worker.postMessage({ message: { fn, ...args } });
    }

    init(args) {
        this.call('init', args);
    }

    destroy() {
        this._worker.terminate();
    }
}

function createThreadSource() {
    const workerUrl = new URL('./server-status/socketWorker.js', import.meta.url);
    const emitter = new WorkerEmitter(workerUrl);

    emitter.init({ server: 'wss://hello-websockets-server-status.cyberspace.app' });

    return {
        emitter,
        cleanup: () => emitter.destroy()
    };
}

/**
 * Declarative server-status example backed by the worker adapter.
 */
export default function ServerStatusThread({ title }) {
    const containerRef = useRef(null);
    const [overlayEl, setOverlayEl] = useState(null);

    useClassName('scroll');

    return (
        <Example title={title} ref={containerRef}>
            <Canvas
                gl={{ antialias: true }}
                dpr={window.devicePixelRatio}
                camera={{ fov: 35, near: 1, far: 2000, position: [0, 0, 10] }}
            >
                <SceneContent
                    containerRef={containerRef}
                    createSource={createThreadSource}
                    isDebug={isDebug}
                    overlayEl={overlayEl}
                />
            </Canvas>
            <div ref={setOverlayEl} style={{ inset: 0, pointerEvents: 'none', position: 'absolute' }} />
        </Example>
    );
}
