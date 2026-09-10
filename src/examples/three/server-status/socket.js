/**
 * Socket — WebSocket client that emits 'details', 'data', and 'status' events.
 * Uses only setTimeout (not space.js delayedCall/ticker) so it works both in
 * the main thread and inside Vite module workers where the ticker is not running.
 */

import { EventEmitter, average } from '@lib/three.js';
import { GraphData, TimestampData } from './data.js';
import { Utils } from './utils.js';

export class Socket extends EventEmitter {
    // Optional serverUrl: when supplied, connect to that host instead of
    // deriving the URL from location (used by the Thread / worker variant).
    constructor(serverUrl) {
        super();

        this.latencyArray = [];
        this._reconnectTimer = null;
        this._statusTimer = null;
        this.ws = null;
        this._serverUrl = serverUrl || null;

        this._connect();
    }

    _connect() {
        let url;
        if (this._serverUrl) {
            url = this._serverUrl;
        } else {
            const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = location.hostname;
            const port = location.port ? `:${location.port}` : '';
            url = `${protocol}//${host}${port}/status`;
        }

        try {
            this.ws = new WebSocket(url);
        } catch {
            this._fallback();
            return;
        }

        this.ws.addEventListener('open', this._onOpen);
        this.ws.addEventListener('message', this._onMessage);
        this.ws.addEventListener('error', this._onError);
        this.ws.addEventListener('close', this._onClose);
    }

    _onOpen = () => {
        clearTimeout(this._reconnectTimer);
        this._reconnectTimer = null;
    };

    _onMessage = ({ data: raw }) => {
        let msg;
        try {
            msg = JSON.parse(raw);
        } catch {
            return;
        }

        const { type, data } = msg;
        if (type === 'details') {
            this._handleDetails(data);
        } else if (type === 'data') {
            this._handleData(data);
        } else if (type === 'status') {
            this._handleStatus(data);
        }
    };

    _onError = () => {
        this._fallback();
    };

    _onClose = () => {
        this._reconnectTimer = setTimeout(() => this._connect(), 5000);
    };

    // ------------------------------------------------------------------
    // Fallback demo data (used when WebSocket server is not available)
    // ------------------------------------------------------------------

    _fallback() {
        const now = Date.now();
        const smallLen = 12;
        const largeLen = 90;

        const buildTimestamps = () => {
            const interval = 60000;
            const small = [];
            const large = [];
            for (let i = smallLen; i >= 0; i--) small.push(now - i * interval);
            for (let i = largeLen; i >= 0; i--) large.push(now - i * interval * 12);
            return { smallArray: small, largeArray: large, markersArray: [], labelsArray: [] };
        };

        const buildValues = fn => {
            const realtimeArray = Array.from({ length: 10 }, (_, i) => fn(i, 10));
            const realtimeGhostArray = [...realtimeArray];
            const smallArray = Array.from({ length: smallLen }, (_, i) => fn(i, smallLen));
            const smallGhostArray = [...smallArray];
            const largeArray = Array.from({ length: largeLen }, (_, i) => fn(i, largeLen));
            const largeGhostArray = [...largeArray];
            return { realtimeArray, realtimeGhostArray, smallArray, smallGhostArray, largeArray, largeGhostArray };
        };

        const uptime = Utils.formatInfoSeconds(Math.floor(Math.random() * 86400 * 10));
        const startedAt = now - Math.floor(Math.random() * 86400 * 10) * 1000;

        this.emit('details', {
            projectDomain: 'localhost',
            networkName: 'Local Network (127.0.0.1)',
            networkOrg: 'Development',
            serverVersion: 'Node.js v18.0.0',
            restartTime: now - 86400000,
            serverUptime: uptime,
            memUsed: '512 MB',
            memTotal: '2048 MB',
            memUsedPercentage: 25,
            swapUsed: '0 MB',
            swapTotal: '512 MB',
            swapUsedPercentage: 0,
            storageUsed: '10 GB',
            storageTotal: '50 GB',
            storageUsedPercentage: 20,
            processorName: 'Intel Core i7',
            numProcessingUnits: 4
        });

        this.emit('data', {
            timestampData: buildTimestamps(),
            latencyAvgData: buildValues((i, n) => Math.round(20 + Math.sin(i / n * Math.PI * 2) * 10)),
            loadAvgData: buildValues((i, n) => Math.round(40 + Math.sin(i / n * Math.PI * 4) * 20)),
            clientsData: buildValues((i, n) => Math.round(1 + Math.abs(Math.sin(i / n * Math.PI)) * 3))
        });

        const sendStatus = () => {
            if (!this._statusTimer) return; // destroyed

            const latency = Math.round(20 + Math.random() * 30);
            this.latencyArray.push(latency);
            if (this.latencyArray.length > 10) this.latencyArray.shift();
            const latencyAvg = Math.round(average(this.latencyArray));
            const elapsed = Math.floor((Date.now() - startedAt) / 1000);

            this.emit('status', {
                currentTime: Date.now(),
                serverUptime: Utils.formatInfoSeconds(elapsed),
                latency,
                latencyAvg,
                loadAvg: Math.round(40 + Math.sin(Date.now() / 10000) * 20),
                numClients: Math.round(2 + Math.random() * 2)
            });

            this._statusTimer = setTimeout(sendStatus, 2000);
        };

        // Start sentinel so sendStatus knows it's alive
        this._statusTimer = setTimeout(sendStatus, 1000);
    }

