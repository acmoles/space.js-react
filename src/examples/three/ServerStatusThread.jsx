import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';

import { EventEmitter } from '@lib/three.js';

import { Example } from '@/components';
import { useClassName } from '@/hooks';

import { SceneContent } from './server-status/SceneContent.jsx';

const isDebug = /[?&]debug/.test(location.search);

/**
 * Thin main-thread adapter that wraps a Vite module worker and exposes the
 * same EventEmitter interface that SceneContent expects.  This is the
 * bundler-friendly replacement for space.js Thread used in the original
 * 3d_server_status_thread.html example.
 */
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

    // Send an RPC call to the worker (fire-and-forget for void methods).
    call(fn, args) {
        this._worker.postMessage({ message: { fn, ...args } });
    }

    // Convenience wrapper used by createSource below.
    init(args) {
        this.call('init', args);
    }

    destroy() {
        this._worker.terminate();
    }
}

// Factory called once per mount.
function createThreadSource() {
    // Vite module worker — resolves the URL at build time.
    const workerUrl = new URL('./server-status/socketWorker.js', import.meta.url);
    const emitter = new WorkerEmitter(workerUrl);
    emitter.init({ server: 'wss://hello-websockets-server-status.cyberspace.app' });
    return {
        emitter,
        cleanup: () => emitter.destroy()
    };
}

export default function ServerStatusThread({ title }) {
    const containerRef = useRef(null);

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
                    isDebug={isDebug}
                    createSource={createThreadSource}
                />
            </Canvas>
        </Example>
    );
}
