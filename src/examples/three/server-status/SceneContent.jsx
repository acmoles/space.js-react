/**
 * Shared R3F scene component for both Server Status examples.
 *
 * Receives a `createSource` factory that returns `{ emitter, cleanup }`.
 * The emitter is an EventEmitter (Socket or Thread) that fires
 * 'details', 'data', and 'status' events.
 */

import { useEffect, useRef } from 'react';
import { useFrame, useStore, useThree } from '@react-three/fiber';
import { BoxGeometry, Color, Group, HemisphereLight, MathUtils, Mesh, MeshNormalMaterial } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
    Interface,
    PanelItem,
    Point3D,
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

import { Data } from './utils.js';
import { GraphData, TimestampData } from './data.js';

// ---------------------------------------------------------------------------
// Helpers (defined outside the component to avoid re-creation on renders)
// ---------------------------------------------------------------------------

function resizeCameras(cameraCtrl, worldCamera, width, height) {
    cameraCtrl.offsetX = -width / 4;

    // World camera
    worldCamera.aspect = width / height;
    worldCamera.setViewOffset(
        width, height,
        cameraCtrl.camera === cameraCtrl.pointCamera ? cameraCtrl.offsetX : 0,
        0, width, height
    );
    worldCamera.updateProjectionMatrix();

    // Map camera
    cameraCtrl.mapCamera.aspect = width / height;
    cameraCtrl.mapCamera.updateProjectionMatrix();

    // Point of interest camera
    cameraCtrl.pointCamera.aspect = width / height;
    cameraCtrl.pointCamera.updateProjectionMatrix();
}

function initPanel(ctrl, worldCamera, gl, scene, isDebug) {
    const { view, ui, trackers } = ctrl;
    const object = view;

    // PanelController: initialise Point3D static state FIRST so that
    // new Point3D() can call initContainer() → Point3D.container.add(...)
    Point3D.init(gl, scene, worldCamera, {
        container: trackers,
        dividerSnap: ui.details.dividerLine,
        uvTexturePath: '/assets/textures/uv.jpg',
        debug: isDebug
    });

    // Note the `start` and `graphHeight` parameters are used for the point position
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
        ratio: [0.125, 0.875], // 45 / 360 = 0.125
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
        ratio: [0.125, 0.875], // 45 / 360 = 0.125
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
        ratio: [0.125, 0.875], // 45 / 360 = 0.125
        labels: ['', '12hrs'],
        range: 10,
        hoverLabels: true,
        noMarkerDrag: true
    });
    object.graph.add(object.clientsGraph);

    // Default graph (load average)
    object.graph.setIndex(1);

    object.point = new Point3D(object.mesh, {
        name: Data.getName(),
        type: Data.getType(),
        graph: object.graph
    });
    object.add(object.point);

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
                const index = graphOptions.get(value);

                object.graph.setIndex(index);
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

                object.point.animateOut(true);
                object.point.deactivate();

                ctrl.scenePanelCtrlTimeout = delayedCall(300, () => {
                    item.setValue(ui.details.animatedIn ? 'Map' : 'Details', false);
                });
            }
        }
    ];

    items.forEach(data => {
        object.point.addPanel(new PanelItem(data));
    });

    // Shrink tracker mesh to better match the visual size of the object
    view.point.mesh.scale.multiplyScalar(0.8);
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
}, ctrl, worldCamera, gl, scene, container, isDebug) {
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

        // details.content is the flat list of all group children (groups are expanded):
        // [0] description
        // [1] server version  [2] uptime  [3] latency-meter
        // [4] network         [5] clients
        // [6] latency-avg     [7] latency-graph
        // [8] processor       [9] vcpus
        // [10] load-avg       [11] load-graph
        // [12] mem            [13] swap
        // [14] storage
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

        initPanel(ctrl, worldCamera, gl, scene, isDebug);

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
    // Timestamp data
    ctrl.timestampData = new TimestampData();
    ctrl.timestampData.setArrays(timestampData);
    ctrl.timestampData.addMarker([ctrl.restartTime, 'Restart']);

    // Latency average data (initially no data, all 0s)
    ctrl.latencyAvgData = new GraphData();
    ctrl.latencyAvgData.setArrays(latencyAvgData);

    const latencyAvgMax = Math.max(300, ctrl.latencyAvgData.getMax());

    ctrl.view.latencyAvgGraph.setGhostArray([...ctrl.latencyAvgData.smallGhostArrayReversed, ...ctrl.latencyAvgData.largeGhostArrayReversed]);
    ctrl.view.latencyAvgGraph.setArray([...ctrl.latencyAvgData.smallArrayReversed, ...ctrl.latencyAvgData.largeArrayReversed]);
    ctrl.view.latencyAvgGraph.setRange(latencyAvgMax);

    // Load average data
    ctrl.loadAvgData = new GraphData();
    ctrl.loadAvgData.setArrays(loadAvgData);

    const loadAvgMax = Math.max(400, ctrl.loadAvgData.getMax());

    ctrl.ui.detailsLoadAvgGraph.setGhostArray([...ctrl.loadAvgData.smallGhostArray, ...ctrl.loadAvgData.realtimeGhostArray]);
    ctrl.ui.detailsLoadAvgGraph.setArray([...ctrl.loadAvgData.smallArray, ...ctrl.loadAvgData.realtimeArray]);
    ctrl.ui.detailsLoadAvgGraph.setRange(loadAvgMax);

    ctrl.view.loadAvgGraph.setGhostArray([...ctrl.loadAvgData.smallGhostArrayReversed, ...ctrl.loadAvgData.largeGhostArrayReversed]);
    ctrl.view.loadAvgGraph.setArray([...ctrl.loadAvgData.smallArrayReversed, ...ctrl.loadAvgData.largeArrayReversed]);
    ctrl.view.loadAvgGraph.setRange(loadAvgMax);

    // Clients data
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
        data[0] = data[0] * 0.875; // 0.875 segment ratio
        return data;
    });
    ctrl.view.latencyAvgGraph.setMarkers(markers, true);
    ctrl.view.loadAvgGraph.setMarkers(markers, true);
    ctrl.view.clientsGraph.setMarkers(markers, true);

    // Cleanup
    markers.length = 0;
}