    // ------------------------------------------------------------------
    // Real WebSocket message handlers
    // ------------------------------------------------------------------

    _handleDetails(raw) {
        const restartTime = raw.restartTime ? new Date(raw.restartTime).getTime() : 0;
        const serverUptime = Utils.formatInfoSeconds(raw.uptime || 0);

        const memUsed = Utils.formatBytes(raw.memUsed || 0);
        const memTotal = Utils.formatBytes(raw.memTotal || 0);
        const memUsedPercentage = Math.round(((raw.memUsed || 0) / (raw.memTotal || 1)) * 100);

        const swapUsed = Utils.formatBytes(raw.swapUsed || 0);
        const swapTotal = Utils.formatBytes(raw.swapTotal || 0);
        const swapUsedPercentage = Math.round(((raw.swapUsed || 0) / (raw.swapTotal || 1)) * 100);

        const storageUsed = Utils.formatBytes(raw.storageUsed || 0);
        const storageTotal = Utils.formatBytes(raw.storageTotal || 0);
        const storageUsedPercentage = Math.round(((raw.storageUsed || 0) / (raw.storageTotal || 1)) * 100);

        this.emit('details', {
            projectDomain: raw.projectDomain || '',
            networkName: raw.networkName || '',
            networkOrg: raw.networkOrg || '',
            serverVersion: raw.serverVersion || '',
            restartTime,
            serverUptime,
            memUsed,
            memTotal,
            memUsedPercentage,
            swapUsed,
            swapTotal,
            swapUsedPercentage,
            storageUsed,
            storageTotal,
            storageUsedPercentage,
            processorName: raw.processorName || '',
            numProcessingUnits: raw.numProcessingUnits || 0
        });
    }

    _handleData(raw) {
        const make = src => {
            const g = new GraphData();
            if (src) {
                g.setArrays({
                    realtimeArray: src.realtimeArray || [],
                    realtimeGhostArray: src.realtimeGhostArray || [],
                    smallArray: src.smallArray || [],
                    smallGhostArray: src.smallGhostArray || [],
                    largeArray: src.largeArray || [],
                    largeGhostArray: src.largeGhostArray || []
                });
            }
            return g;
        };

        const timestampData = new TimestampData();
        if (raw.timestampHistory) {
            timestampData.setArrays({
                smallArray: raw.timestampHistory.smallArray || [],
                largeArray: raw.timestampHistory.largeArray || [],
                markersArray: raw.timestampHistory.markersArray || [],
                labelsArray: raw.timestampHistory.labelsArray || []
            });
        }

        this.emit('data', {
            timestampData,
            latencyAvgData: make(raw.latencyAvgHistory),
            loadAvgData: make(raw.loadAvgHistory),
            clientsData: make(raw.clientsHistory)
        });
    }

    _handleStatus(raw) {
        const latency = raw.latency || 0;
        this.latencyArray.push(latency);
        if (this.latencyArray.length > 10) this.latencyArray.shift();
        const latencyAvg = Math.round(average(this.latencyArray));

        this.emit('status', {
            currentTime: raw.currentTime || Date.now(),
            serverUptime: Utils.formatInfoSeconds(raw.uptime || 0),
            latency,
            latencyAvg,
            loadAvg: raw.loadAvg || 0,
            numClients: raw.numClients || 0
        });
    }

    destroy() {
        clearTimeout(this._reconnectTimer);
        this._reconnectTimer = null;

        // Stop the fallback status loop
        clearTimeout(this._statusTimer);
        this._statusTimer = null;

        if (this.ws) {
            this.ws.removeEventListener('open', this._onOpen);
            this.ws.removeEventListener('message', this._onMessage);
            this.ws.removeEventListener('error', this._onError);
            this.ws.removeEventListener('close', this._onClose);
            this.ws.close();
            this.ws = null;
        }
    }
}
