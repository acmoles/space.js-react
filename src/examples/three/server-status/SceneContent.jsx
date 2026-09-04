/**
 * Shared R3F scene component for both Server Status examples.
 *
 * Receives a `createSource` factory that returns `{ emitter, cleanup }`.
 * The emitter is an EventEmitter (Socket or Thread) that fires
 * 'details', 'data', and 'status' events.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useStore, useThree } from '@react-three/fiber';
import { MathUtils } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
    Panel,
    PanelItem,
    RadialGraphContainer,
    RadialGraphSegmentsCanvas,
    Stage,
    UI,
    clearTween,
    delayedCall,
    lerpCameras,
    ticker,
    tween
} from '@lib/three.js';

import { Point3D, Points3D, usePoint3DContext } from '../../../space/three/index.js';

import { Data } from './utils.js';
import { GraphData, TimestampData } from './data.js';

function resizeCameras(cameraCtrl, worldCamera, width, height) {
    cameraCtrl.offsetX = -width / 4;

    worldCamera.aspect = width / height;
    worldCamera.setViewOffset(
        width,
        height,
        cameraCtrl.camera === cameraCtrl.pointCamera ? cameraCtrl.offsetX : 0,
        0,
        width,
        height
    );
    worldCamera.updateProjectionMatrix();

    cameraCtrl.mapCamera.aspect = width / height;
    cameraCtrl.mapCamera.updateProjectionMatrix();

    cameraCtrl.pointCamera.aspect = width / height;
    cameraCtrl.pointCamera.updateProjectionMatrix();
}

function initPanel(ctrl, setPointConfig) {
    const { view, ui } = ctrl;
    const object = view;

    object.graph = new RadialGraphContainer({
        start: -45,
        graphHeight: 40
    });

    object.latencyAvgGraph = new RadialGraphSegmentsCanvas({
        start: -45,
        graphHeight: 40,
        resolution: 102,
        tension: 12,
        lookupPrecision: [25, 200],
        segments: [12, 90],
        ratio: [0.125, 0.875],
        labels: ['', '12hrs'],
        range: 300,
        suffix: 'ms',
        hoverLabels: true,
        noMarkerDrag: true
    });
    object.graph.add(object.latencyAvgGraph);

    object.loadAvgGraph = new RadialGraphSegmentsCanvas({
        start: -45,
        graphHeight: 40,
        resolution: 102,
        tension: 6,
        lookupPrecision: [25, 200],
        segments: [12, 90],
        ratio: [0.125, 0.875],
        labels: ['', '12hrs'],
        range: 400,
        suffix: '%',
        hoverLabels: true,
        noMarkerDrag: true
    });
    object.graph.add(object.loadAvgGraph);

    object.clientsGraph = new RadialGraphSegmentsCanvas({
        start: -45,
        graphHeight: 40,
        resolution: 102,
        tension: 12,
        lookupPrecision: [25, 200],
        segments: [12, 90],
        ratio: [0.125, 0.875],
        labels: ['', '12hrs'],
        range: 10,
        hoverLabels: true,
        noMarkerDrag: true
    });
    object.graph.add(object.clientsGraph);

    object.graph.setIndex(1);

    const graphOptions = new Map([
        ['Latency', 0],
        ['Load', 1],
        ['Clients', 2]
    ]);

    const items = [
        {
            type: 'divider'
        },
        {
            type: 'list',
            name: 'Graph',
            list: graphOptions,
            value: 'Load',
            callback: value => {
                object.graph.setIndex(graphOptions.get(value));
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'link',
            value: 'Details',
            callback: (value, item) => {
                clearTween(ctrl.scenePanelCtrlTimeout);

                ui.toggleDetails(!ui.details.animatedIn);
                object.point?.animateOut(true);
                object.point?.deactivate();

                ctrl.scenePanelCtrlTimeout = delayedCall(300, () => {
                    item.setValue(ui.details.animatedIn ? 'Map' : 'Details', false);
                });
            }
        }
    ];

    const panel = new Panel();

    items.forEach(data => {
        panel.add(new PanelItem(data));
    });

    object.panel = panel;

    setPointConfig({
        graph: object.graph,
        name: Data.getName(),
        panel,
        type: Data.getType()
    });
}

function handleDetails({
    projectDomain,
    networkName,
    networkOrg,
    serverVersion,
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
    processorName,
    numProcessingUnits
}, ctrl, container, setPointConfig, setDividerSnap) {
    ctrl.restartTime = restartTime;

    if (!ctrl.ui) {
        const ui = new UI({
            fps: true,
            detailsButton: true,
            details: {
                dividerLine: true,
                width: 'max(50vw, 250px)',
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
        ui.details.css({ minWidth: 220 });
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

        ctrl.ui = ui;

        Data.init({ projectDomain, networkName });
        initPanel(ctrl, setPointConfig);
        setDividerSnap(ui.details.dividerLine);

        Stage.events.emit('start');
        window.addEventListener('keyup', ctrl.onKeyUp);
    } else {
        ctrl.ui.detailsMem.html(`${memUsed} / ${memTotal} (${memUsedPercentage}%)`);
        ctrl.ui.detailsMemMeter.update(memUsedPercentage);
        ctrl.ui.detailsSwap.html(`${swapUsed} / ${swapTotal} (${swapUsedPercentage}%)`);
        ctrl.ui.detailsSwapMeter.update(swapUsedPercentage);
        ctrl.ui.detailsStorage.html(`${storageUsed} / ${storageTotal} (${storageUsedPercentage}%)`);
        ctrl.ui.detailsStorageMeter.update(storageUsedPercentage);
    }
}

function handleData({ timestampData, latencyAvgData, loadAvgData, clientsData }, ctrl) {
    ctrl.timestampData = new TimestampData();
    ctrl.timestampData.setArrays(timestampData);
    ctrl.timestampData.addMarker([ctrl.restartTime, 'Restart']);

    ctrl.latencyAvgData = new GraphData();
    ctrl.latencyAvgData.setArrays(latencyAvgData);

    const latencyAvgMax = Math.max(300, ctrl.latencyAvgData.getMax());

    ctrl.view.latencyAvgGraph.setGhostArray([...ctrl.latencyAvgData.smallGhostArrayReversed, ...ctrl.latencyAvgData.largeGhostArrayReversed]);
    ctrl.view.latencyAvgGraph.setArray([...ctrl.latencyAvgData.smallArrayReversed, ...ctrl.latencyAvgData.largeArrayReversed]);
    ctrl.view.latencyAvgGraph.setRange(latencyAvgMax);

    ctrl.loadAvgData = new GraphData();
    ctrl.loadAvgData.setArrays(loadAvgData);

    const loadAvgMax = Math.max(400, ctrl.loadAvgData.getMax());

    ctrl.ui.detailsLoadAvgGraph.setGhostArray([...ctrl.loadAvgData.smallGhostArray, ...ctrl.loadAvgData.realtimeGhostArray]);
    ctrl.ui.detailsLoadAvgGraph.setArray([...ctrl.loadAvgData.smallArray, ...ctrl.loadAvgData.realtimeArray]);
    ctrl.ui.detailsLoadAvgGraph.setRange(loadAvgMax);

    ctrl.view.loadAvgGraph.setGhostArray([...ctrl.loadAvgData.smallGhostArrayReversed, ...ctrl.loadAvgData.largeGhostArrayReversed]);
    ctrl.view.loadAvgGraph.setArray([...ctrl.loadAvgData.smallArrayReversed, ...ctrl.loadAvgData.largeArrayReversed]);
    ctrl.view.loadAvgGraph.setRange(loadAvgMax);

    ctrl.clientsData = new GraphData();
    ctrl.clientsData.setArrays(clientsData);

    const clientsMax = Math.max(10, ctrl.clientsData.getMax());

    ctrl.view.clientsGraph.setGhostArray([...ctrl.clientsData.smallGhostArrayReversed, ...ctrl.clientsData.largeGhostArrayReversed]);
    ctrl.view.clientsGraph.setArray([...ctrl.clientsData.smallArrayReversed, ...ctrl.clientsData.largeArrayReversed]);
    ctrl.view.clientsGraph.setRange(clientsMax);

    refresh(ctrl);
}

function handleStatus({ currentTime, serverUptime, latency, latencyAvg, loadAvg, numClients }, ctrl) {
    if (ctrl.timestampData && currentTime !== undefined) {
        ctrl.timestampData.update(currentTime);

        if (ctrl.timestampData.largeCounter === 0) {
            refresh(ctrl);
        }
    }

    if (serverUptime !== undefined) {
        ctrl.ui.detailsUptime.html(serverUptime);
    }

    if (latency !== undefined) {
        ctrl.ui.detailsLatencyMeter.update(latency);
        ctrl.ui.detailsLatencyGraph.update(latency);
    }

    if (ctrl.latencyAvgData && latencyAvg !== undefined) {
        ctrl.ui.detailsLatencyAvg.html(`${latencyAvg}ms (avg)`);
        ctrl.ui.detailsLatencyAvgMeter.update(latencyAvg);

        ctrl.latencyAvgData.update(latencyAvg);

        if (ctrl.latencyAvgData.smallCounter === 0) {
            ctrl.view.latencyAvgGraph.ghostArray.splice(0, 12, ...ctrl.latencyAvgData.smallGhostArrayReversed);
            ctrl.view.latencyAvgGraph.array.splice(0, 12, ...ctrl.latencyAvgData.smallArrayReversed);
            ctrl.view.latencyAvgGraph.needsUpdate = true;
            ctrl.view.latencyAvgGraph.graphNeedsUpdate = true;
        }

        if (ctrl.latencyAvgData.largeCounter === 0) {
            ctrl.view.latencyAvgGraph.ghostArray.splice(-90, 90, ...ctrl.latencyAvgData.largeGhostArrayReversed);
            ctrl.view.latencyAvgGraph.array.splice(-90, 90, ...ctrl.latencyAvgData.largeArrayReversed);
            ctrl.view.latencyAvgGraph.needsUpdate = true;
            ctrl.view.latencyAvgGraph.graphNeedsUpdate = true;
        }
    }

    if (ctrl.loadAvgData && loadAvg !== undefined) {
        ctrl.ui.detailsLoadAvg.html(`${loadAvg}% (1min avg)`);
        ctrl.ui.detailsLoadAvgMeter.update(loadAvg);

        ctrl.loadAvgData.update(loadAvg);

        ctrl.ui.detailsLoadAvgGraph.ghostArray.splice(-10, 10, ...ctrl.loadAvgData.realtimeGhostArray);
        ctrl.ui.detailsLoadAvgGraph.array.splice(-10, 10, ...ctrl.loadAvgData.realtimeArray);
        ctrl.ui.detailsLoadAvgGraph.needsUpdate = true;

        if (ctrl.loadAvgData.smallCounter === 0) {
            ctrl.ui.detailsLoadAvgGraph.ghostArray.splice(0, 12, ...ctrl.loadAvgData.smallGhostArray);
            ctrl.ui.detailsLoadAvgGraph.array.splice(0, 12, ...ctrl.loadAvgData.smallArray);
            ctrl.ui.detailsLoadAvgGraph.graphNeedsUpdate = true;

            ctrl.view.loadAvgGraph.ghostArray.splice(0, 12, ...ctrl.loadAvgData.smallGhostArrayReversed);
            ctrl.view.loadAvgGraph.array.splice(0, 12, ...ctrl.loadAvgData.smallArrayReversed);
            ctrl.view.loadAvgGraph.needsUpdate = true;
            ctrl.view.loadAvgGraph.graphNeedsUpdate = true;
        }

        if (ctrl.loadAvgData.largeCounter === 0) {
            ctrl.view.loadAvgGraph.ghostArray.splice(-90, 90, ...ctrl.loadAvgData.largeGhostArrayReversed);
            ctrl.view.loadAvgGraph.array.splice(-90, 90, ...ctrl.loadAvgData.largeArrayReversed);
            ctrl.view.loadAvgGraph.needsUpdate = true;
            ctrl.view.loadAvgGraph.graphNeedsUpdate = true;
        }

        ctrl.ui.detailsLoadAvgGraph.update();
    }

    if (ctrl.clientsData && numClients !== undefined) {
        ctrl.ui.detailsNumClients.html(numClients);
        ctrl.clientsData.update(numClients);

        if (ctrl.clientsData.smallCounter === 0) {
            ctrl.view.clientsGraph.ghostArray.splice(0, 12, ...ctrl.clientsData.smallGhostArrayReversed);
            ctrl.view.clientsGraph.array.splice(0, 12, ...ctrl.clientsData.smallArrayReversed);
            ctrl.view.clientsGraph.needsUpdate = true;
            ctrl.view.clientsGraph.graphNeedsUpdate = true;
        }

        if (ctrl.clientsData.largeCounter === 0) {
            ctrl.view.clientsGraph.ghostArray.splice(-90, 90, ...ctrl.clientsData.largeGhostArrayReversed);
            ctrl.view.clientsGraph.array.splice(-90, 90, ...ctrl.clientsData.largeArrayReversed);
            ctrl.view.clientsGraph.needsUpdate = true;
            ctrl.view.clientsGraph.graphNeedsUpdate = true;
        }
    }
}

function refresh(ctrl) {
    ctrl.view.latencyAvgGraph.setData([[], ctrl.timestampData.labelsArrayReversed]);
    ctrl.view.loadAvgGraph.setData([[], ctrl.timestampData.labelsArrayReversed]);
    ctrl.view.clientsGraph.setData([[], ctrl.timestampData.labelsArrayReversed]);

    const markers = ctrl.timestampData.markersArrayReversed.map(data => {
        data[0] = data[0] * 0.875;
        return data;
    });

    ctrl.view.latencyAvgGraph.setMarkers(markers, true);
    ctrl.view.loadAvgGraph.setMarkers(markers, true);
    ctrl.view.clientsGraph.setMarkers(markers, true);
    markers.length = 0;
}

function TrackedPoint({ ctrlRef, mesh, pointConfig, pointRef }) {
    const ctx = usePoint3DContext();

    useEffect(() => {
        const ctrl = ctrlRef.current;

        ctrl.pointsCtx = ctx;

        return () => {
            if (ctrl.pointsCtx === ctx) {
                ctrl.pointsCtx = null;
            }
        };
    }, [ctrlRef, ctx]);

    return (
        <Point3D
            object={mesh}
            graph={pointConfig.graph}
            name={pointConfig.name}
            panel={pointConfig.panel}
            ref={pointRef}
            type={pointConfig.type}
        />
    );
}

export function SceneContent({ containerRef, createSource, isDebug, overlayEl }) {
    const store = useStore();
    const size = useThree(s => s.size);
    const ctrlRef = useRef({});
    const meshRef = useRef(null);
    const groupRef = useRef(null);
    const pointRef = useRef(null);
    const pointConfigRef = useRef(null);
    const [dividerSnap, setDividerSnap] = useState(null);
    const [mesh, setMesh] = useState(null);
    const [pointConfig, setPointConfig] = useState(null);

    const pointAdapter = useMemo(() => ({
        animateOut: (...args) => pointRef.current?.animateOut(...args),
        deactivate: () => pointRef.current?.deactivate(),
        getPanelIndex: name => pointConfigRef.current?.panel?.getPanelIndex?.(name),
        getPanelValue: name => pointConfigRef.current?.panel?.getPanelValue?.(name),
        get instances() {
            return pointRef.current?.instances ?? [];
        },
        get mesh() {
            return pointRef.current?.mesh;
        },
        onHover: event => pointRef.current?.onHover(event),
        setData: data => pointRef.current?.setData(data),
        setPanelIndex: (name, index, path) => pointConfigRef.current?.panel?.setPanelIndex?.(name, index, path),
        setPanelValue: (name, value, path) => pointConfigRef.current?.panel?.setPanelValue?.(name, value, path)
    }), []);

    useEffect(() => {
        pointConfigRef.current = pointConfig;
    }, [pointConfig]);

    useEffect(() => {
        const ctrl = ctrlRef.current;

        if (!ctrl.cameraCtrl) return;

        const { camera: worldCamera } = store.getState();
        const { width, height } = size;
        resizeCameras(ctrl.cameraCtrl, worldCamera, width, height);
    }, [size, store]);

    useEffect(() => {
        const { camera: worldCamera, gl } = store.getState();
        const { size: { width, height } } = store.getState();
        const ctrl = {};

        ctrlRef.current = ctrl;

        const view = groupRef.current;
        view.mesh = meshRef.current;
        view.point = pointAdapter;
        ctrl.view = view;

        const mapCamera = worldCamera.clone();
        const pointCamera = worldCamera.clone();
        pointCamera.position.z = 6;

        const mapControls = new OrbitControls(mapCamera, gl.domElement);
        mapControls.enableDamping = true;
        mapControls.enabled = false;

        const poiControls = new OrbitControls(pointCamera, gl.domElement);
        poiControls.enableDamping = true;
        poiControls.enablePan = false;
        poiControls.enabled = false;

        mapControls.enabled = true;
        ctrl.activeControls = mapControls;
        ctrl.mapControls = mapControls;
        ctrl.poiControls = poiControls;

        const cameraCtrl = {
            worldCamera,
            mapCamera,
            pointCamera,
            camera: mapCamera,
            offsetX: 0,
            progress: 0,
            isTransitioning: false,
            _timeout: null
        };
        ctrl.cameraCtrl = cameraCtrl;

        const onTouchStart = e => {
            e.preventDefault();
        };
        gl.domElement.addEventListener('touchstart', onTouchStart);

        ctrl.onKeyUp = e => {
            if (e.ctrlKey && e.keyCode >= 55 && e.keyCode <= 57) {
                const index = e.keyCode - 55;
                ctrl.view.point?.setPanelIndex('Graph', index);
                ctrl.view.point?.onHover({ type: 'over' });
            }
        };

        const onDetailsEvent = ({ open }) => {
            let targetCamera;

            if (open) {
                targetCamera = pointCamera;
                ctrl.activeControls = poiControls;
                mapControls.enabled = false;
                poiControls.enabled = true;
            } else {
                targetCamera = mapCamera;
                ctrl.activeControls = mapControls;
                poiControls.enabled = false;
                mapControls.enabled = true;
            }

            cameraCtrl.camera = targetCamera;

            clearTween(cameraCtrl);
            clearTween(cameraCtrl._timeout);

            if (ctrl.pointsCtx) {
                ctrl.pointsCtx.state.current.enabled = false;
                ctrl.pointsCtx.state.current.hoverEnabled = false;
            }

            cameraCtrl.progress = 0;
            cameraCtrl.isTransitioning = true;

            tween(cameraCtrl, { progress: 1 }, 1000, 'easeInOutSine', () => {
                cameraCtrl.isTransitioning = false;
            }, () => {
                lerpCameras(worldCamera, cameraCtrl.camera, cameraCtrl.progress);
                worldCamera.view.offsetX = MathUtils.lerp(
                    worldCamera.view.offsetX,
                    cameraCtrl.camera === pointCamera ? cameraCtrl.offsetX : 0,
                    cameraCtrl.progress
                );
                worldCamera.updateProjectionMatrix();
            });

            cameraCtrl._timeout = delayedCall(300, () => {
                if (ctrl.pointsCtx) {
                    ctrl.pointsCtx.state.current.enabled = true;
                    ctrl.pointsCtx.state.current.hoverEnabled = true;
                }
            });
        };
        ctrl.onDetailsEvent = onDetailsEvent;

        const onStart = () => {
            Stage.events.on('details', onDetailsEvent);
            ticker.start();
        };
        ctrl.onStart = onStart;
        Stage.events.on('start', onStart);

        const { emitter, cleanup: sourceCleanup } = createSource();
        ctrl.emitter = emitter;
        ctrl.sourceCleanup = sourceCleanup;

        emitter.on('details', data => {
            if (!ctrl.destroyed) {
                handleDetails(data, ctrl, containerRef.current, setPointConfig, setDividerSnap);
            }
        });
        emitter.on('data', data => {
            if (!ctrl.destroyed) {
                handleData(data, ctrl);
            }
        });
        emitter.on('status', data => {
            if (!ctrl.destroyed) {
                handleStatus(data, ctrl);
            }
        });

        resizeCameras(cameraCtrl, worldCamera, width, height);

        return () => {
            ctrl.destroyed = true;
            ctrlRef.current = {};

            const { camera: currentCamera, gl: renderer } = store.getState();

            clearTween(cameraCtrl);
            clearTween(cameraCtrl._timeout);
            clearTween(ctrl.scenePanelCtrlTimeout);

            ticker.stop();

            Stage.events.off('start', ctrl.onStart);
            Stage.events.off('details', ctrl.onDetailsEvent);

            window.removeEventListener('keyup', ctrl.onKeyUp);
            renderer.domElement.removeEventListener('touchstart', onTouchStart);

            ctrl.sourceCleanup?.();

            mapControls.dispose();
            poiControls.dispose();

            ctrl.pointsCtx = null;
            ctrl.view?.panel?.destroy?.();
            ctrl.view?.graph?.destroy?.();
            ctrl.ui?.destroy?.();

            currentCamera.clearViewOffset?.();
        };
    }, [containerRef, createSource, pointAdapter, store]);

    useFrame(({ camera: worldCamera, clock }) => {
        const ctrl = ctrlRef.current;

        if (!ctrl.activeControls) return;

        const time = clock.elapsedTime;

        ctrl.activeControls.update();

        const { cameraCtrl } = ctrl;

        if (!cameraCtrl.isTransitioning) {
            worldCamera.position.copy(cameraCtrl.camera.position);
            worldCamera.quaternion.copy(cameraCtrl.camera.quaternion);
        }

        if (ctrl.view?.mesh) {
            ctrl.view.mesh.rotation.x = time / 2;
            ctrl.view.mesh.rotation.y = time;
        }

        if (ctrl.ui) {
            ctrl.ui.update();
            ctrl.ui.detailsLatencyGraph?.update();
            ctrl.ui.detailsLoadAvgGraph?.update();
        }
    });

    return (
        <>
            <color attach="background" args={[0x060606]} />
            <hemisphereLight args={[0xffffff, 0x888888, 3]} />
            <group ref={groupRef}>
                <mesh
                    ref={node => {
                        meshRef.current = node;
                        setMesh(node);
                    }}
                >
                    <boxGeometry onUpdate={self => self.computeTangents()} />
                    <meshNormalMaterial />
                </mesh>
            </group>
            {overlayEl && mesh && pointConfig && (
                <Points3D container={overlayEl} debug={isDebug} dividerSnap={dividerSnap}>
                    <TrackedPoint
                        ctrlRef={ctrlRef}
                        mesh={mesh}
                        pointConfig={pointConfig}
                        pointRef={pointRef}
                    />
                </Points3D>
            )}
        </>
    );
}
