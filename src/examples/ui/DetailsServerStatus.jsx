import { useEffect, useRef, useState } from 'react';

import { EventEmitter, average, delayedCall, median } from '@lib/index.js';

import { Example } from '@/components';
import { useClassName } from '@/hooks';
import { UI } from '@/space/index.js';

// ─── Utilities ────────────────────────────────────────────────────────────────

class Utils {
    // https://stackoverflow.com/questions/36098913/convert-seconds-to-days-hours-minutes-and-seconds/52387803#52387803
    static formatSeconds(seconds) {
        seconds = Number(seconds);

        const d = Math.floor(seconds / 86400);
        const h = Math.floor(seconds % 86400 / 3600);
        const m = Math.floor(seconds % 3600 / 60);
        const s = Math.floor(seconds % 60);

        const daysFormatted = d > 0 ? `${d}${(d === 1 ? ' day ' : ' days ')}` : '';
        const hoursFormatted = h > 0 ? `${h}${(h === 1 ? ' hour ' : ' hours ')}` : '';
        const minutesFormatted = m > 0 ? `${m}${(m === 1 ? ' minute ' : ' minutes ')}` : '';
        const secondsFormatted = `${s}${(s === 1 ? ' second' : ' seconds')}`;

        return `${daysFormatted}${hoursFormatted}${minutesFormatted}${secondsFormatted}`;
    }

    // https://stackoverflow.com/questions/32054170/how-to-resize-an-array/32055229#32055229
    static backfill(array, size, value) {
        return [...Array(Math.max(0, size - array.length)).fill(value), ...array];
    }
}

// ─── Socket ────────────────────────────────────────────────────────────────────
// Framework-agnostic WebSocket wrapper. Emits 'details', 'array' and 'status'.

class Socket extends EventEmitter {
    constructor(server) {
        super();

        this.server = server;
        this.connected = false;
        this.destroyed = false;

        this.latencyArray = [];

        this.ghostArray = [];
        this.array = [];

        this.chunkSize = 10;

        this.connect();
    }

    addListeners() {
        this.socket.addEventListener('open', this.onOpen);
        this.socket.addEventListener('close', this.onClose);
        this.socket.addEventListener('message', this.onMessage);
    }

    removeListeners() {
        this.socket.removeEventListener('open', this.onOpen);
        this.socket.removeEventListener('close', this.onClose);
        this.socket.removeEventListener('message', this.onMessage);
    }

    onOpen = () => {
        this.connected = true;

        const event = 'subscribe';
        const message = {
            subscription: {
                name: 'status',
                time: 86400
            }
        };

        console.log('send', event, message);
        this.send({ event, message });
    };

    onClose = () => {
        console.log('close');
        this.connected = false;

        if (!this.destroyed) {
            delayedCall(250, this.connect);
        }
    };