// ---------------------------------------------------------------------------
// SceneContent component
// ---------------------------------------------------------------------------

export function SceneContent({ containerRef, createSource, isDebug }) {
    // useStore gives us an imperative handle to the R3F state — we call
    // store.getState() inside effects so we never hold mutable hook values
    // in the component body (avoids react-hooks/immutability violations).
    const store = useStore();

    // Reactive size selector — triggers the resize effect when canvas resizes.
    const size = useThree(s => s.size);

    const ctrlRef = useRef({});

    // Resize: update camera aspects and view offset whenever canvas size changes.
    useEffect(() => {
        const ctrl = ctrlRef.current;
        if (!ctrl.cameraCtrl) return;

        const { camera: worldCamera } = store.getState();
        const { width, height } = size;
        resizeCameras(ctrl.cameraCtrl, worldCamera, width, height);
    }, [size, store]);

    // One-time imperative setup (mirrors App.init() from the original).
    useEffect(() => {
        // Obtain renderer, camera, scene from the store — not from hook return
        // values — to stay compliant with react-hooks/immutability.
        const { camera: worldCamera, gl, scene } = store.getState();
        const { size: { width, height } } = store.getState();

        const ctrl = {};
        ctrlRef.current = ctrl;

        // --- Scene ---
        scene.background = new Color(0x060606);

        // --- Lights ---
        const light = new HemisphereLight(0xffffff, 0x888888, 3);
        scene.add(light);

        // --- Scene view (SceneView) ---
        const geometry = new BoxGeometry();
        geometry.computeTangents();
        const material = new MeshNormalMaterial();
        const mesh = new Mesh(geometry, material);
        const view = new Group();
        view.add(mesh);
        view.mesh = mesh;
        scene.add(view);
        ctrl.view = view;
        ctrl.geometry = geometry;
        ctrl.material = material;

        // --- Cameras ---
        const mapCamera = worldCamera.clone();
        const pointCamera = worldCamera.clone();
        pointCamera.position.z = 6;

        // --- Controls ---
        // Map controls
        const mapControls = new OrbitControls(mapCamera, gl.domElement);
        mapControls.enableDamping = true;
        mapControls.enabled = false;

        // Point of interest controls
        const poiControls = new OrbitControls(pointCamera, gl.domElement);
        poiControls.enableDamping = true;
        poiControls.enablePan = false;
        poiControls.enabled = false;

        // Output camera controls — map is active by default
        mapControls.enabled = true;
        ctrl.activeControls = mapControls;
        ctrl.mapControls = mapControls;
        ctrl.poiControls = poiControls;

        // --- CameraController state ---
        const cameraCtrl = {
            worldCamera,
            mapCamera,
            pointCamera,
            camera: mapCamera, // active target camera
            offsetX: 0,
            progress: 0,
            isTransitioning: false,
            _timeout: null
        };
        ctrl.cameraCtrl = cameraCtrl;

        // --- Trackers view (TrackersView) ---
        const trackers = new Interface('.trackers');
        trackers.css({
            position: 'fixed',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            webkitUserSelect: 'none',
            userSelect: 'none'
        });
        containerRef.current.appendChild(trackers.element);
        ctrl.trackers = trackers;

        // --- Touch handler ---
        const onTouchStart = e => {
            e.preventDefault();
        };
        gl.domElement.addEventListener('touchstart', onTouchStart);

        // --- Keyboard handler ---
        ctrl.onKeyUp = e => {
            if (e.ctrlKey && e.keyCode >= 55 && e.keyCode <= 57) { // Ctrl 7-9
                const index = e.keyCode - 55;
                ctrl.view.point?.setPanelIndex('Graph', index);
                ctrl.view.point?.onHover({ type: 'over' });
            }
        };

        // --- Stage 'details' event: camera/controls transition ---
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

            // CameraController.transition()
            clearTween(cameraCtrl);
            clearTween(cameraCtrl._timeout);

            Point3D.enabled = false;

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
                Point3D.enabled = true;
            });
        };
        ctrl.onDetailsEvent = onDetailsEvent;

        // --- Stage 'start' event ---
        const onStart = () => {
            Stage.events.on('details', onDetailsEvent);
            ticker.start();
        };
        ctrl.onStart = onStart;
        Stage.events.on('start', onStart);

        // --- Event source (Socket or Thread) ---
        const { emitter, cleanup: sourceCleanup } = createSource();
        ctrl.emitter = emitter;
        ctrl.sourceCleanup = sourceCleanup;

        emitter.on('details', data => {
            if (ctrl.destroyed) return;
            handleDetails(
                data, ctrl, worldCamera, gl, scene,
                containerRef.current, isDebug
            );
        });
        emitter.on('data', data => { if (!ctrl.destroyed) handleData(data, ctrl); });
        emitter.on('status', data => { if (!ctrl.destroyed) handleStatus(data, ctrl); });

        // --- Initial resize ---
        resizeCameras(cameraCtrl, worldCamera, width, height);

        // --- Cleanup ---
        return () => {
            // Mark destroyed first so any in-flight emitter callbacks bail out
            // immediately and never reach handleDetails/Point3D after teardown.
            ctrl.destroyed = true;

            // Nullify ctrlRef so useFrame bails out immediately (cannot call
            // update/render on objects being destroyed — prevents clearRect errors
            // from space.js canvas 2D contexts during StrictMode double-mount and
            // during normal route navigation).
            ctrlRef.current = {};

            const { camera: wc, gl: renderer, scene: sc } = store.getState();

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

            geometry.dispose();
            material.dispose();

            sc.remove(view);
            sc.remove(light);

            // Destroy all registered Point3D instances and remove DOM/event listeners
            Point3D.destroy();
            Point3D.enabled = true;

            trackers.destroy?.();
            ctrl.ui?.destroy?.();

            sc.background = null;
            wc.clearViewOffset?.();
        };
    }, [store, containerRef, createSource, isDebug]);

    // Animation loop (mirrors App.onUpdate from the original).
    useFrame(({ camera: worldCamera, clock }) => {
        const ctrl = ctrlRef.current;
        if (!ctrl.activeControls) return;

        const time = clock.elapsedTime;

        // WorldController.update — controls tick
        ctrl.activeControls.update();

        // CameraController.update
        const { cameraCtrl } = ctrl;
        if (!cameraCtrl.isTransitioning) {
            worldCamera.position.copy(cameraCtrl.camera.position);
            worldCamera.quaternion.copy(cameraCtrl.camera.quaternion);
        }

        // SceneController.update
        ctrl.view.mesh.rotation.x = time / 2;
        ctrl.view.mesh.rotation.y = time;

        // PanelController.update (only after initPanel has set view.point)
        if (ctrl.ui && ctrl.view?.point) {
            Point3D.update(time);
        }

        // ServerStatusController.update
        if (ctrl.ui) {
            ctrl.ui.update();
            ctrl.ui.detailsLatencyGraph?.update();
            ctrl.ui.detailsLoadAvgGraph?.update();
        }
    });

    // Everything is managed imperatively; no JSX output.
    return null;
}
