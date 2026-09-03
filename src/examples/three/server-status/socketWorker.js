/**
 * Bundler-friendly Vite module worker — equivalent of the space.js Thread approach
 * in the original 3d_server_status_thread.html, but importable as a real ES module.
 *
 * Protocol (matches space.js Thread):
 *   main  → worker: postMessage({ message: { fn, ...args } })
 *   worker → main:  postMessage({ event, message })         (event dispatch)
 *   worker → main:  postMessage({ id, message })            (RPC reply)
 */

import { Socket } from './socket.js';

class SocketThread {
    constructor() {
        self.addEventListener('message', ({ data }) => {
            const { fn } = data.message || {};
            if (fn && typeof this[fn] === 'function') {
                this[fn](data.message);
            }
        });
    }

    init = ({ server }) => {
        this.socket = new Socket(server);
        this.socket.on('open', () => self.postMessage({ event: 'open' }));
        this.socket.on('close', () => self.postMessage({ event: 'close' }));
        this.socket.on('details', e => self.postMessage({ event: 'details', message: e }));
        this.socket.on('data', e => self.postMessage({ event: 'data', message: e }));
        this.socket.on('status', e => self.postMessage({ event: 'status', message: e }));
    };

    getPeaks = ({ name, threshold, id }) => {
        self.postMessage({ id, message: this.socket.getPeaks?.(name, threshold) });
    };
}

new SocketThread();