    onMessage = ({ data }) => {
        const { event, message } = JSON.parse(data);
        console.log('message', event, message);

        switch (event) {
            case 'heartbeat':
                this.send({ event, message });
                break;
            case 'details': {
                const { details, serverUptime } = message;

                const {
                    projectDomain,
                    networkName,
                    networkOrg,
                    serverVersion,
                    memTotal,
                    memFree,
                    swapTotal,
                    swapFree,
                    storageTotal,
                    storageAvailable,
                    processorName,
                    numProcessingUnits
                } = details;

                const serverUptimeFormatted = Utils.formatSeconds(serverUptime);

                const memUsed = memTotal - memFree;
                let memUsedFormatted = memUsed / 1024 / 1024 / 1024;
                memUsedFormatted = `${Math.round((memUsedFormatted + Number.EPSILON) * 100) / 100} GiB`;
                let memTotalFormatted = memTotal / 1024 / 1024 / 1024;
                memTotalFormatted = `${Math.round((memTotalFormatted + Number.EPSILON) * 100) / 100} GiB`;
                let memUsedPercentage = (memUsed / memTotal) * 100;
                memUsedPercentage = Math.round((memUsedPercentage + Number.EPSILON) * 100) / 100;

                const swapUsed = swapTotal - swapFree;
                let swapUsedFormatted = swapUsed / 1024 / 1024 / 1024;
                swapUsedFormatted = `${Math.round((swapUsedFormatted + Number.EPSILON) * 100) / 100} GiB`;
                let swapTotalFormatted = swapTotal / 1024 / 1024 / 1024;
                swapTotalFormatted = `${Math.round((swapTotalFormatted + Number.EPSILON) * 100) / 100} GiB`;

                let swapUsedPercentage;
                if (swapUsed) {
                    swapUsedPercentage = (swapUsed / swapTotal) * 100;
                    swapUsedPercentage = Math.round((swapUsedPercentage + Number.EPSILON) * 100) / 100;
                } else {
                    swapUsedPercentage = 0;
                    swapUsedPercentage = Math.round((swapUsedPercentage + Number.EPSILON) * 100) / 100;
                }

                const storageUsed = storageTotal - storageAvailable;
                let storageUsedFormatted;
                let storageTotalFormatted;

                if (storageTotal < 1e9) {
                    storageUsedFormatted = storageUsed / 1024 / 1024;
                    storageUsedFormatted = `${Math.round((storageUsedFormatted + Number.EPSILON) * 100) / 100} MB`;
                    storageTotalFormatted = storageTotal / 1024 / 1024;
                    storageTotalFormatted = `${Math.round((storageTotalFormatted + Number.EPSILON) * 100) / 100} MB`;
                } else {
                    storageUsedFormatted = storageUsed / 1024 / 1024 / 1024;
                    storageUsedFormatted = `${Math.round((storageUsedFormatted + Number.EPSILON) * 100) / 100} GB`;
                    storageTotalFormatted = storageTotal / 1024 / 1024 / 1024;
                    storageTotalFormatted = `${Math.round((storageTotalFormatted + Number.EPSILON) * 100) / 100} GB`;
                }

                let storageUsedPercentage = (storageUsed / storageTotal) * 100;
                storageUsedPercentage = Math.round((storageUsedPercentage + Number.EPSILON) * 100) / 100;

                this.emit('details', {
                    projectDomain,
                    networkName,
                    networkOrg,
                    serverVersion,
                    serverUptime: serverUptimeFormatted,
                    memUsed: memUsedFormatted,
                    memTotal: memTotalFormatted,
                    memUsedPercentage,
                    swapUsed: swapUsedFormatted,
                    swapTotal: swapTotalFormatted,
                    swapUsedPercentage,
                    storageUsed: storageUsedFormatted,
                    storageTotal: storageTotalFormatted,
                    storageUsedPercentage,
                    processorName,
                    numProcessingUnits
                });
                break;
            }
            case 'status': {
                const { status, serverUptime, latency } = message;

                let data = status;

                if (data.length > 3) {
                    const last = data.pop();

                    data = data.slice(-240).map(d => d[1] * 100);

                    const realtimeArray = data.slice(-20);

                    const array = [];
                    const chunkSize = this.chunkSize;

                    for (let i = 0, l = data.length; i < l; i += chunkSize) {
                        array.push(median(data.slice(i, i + chunkSize)));
                    }

                    this.array = array.splice(-12, 12);
                    if (this.array.length < 12) {
                        this.array = Utils.backfill(this.array, 12, this.array[0] || 0);
                    }

                    this.ghostArray = array.splice(-12, 12);
                    if (this.ghostArray.length < 12) {
                        this.ghostArray = Utils.backfill(this.ghostArray, 12, this.ghostArray[0] || 0);
                    }

                    this.ghostArray.push(...realtimeArray.slice(0, 10));
                    this.array.push(...realtimeArray.slice(-10));

                    array.length = 0;

                    this.emit('array', {
                        ghostArray: this.ghostArray,
                        array: this.array
                    });

                    data = last;
                }

                if (latency !== undefined) {
                    this.latencyArray.push(latency);
                }

                const currentTime = data[0];
                const serverUptimeFormatted = Utils.formatSeconds(serverUptime);

                let latencyAvg;
                if (this.latencyArray.length) {
                    latencyAvg = Math.round(average(this.latencyArray));
                }

                let loadAvg = data[1] * 100;
                loadAvg = Math.round(loadAvg);

                const numClients = data[2];

                this.emit('status', {
                    currentTime,
                    serverUptime: serverUptimeFormatted,
                    latency,
                    latencyAvg,
                    loadAvg,
                    numClients
                });
                break;
            }
        }
    };

