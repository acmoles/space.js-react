/**
 * Shared R3F scene component for both Server Status examples.
 *
 * Receives a `createSource` factory that returns `{ emitter, cleanup }`.
 * The emitter is an EventEmitter (Socket or Thread) that fires
 * 'details', 'data', and 'status' events.
 *
 * UI state is owned by the parent (ServerStatusScene). This component only
 * manages the 3D scene (cameras, OrbitControls, mesh, radial graphs, Points3D)
 * and writes to the `uiRefs` bag for per-tick imperative UI updates.
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
    clearTween,
    delayedCall,
    lerpCameras,
    ticker,
    tween
} from '@lib/three.js';

import { Point3D, Points3D, usePoint3DContext } from '../../../space/three/index.js';

import { Data } from './utils.js';
import { GraphData, TimestampData } from './data.js';

// ─── Camera helpers ───────────────────────────────────────────────────────────

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

// ─── Panel (3D point tracker) ─────────────────────────────────────────────────

/**
 * Creates the RadialGraphContainer (shown inside the 3D point tracker bubble)
 * and the Panel with List/Link items for the point HUD.
 *
 * @param {object}   ctrl          Mutable ctrl bag.
 * @param {function} setPointConfig React state setter that triggers Point3D mount.
 */
function initPanel(ctrl, setPointConfig) {
    const { view } = ctrl;
    const object = view;

    // ── Radial graphs ────────────────────────────────────────────────────────

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

    // ── Panel items ──────────────────────────────────────────────────────────

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

                // `ctrl.detailsOpen` is kept in sync by onDetailsEvent.
                const ui = ctrl.uiRef?.current;
                ui?.toggleDetails(!ctrl.detailsOpen);
                object.point?.animateOut(true);
                object.point?.deactivate();

                ctrl.scenePanelCtrlTimeout = delayedCall(300, () => {
                    item.setValue(ctrl.detailsOpen ? 'Map' : 'Details', false);
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

// ─── Data event handlers ──────────────────────────────────────────────────────

/**
 * First 'details' event: initialise Data class, build radial graphs, create the
 * React UI via `onDetailsReceived`, and schedule `Stage.events.emit('start')`.
 *
 * Subsequent 'details' events (reconnection): call `onDetailsReconnect` so the
 * parent can update mem/swap/storage in the React Details panel.
 */
function handleDetails(data, ctrl, setPointConfig, onDetailsReceived, onDetailsReconnect) {
    const {
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
    } = data;

    ctrl.restartTime = restartTime;

    if (!ctrl.uiMounted) {
        // ── First connection ─────────────────────────────────────────────────

        Data.init({ projectDomain, networkName });
        initPanel(ctrl, setPointConfig);

        // Hand the formatted details to the parent so it can render <UI>.
        // Stage.events.emit('start') is deferred until dividerTopEl is set.
        ctrl.pendingStart = true;

        onDetailsReceived({
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
        });

        ctrl.uiMounted = true;
    } else {
        // ── Reconnection: update dynamic values ──────────────────────────────
        onDetailsReconnect({
            memUsed,
            memTotal,
            memUsedPercentage,
            swapUsed,
            swapTotal,
            swapUsedPercentage,
            storageUsed,
            storageTotal,
            storageUsedPercentage
        });
    }
}

/**
 * 'data' event: populate historical graph arrays in both the 3D radial graphs
 * (imperative vanilla RadialGraphSegmentsCanvas) and the 2D Details panel
 * (imperative React Graph handles via uiRefs).
 */
function handleData({ timestampData, latencyAvgData, loadAvgData, clientsData }, ctrl, uiRefs) {
    ctrl.timestampData = new TimestampData();
    ctrl.timestampData.setArrays(timestampData);
    ctrl.timestampData.addMarker([ctrl.restartTime, 'Restart']);

    // ── Latency avg ──────────────────────────────────────────────────────────

    ctrl.latencyAvgData = new GraphData();
    ctrl.latencyAvgData.setArrays(latencyAvgData);

    const latencyAvgMax = Math.max(300, ctrl.latencyAvgData.getMax());

    ctrl.view.latencyAvgGraph.setGhostArray([...ctrl.latencyAvgData.smallGhostArrayReversed, ...ctrl.latencyAvgData.largeGhostArrayReversed]);
    ctrl.view.latencyAvgGraph.setArray([...ctrl.latencyAvgData.smallArrayReversed, ...ctrl.latencyAvgData.largeArrayReversed]);
    ctrl.view.latencyAvgGraph.setRange(latencyAvgMax);

    // ── Load avg ─────────────────────────────────────────────────────────────

    ctrl.loadAvgData = new GraphData();
    ctrl.loadAvgData.setArrays(loadAvgData);

    const loadAvgMax = Math.max(400, ctrl.loadAvgData.getMax());

    // 2D Details graph (React GraphSegments via uiRefs)
    if (uiRefs.loadAvgGraph.current) {
        uiRefs.loadAvgGraph.current.setGhostArray([...ctrl.loadAvgData.smallGhostArray, ...ctrl.loadAvgData.realtimeGhostArray]);
        uiRefs.loadAvgGraph.current.setArray([...ctrl.loadAvgData.smallArray, ...ctrl.loadAvgData.realtimeArray]);
        uiRefs.loadAvgGraph.current.setRange(loadAvgMax);
    }

    // 3D radial graph (vanilla RadialGraphSegmentsCanvas)
    ctrl.view.loadAvgGraph.setGhostArray([...ctrl.loadAvgData.smallGhostArrayReversed, ...ctrl.loadAvgData.largeGhostArrayReversed]);
    ctrl.view.loadAvgGraph.setArray([...ctrl.loadAvgData.smallArrayReversed, ...ctrl.loadAvgData.largeArrayReversed]);
    ctrl.view.loadAvgGraph.setRange(loadAvgMax);

    // ── Clients ──────────────────────────────────────────────────────────────

    ctrl.clientsData = new GraphData();
    ctrl.clientsData.setArrays(clientsData);

    const clientsMax = Math.max(10, ctrl.clientsData.getMax());

    ctrl.view.clientsGraph.setGhostArray([...ctrl.clientsData.smallGhostArrayReversed, ...ctrl.clientsData.largeGhostArrayReversed]);
    ctrl.view.clientsGraph.setArray([...ctrl.clientsData.smallArrayReversed, ...ctrl.clientsData.largeArrayReversed]);
    ctrl.view.clientsGraph.setRange(clientsMax);

    refresh(ctrl);
}

/**
 * 'status' event: push per-tick scalar updates to UI refs and 3D radial graphs.
 */
function handleStatus({ currentTime, serverUptime, latency, latencyAvg, loadAvg, numClients }, ctrl, uiRefs) {
    // ── Timestamp ────────────────────────────────────────────────────────────

    if (ctrl.timestampData && currentTime !== undefined) {
        ctrl.timestampData.update(currentTime);

        if (ctrl.timestampData.largeCounter === 0) {
            refresh(ctrl);
        }
    }

    // ── Uptime ───────────────────────────────────────────────────────────────

    if (serverUptime !== undefined && uiRefs.uptime.current) {
        uiRefs.uptime.current.innerHTML = serverUptime;
    }

    // ── Latency ──────────────────────────────────────────────────────────────

    if (latency !== undefined) {
        uiRefs.latencyMeter.current?.update(latency);
        uiRefs.latencyGraph.current?.update(latency);
    }

    // ── Latency avg ──────────────────────────────────────────────────────────

    if (ctrl.latencyAvgData && latencyAvg !== undefined) {
        if (uiRefs.latencyAvgText.current) {
            uiRefs.latencyAvgText.current.innerHTML = `${latencyAvg}ms (avg)`;
        }
        uiRefs.latencyAvgMeter.current?.update(latencyAvg);

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

    // ── Load avg ─────────────────────────────────────────────────────────────

    if (ctrl.loadAvgData && loadAvg !== undefined) {
        if (uiRefs.loadAvgText.current) {
            uiRefs.loadAvgText.current.innerHTML = `${loadAvg}% (1min avg)`;
        }
        uiRefs.loadAvgMeter.current?.update(loadAvg);

        ctrl.loadAvgData.update(loadAvg);

        // Realtime segment: splice last 10 slots
        if (uiRefs.loadAvgGraph.current) {
            uiRefs.loadAvgGraph.current.setGhostArray([
                ...ctrl.loadAvgData.smallGhostArray,
                ...ctrl.loadAvgData.realtimeGhostArray
            ]);
            uiRefs.loadAvgGraph.current.setArray([
                ...ctrl.loadAvgData.smallArray,
                ...ctrl.loadAvgData.realtimeArray
            ]);
        }

        // 3D radial graph — realtime update
        ctrl.view.loadAvgGraph.ghostArray.splice(-90, 90, ...ctrl.loadAvgData.largeGhostArrayReversed);
        ctrl.view.loadAvgGraph.array.splice(-90, 90, ...ctrl.loadAvgData.largeArrayReversed);
        ctrl.view.loadAvgGraph.needsUpdate = true;

        if (ctrl.loadAvgData.smallCounter === 0) {
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
    }

    // ── Clients ──────────────────────────────────────────────────────────────

    if (ctrl.clientsData && numClients !== undefined) {
        if (uiRefs.clientsText.current) {
            uiRefs.clientsText.current.innerHTML = numClients;
        }

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

/**
 * Refreshes timestamp-based labels and date-change markers on the 3D graphs.
 */
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

// ─── TrackedPoint (sub-component) ────────────────────────────────────────────

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

// ─── SceneContent ─────────────────────────────────────────────────────────────

/**
 * R3F scene for the Server Status examples. Manages cameras, OrbitControls,
 * the rotating cube mesh, and the 3D point tracker (Points3D / Point3D).
 *
 * All React UI (Details panel, FPS, details button) lives in the parent
 * `ServerStatusScene` component outside the Canvas.
 *
 * @param {object}      props
 * @param {object}      props.containerRef        Ref to the Example root element.
 * @param {function}    props.createSource         `() => { emitter, cleanup }`.
 * @param {boolean}     [props.isDebug=false]      Show tracker-sphere wireframes.
 * @param {Element|null} props.overlayEl           DOM element for Points3D portals.
 * @param {object}      props.uiRef               React `<UI>` imperative handle.
 * @param {object}      props.uiRefsRef           Ref holder whose `.current` is
 *                                                 the bag of DOM/component refs for
 *                                                 per-tick imperative UI updates.
 * @param {Element|null} props.dividerTopEl        Top-line DOM element of the
 *                                                 DividerLine (snap boundary for
 *                                                 Points3D). Null until the React
 *                                                 UI has committed.
 * @param {function}    props.onDetailsReceived    Called with formatted details on
 *                                                 first 'details' event.
 * @param {function}    props.onDetailsReconnect   Called with mem/swap/storage on
 *                                                 subsequent 'details' events.
 */
export function SceneContent({
    containerRef,
    createSource,
    isDebug,
    overlayEl,
    uiRef,
    uiRefsRef,
    dividerTopEl,
    onDetailsReceived,
    onDetailsReconnect
}) {
    const store = useStore();
    const size = useThree(s => s.size);
    const ctrlRef = useRef({});
    const meshRef = useRef(null);
    const groupRef = useRef(null);
    const pointRef = useRef(null);
    const pointConfigRef = useRef(null);
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

    // ── Camera resize ─────────────────────────────────────────────────────────

    useEffect(() => {
        const ctrl = ctrlRef.current;

        if (!ctrl.cameraCtrl) return;

        const { camera: worldCamera } = store.getState();
        const { width, height } = size;
        resizeCameras(ctrl.cameraCtrl, worldCamera, width, height);
    }, [size, store]);

    // ── When the divider top element becomes available, start the scene ───────
    // This fires after the parent renders the React <UI> (which commits the
    // DividerLine DOM element) and the parent passes the element down as a prop.

    useEffect(() => {
        const ctrl = ctrlRef.current;

        if (dividerTopEl && ctrl.pendingStart) {
            ctrl.pendingStart = false;
            Stage.events.emit('start');
            window.addEventListener('keyup', ctrl.onKeyUp);
        }
    }, [dividerTopEl]);

    // ── Main init effect ──────────────────────────────────────────────────────

    useEffect(() => {
        const { camera: worldCamera, gl } = store.getState();
        const { size: { width, height } } = store.getState();
        const ctrl = {};

        ctrlRef.current = ctrl;

        const view = groupRef.current;
        view.mesh = meshRef.current;
        view.point = pointAdapter;
        ctrl.view = view;

        // Keep a stable ref so initPanel callbacks can call uiRef.current
        ctrl.uiRef = uiRef;
        ctrl.detailsOpen = false;

        // ── Cameras ───────────────────────────────────────────────────────────

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

        // ── Touch prevention ──────────────────────────────────────────────────

        const onTouchStart = e => {
            e.preventDefault();
        };
        gl.domElement.addEventListener('touchstart', onTouchStart);

        // ── Keyboard shortcut (Ctrl+7/8/9 — change graph) ────────────────────

        ctrl.onKeyUp = e => {
            if (e.ctrlKey && e.keyCode >= 55 && e.keyCode <= 57) {
                const index = e.keyCode - 55;
                ctrl.view.point?.setPanelIndex('Graph', index);
                ctrl.view.point?.onHover({ type: 'over' });
            }
        };

        // ── Details ↔ camera transition ───────────────────────────────────────

        const onDetailsEvent = ({ open }) => {
            ctrl.detailsOpen = open;

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

        // ── Start handler: registers details event and starts ticker ──────────
        // Emitted after the React UI has committed and dividerTopEl is set.

        const onStart = () => {
            Stage.events.on('details', onDetailsEvent);
            ticker.start();
        };
        ctrl.onStart = onStart;
        Stage.events.on('start', onStart);

        // ── Data source ───────────────────────────────────────────────────────

        const { emitter, cleanup: sourceCleanup } = createSource();
        ctrl.emitter = emitter;
        ctrl.sourceCleanup = sourceCleanup;

        emitter.on('details', data => {
            if (!ctrl.destroyed) {
                handleDetails(data, ctrl, setPointConfig, onDetailsReceived, onDetailsReconnect);
            }
        });
        emitter.on('data', data => {
            if (!ctrl.destroyed) {
                handleData(data, ctrl, uiRefsRef.current);
            }
        });
        emitter.on('status', data => {
            if (!ctrl.destroyed) {
                handleStatus(data, ctrl, uiRefsRef.current);
            }
        });

        resizeCameras(cameraCtrl, worldCamera, width, height);

        // ── Cleanup ───────────────────────────────────────────────────────────

        return () => {
            // Guard all subsequent callbacks (StrictMode double-invoke safe).
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
            // Note: no ctrl.ui to destroy — the React <UI> is owned by the
            // parent (ServerStatusScene) and cleaned up with the component tree.

            currentCamera.clearViewOffset?.();
        };
    }, [containerRef, createSource, pointAdapter, store, uiRef, uiRefsRef, onDetailsReceived, onDetailsReconnect]);

    // ── Per-frame ─────────────────────────────────────────────────────────────

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
        // React Graph/GraphSegments/Meter components update themselves via
        // useTicker — no ui.update() call needed here.
    });

    // ── Render ────────────────────────────────────────────────────────────────

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
                <Points3D container={overlayEl} debug={isDebug} dividerSnap={dividerTopEl}>
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
