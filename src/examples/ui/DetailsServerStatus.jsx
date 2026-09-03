import { useEffect, useRef } from 'react';

import { EventEmitter, UI, average, delayedCall, median, ticker } from '@lib/index.js';

import { Example } from '@/components';
import { useClassName } from '@/hooks';

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

class Socket extends EventEmitter {
    constructor(server) {
        super();

        this.server = server;

        this.connected = false;

        // Latency average
        this.latencyArray = [];

        // Load average
        this.ghostArray = [];
        this.array = [];

        // Median downsample
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

    // Event handlers

    onOpen = () => {
        this.connected = true;

        const event = 'subscribe';
        const message = {
            subscription: {
                name: 'status',
                time: 86400 // Past day in seconds
            }
        };

        console.log('send', event, message);
        this.send({ event, message });
    };

    onClose = () => {
        console.log('close');
        this.connected = false;

        delayedCall(250, this.connect);
    };

    onMessage = ({ data }) => {
        const { event, message } = JSON.parse(data);
        console.log('message', event, message);

        switch (event) {
            case 'heartbeat':
                this.send({ event, message });
                break;
            case 'details': {
                const { details, serverUptime/* , latency */ } = message;

                const {
                    // packageVersion,
                    projectDomain,
                    networkName,
                    networkOrg,
                    serverVersion,
                    // restartTime,
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

                // Initial data dump
                if (data.length > 3) {
                    // Separate last status update as new update
                    const last = data.pop();

                    // Last 240 status updates for load average graph (120 + 120, ghost + array)
                    data = data.slice(-240).map(data => data[1] * 100); // percentage

                    // Last 20 status updates for realtime graph (10 + 10, ghost + array)
                    const realtimeArray = data.slice(-20);

                    // Median downsample
                    const array = [];
                    const chunkSize = this.chunkSize;

                    for (let i = 0, l = data.length; i < l; i += chunkSize) {
                        array.push(median(data.slice(i, i + chunkSize)));
                    }

                    // Last 240 status updates downsampled to 24 (12 + 12, ghost + array)
                    this.array = array.splice(-12, 12);

                    if (this.array.length < 12) {
                        this.array = Utils.backfill(this.array, 12, this.array[0] || 0);
                    }

                    this.ghostArray = array.splice(-12, 12);

                    if (this.ghostArray.length < 12) {
                        this.ghostArray = Utils.backfill(this.ghostArray, 12, this.ghostArray[0] || 0);
                    }

                    // Re-add realtime data to the end of each array
                    this.ghostArray.push(...realtimeArray.slice(0, 10));
                    this.array.push(...realtimeArray.slice(-10));

                    // Cleanup
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

                const currentTime = data[0]; // seconds
                const serverUptimeFormatted = Utils.formatSeconds(serverUptime);

                let latencyAvg;

                if (this.latencyArray.length) {
                    latencyAvg = Math.round(average(this.latencyArray));
                }

                let loadAvg = data[1] * 100; // percentage
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

    // Public methods

    send = data => {
        if (!this.connected) {
            return;
        }

        this.socket.send(JSON.stringify(data));
    };

    connect = () => {
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
}

export default function DetailsServerStatusExample({ title }) {
    const ref = useRef(null);

    useClassName('scroll');

    useEffect(() => {
        const container = ref.current;

        // Median downsample
        const chunkSize = 10;
        let realtimeCounter = 0;

        // Load average graph
        let ghostArray = [];
        let array = [];

        let ui = null;

        const socket = new Socket('wss://hello-websockets-server-status.cyberspace.app');

        const onServerDetails = ({
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
        }) => {
            if (!ui) {
                ui = new UI({
                    details: {
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
                                    {
                                        title: 'Server version',
                                        content: serverVersion,
                                        width: 110
                                    },
                                    {
                                        title: 'Uptime',
                                        content: serverUptime,
                                        width: 200
                                    },
                                    {
                                        title: 'Latency',
                                        meter: {
                                            suffix: 'ms',
                                            range: 150,
                                            value: 0,
                                            width: 70,
                                            noRange: true
                                        },
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
                                    {
                                        title: 'Clients',
                                        content: '',
                                        width: 70
                                    }
                                ]
                            },
                            {
                                group: [
                                    {
                                        title: 'Latency',
                                        content: '0ms (avg)',
                                        width: 200,
                                        meter: {
                                            range: 300,
                                            value: 0,
                                            width: 200,
                                            ghost: true,
                                            noText: true
                                        }
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
                                            noMarker: true
                                        }
                                    }
                                ]
                            },
                            {
                                group: [
                                    {
                                        title: 'Processor',
                                        content: processorName,
                                        width: 330
                                    },
                                    {
                                        title: 'vCPUs',
                                        content: numProcessingUnits,
                                        width: 70
                                    }
                                ]
                            },
                            {
                                group: [
                                    {
                                        title: 'Load',
                                        content: '0% (1min avg)',
                                        width: 200,
                                        meter: {
                                            range: 400,
                                            value: 0,
                                            width: 200,
                                            ghost: true,
                                            noText: true
                                        }
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
                                            noMarker: true
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
                                        meter: {
                                            range: 100,
                                            value: memUsedPercentage,
                                            width: 200,
                                            noText: true
                                        }
                                    },
                                    {
                                        title: 'Swap',
                                        content: `${swapUsed} / ${swapTotal} (${swapUsedPercentage}%)`,
                                        width: 200,
                                        meter: {
                                            range: 100,
                                            value: swapUsedPercentage,
                                            width: 200,
                                            noText: true
                                        }
                                    }
                                ]
                            },
                            {
                                group: [
                                    {
                                        title: 'Storage',
                                        content: `${storageUsed} / ${storageTotal} (${storageUsedPercentage}%)`,
                                        width: 200,
                                        meter: {
                                            range: 100,
                                            value: storageUsedPercentage,
                                            width: 200,
                                            noText: true
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                });
                ui.css({ position: 'static' });
                ui.toggleDetails(true);
                ui.animateIn();
                container.appendChild(ui.element);

                ui.detailsUptime = ui.details.content[2].children[1];
                ui.detailsLatencyMeter = ui.details.content[3].children[1];

                ui.detailsNumClients = ui.details.content[5].children[1];

                ui.detailsLatencyAvg = ui.details.content[6].children[1];
                ui.detailsLatencyAvgMeter = ui.details.content[6].children[2];
                ui.detailsLatencyGraph = ui.details.content[7].children[1];

                ui.detailsLoadAvg = ui.details.content[10].children[1];
                ui.detailsLoadAvgMeter = ui.details.content[10].children[2];
                ui.detailsLoadAvgGraph = ui.details.content[11].children[1];

                ui.detailsMem = ui.details.content[12].children[1];
                ui.detailsMemMeter = ui.details.content[12].children[2];

                ui.detailsSwap = ui.details.content[13].children[1];
                ui.detailsSwapMeter = ui.details.content[13].children[2];

                ui.detailsStorage = ui.details.content[14].children[1];
                ui.detailsStorageMeter = ui.details.content[14].children[2];

                ticker.add(onUpdate);
                ticker.start();
            } else {
                ui.detailsMem.html(`${memUsed} / ${memTotal} (${memUsedPercentage}%)`);
                ui.detailsMemMeter.update(memUsedPercentage);

                ui.detailsSwap.html(`${swapUsed} / ${swapTotal} (${swapUsedPercentage}%)`);
                ui.detailsSwapMeter.update(swapUsedPercentage);

                ui.detailsStorage.html(`${storageUsed} / ${storageTotal} (${storageUsedPercentage}%)`);
                ui.detailsStorageMeter.update(storageUsedPercentage);
            }
        };

        const onServerArray = ({ ghostArray: ga, array: a }) => {
            ghostArray = ga;
            array = a;

            ui.detailsLoadAvgGraph.setGhostArray(ghostArray);
            ui.detailsLoadAvgGraph.setArray(array);
        };

        const onServerStatus = ({ serverUptime, latency, latencyAvg, loadAvg, numClients }) => {
            if (serverUptime !== undefined) {
                ui.detailsUptime.html(serverUptime);
            }

            if (latency !== undefined) {
                ui.detailsLatencyMeter.update(latency);
                ui.detailsLatencyGraph.update(latency);
            }

            if (latencyAvg !== undefined) {
                ui.detailsLatencyAvg.html(`${latencyAvg}ms (avg)`);
                ui.detailsLatencyAvgMeter.update(latencyAvg);
            }

            if (array && loadAvg !== undefined) {
                ui.detailsLoadAvg.html(`${loadAvg}% (1min avg)`);
                ui.detailsLoadAvgMeter.update(loadAvg);

                const realtimeGhostArray = ghostArray.slice(-10);
                const realtimeArray = array.slice(-10);
                const realtimeGhost = realtimeArray.shift();
                realtimeArray.push(loadAvg);
                realtimeGhostArray.shift();
                realtimeGhostArray.push(realtimeGhost);
                ui.detailsLoadAvgGraph.ghostArray.splice(-10, 10, ...realtimeGhostArray);
                ui.detailsLoadAvgGraph.array.splice(-10, 10, ...realtimeArray);
                ui.detailsLoadAvgGraph.needsUpdate = true;

                if (++realtimeCounter === chunkSize) {
                    // Median downsample
                    const value = median(realtimeArray);

                    const ga = ghostArray.slice(0, 12);
                    const a = array.slice(0, 12);
                    const ghost = a.shift();
                    a.push(value);
                    ga.shift();
                    ga.push(ghost);
                    ui.detailsLoadAvgGraph.ghostArray.splice(0, 12, ...ga);
                    ui.detailsLoadAvgGraph.array.splice(0, 12, ...a);
                    ui.detailsLoadAvgGraph.graphNeedsUpdate = true;

                    realtimeCounter = 0;
                }

                ui.detailsLoadAvgGraph.update();
            }

            if (numClients !== undefined) {
                ui.detailsNumClients.html(numClients);
            }
        };

        const onUpdate = () => {
            ui.update();
            ui.detailsLatencyGraph.update();
            ui.detailsLoadAvgGraph.update();
        };

        socket.on('details', onServerDetails);
        socket.on('array', onServerArray);
        socket.on('status', onServerStatus);

        return () => {
            ticker.remove(onUpdate);
            socket.close();
            if (ui) {
                ui.destroy();
            }
        };
    }, []);

    return <Example title={title} ref={ref} />;
}