    send = data => {
        if (!this.connected) {
            return;
        }

        this.socket.send(JSON.stringify(data));
    };

    connect = () => {
        if (this.destroyed) {
            return;
        }

        if (this.socket) {
            this.close();
        }

        this.socket = new WebSocket(this.server, ['permessage-deflate']);
        this.addListeners();
    };

    close = () => {
        this.removeListeners();
        this.socket.close();
    };

    destroy = () => {
        this.destroyed = true;
        this.close();
    };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DetailsServerStatusExample({ title }) {
    // `scroll` class on <html> lets the body scroll (mirrors body { position: unset })
    useClassName('scroll');

    const uiRef = useRef(null);

    // Server data state. null = not yet connected; object = initial details received.
    // Live status updates (uptime, latency, load, clients) are stored in refs so
    // the graph/meter callbacks can read the latest values each frame without
    // triggering a full re-render. Text values that need to appear in the Details
    // content are stored separately and merged into the details data on each
    // status update.
    const [serverDetails, setServerDetails] = useState(null);
    const liveRef = useRef({
        serverUptime: '',
        latency: 0,
        latencyAvg: 0,
        latencyAvgText: '0ms (avg)',
        loadAvg: 0,
        loadAvgText: '0% (1min avg)',
        numClients: '',
        ghostArray: [],
        array: []
    });

    useEffect(() => {
        const socket = new Socket('wss://hello-websockets-server-status.cyberspace.app');
        let chunkSize = 10;
        let realtimeCounter = 0;

        const onServerDetails = details => {
            setServerDetails(details);
        };

        const onServerArray = ({ ghostArray, array }) => {
            liveRef.current.ghostArray = ghostArray;
            liveRef.current.array = array;
        };

        const onServerStatus = ({ serverUptime, latency, latencyAvg, loadAvg, numClients }) => {
            const live = liveRef.current;

            if (serverUptime !== undefined) live.serverUptime = serverUptime;
            if (latency !== undefined) live.latency = latency;
            if (latencyAvg !== undefined) {
                live.latencyAvg = latencyAvg;
                live.latencyAvgText = `${latencyAvg}ms (avg)`;
            }
            if (loadAvg !== undefined) {
                live.loadAvg = loadAvg;
                live.loadAvgText = `${loadAvg}% (1min avg)`;

                if (live.array.length) {
                    const realtimeGhostArray = live.ghostArray.slice(-10);
                    const realtimeArray = live.array.slice(-10);
                    const realtimeGhost = realtimeArray.shift();
                    realtimeArray.push(loadAvg);
                    realtimeGhostArray.shift();
                    realtimeGhostArray.push(realtimeGhost);
                    live.ghostArray.splice(-10, 10, ...realtimeGhostArray);
                    live.array.splice(-10, 10, ...realtimeArray);

                    if (++realtimeCounter === chunkSize) {
                        const value = median(realtimeArray);
                        const ga = live.ghostArray.slice(0, 12);
                        const a = live.array.slice(0, 12);
                        const ghost = a.shift();
                        a.push(value);
                        ga.shift();
                        ga.push(ghost);
                        live.ghostArray.splice(0, 12, ...ga);
                        live.array.splice(0, 12, ...a);
                        realtimeCounter = 0;
                    }
                }
            }
            if (numClients !== undefined) live.numClients = numClients;
        };

        socket.on('details', onServerDetails);
        socket.on('array', onServerArray);
        socket.on('status', onServerStatus);

        return () => {
            socket.destroy();
        };
    }, []);

    // Open details panel when UI first mounts (mirrors ui.toggleDetails(true))
    const prevDetailsRef = useRef(null);
    useEffect(() => {
        if (serverDetails && serverDetails !== prevDetailsRef.current) {
            prevDetailsRef.current = serverDetails;
            uiRef.current?.animateIn();
            uiRef.current?.toggleDetails(true);
        }
    }, [serverDetails]);

    if (!serverDetails) {
        // Not yet connected — render empty page matching the original failure state
        return <Example title={title} />;
    }

    const {
        projectDomain,
        networkName,
        networkOrg,
        serverVersion,
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
        processorName,
        numProcessingUnits
    } = serverDetails;

    const live = liveRef.current;

    const details = {
        title: 'server-status'.replace(/[\s.-]+/g, '_'),
        content: [
            {
                content: '<p>A simple status API endpoint built on Express, like the Apache status page.</p>',
                links: [
                    {
                        title: 'Source code',
                        link: 'https://github.com/pschroen/hello-websockets-server-status'
                    }
                ],
                width: '100%'
            },
            {
                group: [
                    { title: 'Server version', content: serverVersion, width: 110 },
                    { title: 'Uptime', content: live.serverUptime || serverUptime, width: 200 },
                    {
                        title: 'Latency',
                        meter: { suffix: 'ms', range: 150, value: live.latency, width: 70, noRange: true },
                        width: 70
                    }
                ]
            },
            {
                group: [
                    {
                        title: 'Network',
                        content: `${projectDomain}<br>${networkName}<br>${networkOrg}`,
                        width: 330
                    },
                    { title: 'Clients', content: `${live.numClients}`, width: 70 }
                ]
            },
            {
                group: [
                    {
                        title: 'Latency',
                        content: live.latencyAvgText,
                        width: 200,
                        meter: { range: 300, value: live.latencyAvg, width: 200, ghost: true, noText: true }
                    },
                    {
                        title: '',
                        graph: {
                            suffix: 'ms',
                            resolution: 160,
                            range: 300,
                            width: 200,
                            height: 48,
                            ghost: true,
                            noMarker: true,
                            callback: () => live.latency
                        }
                    }
                ]
            },
            {
                group: [
                    { title: 'Processor', content: processorName, width: 330 },
                    { title: 'vCPUs', content: numProcessingUnits, width: 70 }
                ]
            },
            {
                group: [
                    {
                        title: 'Load',
                        content: live.loadAvgText,
                        width: 200,
                        meter: { range: 400, value: live.loadAvg, width: 200, ghost: true, noText: true }
                    },
                    {
                        title: '',
                        graph: {
                            suffix: '%',
                            resolution: 22,
                            lookupPrecision: [100, 0],
                            segments: [12, 10],
                            ratio: [0.9, 0.1],
                            range: 400,
                            width: 200,
                            height: 48,
                            noMarker: true,
                            value: [...live.ghostArray, ...live.array]
                        }
                    }
                ]
            },
            {
                group: [
                    {
                        title: 'Mem',
                        content: `${memUsed} / ${memTotal} (${memUsedPercentage}%)`,
                        width: 200,
                        meter: { range: 100, value: memUsedPercentage, width: 200, noText: true }
                    },
                    {
                        title: 'Swap',
                        content: `${swapUsed} / ${swapTotal} (${swapUsedPercentage}%)`,
                        width: 200,
                        meter: { range: 100, value: swapUsedPercentage, width: 200, noText: true }
                    }
                ]
            },
            {
                group: [
                    {
                        title: 'Storage',
                        content: `${storageUsed} / ${storageTotal} (${storageUsedPercentage}%)`,
                        width: 200,
                        meter: { range: 100, value: storageUsedPercentage, width: 200, noText: true }
                    }
                ]
            }
        ]
    };

    return (
        <Example title={title}>
            <UI details={details} ref={uiRef} />
        </Example>
    );
}
