import { EventEmitter } from '@lib/three.js';

import { ServerStatusScene } from './server-status/ServerStatusScene.jsx';

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
    return <ServerStatusScene title={title} createSource={createThreadSource} />;
}
