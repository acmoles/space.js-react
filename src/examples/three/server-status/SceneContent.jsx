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
    Stage,
    clearTween,
    delayedCall,
    lerpCameras,
    ticker,
    tween
} from '@lib/three.js';

import { RadialGraphSegmentsCanvas } from '../../../space/components/radial/index.js';
import { Point3D, Point3DGraph, Point3DPanel, Points3D, usePoint3DContext } from '../../../space/three/index.js';

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
 * and the List/Link item descriptors for the point HUD panel.
 *
 * @param {object}   ctrl          Mutable ctrl bag.
 * @param {function} setPointConfig React state setter that triggers Point3D mount.
 */
function initPanel(ctrl, setPointConfig) {
    const { view } = ctrl;
    const object = view;

    // ── Radial graphs (React components rendered in TrackedPoint) ─────────
    // Provide lazy getters so call sites like ctrl.view.latencyAvgGraph work
    // even though the refs are only populated after TrackedPoint mounts.

    Object.defineProperties(object, {
        latencyAvgGraph: { get() { return ctrl.latencyAvgGraphRef?.current; }, configurable: true },
        loadAvgGraph: { get() { return ctrl.loadAvgGraphRef?.current; }, configurable: true },
        clientsGraph: { get() { return ctrl.clientsGraphRef?.current; }, configurable: true },
        graph: { get() { return ctrl.graphRef?.current; }, configurable: true }
    });

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
                object.graph?.setIndex(graphOptions.get(value));
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

    // The panel is rendered declaratively by <Point3DPanel>; expose it lazily
    // so call sites like ctrl.view.panel keep working, as with the graphs.
    Object.defineProperty(object, 'panel', {
        get() { return ctrl.panelRef?.current; },
        configurable: true
    });

    setPointConfig({
        items,
        name: Data.getName(),
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

    ctrl.latencyAvgMax = Math.max(300, ctrl.latencyAvgData.getMax());

    // ── Load avg ─────────────────────────────────────────────────────────────

    ctrl.loadAvgData = new GraphData();
    ctrl.loadAvgData.setArrays(loadAvgData);

    const loadAvgMax = ctrl.loadAvgMax = Math.max(400, ctrl.loadAvgData.getMax());

    // 2D Details graph (React GraphSegments via uiRefs)
    if (uiRefs.loadAvgGraph.current) {
        uiRefs.loadAvgGraph.current.setGhostArray([...ctrl.loadAvgData.smallGhostArray, ...ctrl.loadAvgData.realtimeGhostArray]);
        uiRefs.loadAvgGraph.current.setArray([...ctrl.loadAvgData.smallArray, ...ctrl.loadAvgData.realtimeArray]);
        uiRefs.loadAvgGraph.current.setRange(loadAvgMax);
    }

    // ── Clients ──────────────────────────────────────────────────────────────

    ctrl.clientsData = new GraphData();
    ctrl.clientsData.setArrays(clientsData);

    ctrl.clientsMax = Math.max(10, ctrl.clientsData.getMax());

    applyGraphData(ctrl);
}

/**
 * Pushes the accumulated historical arrays onto the three 3D radial graphs.
 *
 * The graphs are React children of `<Point3D>` and so mount a tick after the
 * first 'data' message arrives.  This is a no-op until then; `TrackedPoint`
 * replays it on mount so no data is dropped.
 */
function applyGraphData(ctrl) {
    const { latencyAvgGraph, loadAvgGraph, clientsGraph } = ctrl.view;

    if (!latencyAvgGraph || !loadAvgGraph || !clientsGraph || !ctrl.latencyAvgData) return;

    latencyAvgGraph.setGhostArray([...ctrl.latencyAvgData.smallGhostArrayReversed, ...ctrl.latencyAvgData.largeGhostArrayReversed]);
    latencyAvgGraph.setArray([...ctrl.latencyAvgData.smallArrayReversed, ...ctrl.latencyAvgData.largeArrayReversed]);
    latencyAvgGraph.setRange(ctrl.latencyAvgMax);

    loadAvgGraph.setGhostArray([...ctrl.loadAvgData.smallGhostArrayReversed, ...ctrl.loadAvgData.largeGhostArrayReversed]);
    loadAvgGraph.setArray([...ctrl.loadAvgData.smallArrayReversed, ...ctrl.loadAvgData.largeArrayReversed]);
    loadAvgGraph.setRange(ctrl.loadAvgMax);

    clientsGraph.setGhostArray([...ctrl.clientsData.smallGhostArrayReversed, ...ctrl.clientsData.largeGhostArrayReversed]);
    clientsGraph.setArray([...ctrl.clientsData.smallArrayReversed, ...ctrl.clientsData.largeArrayReversed]);
    clientsGraph.setRange(ctrl.clientsMax);

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

        // 3D radial graph — absent until <Point3DGraph> mounts.
        const graph = ctrl.view.latencyAvgGraph;

        if (graph) {
            if (ctrl.latencyAvgData.smallCounter === 0) {
                graph.ghostArray.splice(0, 12, ...ctrl.latencyAvgData.smallGhostArrayReversed);
                graph.array.splice(0, 12, ...ctrl.latencyAvgData.smallArrayReversed);
                graph.needsUpdate = true;
                graph.graphNeedsUpdate = true;
            }

            if (ctrl.latencyAvgData.largeCounter === 0) {
                graph.ghostArray.splice(-90, 90, ...ctrl.latencyAvgData.largeGhostArrayReversed);
                graph.array.splice(-90, 90, ...ctrl.latencyAvgData.largeArrayReversed);
                graph.needsUpdate = true;
                graph.graphNeedsUpdate = true;
            }
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

        // 3D radial graph — realtime update; absent until <Point3DGraph> mounts.
        const graph = ctrl.view.loadAvgGraph;

        if (graph) {
            graph.ghostArray.splice(-90, 90, ...ctrl.loadAvgData.largeGhostArrayReversed);
            graph.array.splice(-90, 90, ...ctrl.loadAvgData.largeArrayReversed);
            graph.needsUpdate = true;

            if (ctrl.loadAvgData.smallCounter === 0) {
                graph.ghostArray.splice(0, 12, ...ctrl.loadAvgData.smallGhostArrayReversed);
                graph.array.splice(0, 12, ...ctrl.loadAvgData.smallArrayReversed);
                graph.needsUpdate = true;
                graph.graphNeedsUpdate = true;
            }

            if (ctrl.loadAvgData.largeCounter === 0) {
                graph.ghostArray.splice(-90, 90, ...ctrl.loadAvgData.largeGhostArrayReversed);
                graph.array.splice(-90, 90, ...ctrl.loadAvgData.largeArrayReversed);
                graph.needsUpdate = true;
                graph.graphNeedsUpdate = true;
            }
        }
    }

    // ── Clients ──────────────────────────────────────────────────────────────

    if (ctrl.clientsData && numClients !== undefined) {
        if (uiRefs.clientsText.current) {
            uiRefs.clientsText.current.innerHTML = numClients;
        }

        ctrl.clientsData.update(numClients);

        // 3D radial graph — absent until <Point3DGraph> mounts.
        const graph = ctrl.view.clientsGraph;

        if (graph) {
            if (ctrl.clientsData.smallCounter === 0) {
                graph.ghostArray.splice(0, 12, ...ctrl.clientsData.smallGhostArrayReversed);
                graph.array.splice(0, 12, ...ctrl.clientsData.smallArrayReversed);
                graph.needsUpdate = true;
                graph.graphNeedsUpdate = true;
            }

            if (ctrl.clientsData.largeCounter === 0) {
                graph.ghostArray.splice(-90, 90, ...ctrl.clientsData.largeGhostArrayReversed);
                graph.array.splice(-90, 90, ...ctrl.clientsData.largeArrayReversed);
                graph.needsUpdate = true;
                graph.graphNeedsUpdate = true;
            }
        }
    }
}

/**
 * Refreshes timestamp-based labels and date-change markers on the 3D graphs.
 */
function refresh(ctrl) {
    if (!ctrl.view.latencyAvgGraph) return;

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

function TrackedPoint({ ctrlRef, mesh, pointConfig, pointRef, panelRef, graphRef, graphRefs, latencyAvgGraphRef, loadAvgGraphRef, clientsGraphRef }) {
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

    // Apply deferred graph.setIndex(1) and replay any data that arrived before
    // the graphs mounted, once the container handle is available.
    useEffect(() => {
        graphRef.current?.setIndex(1);
        applyGraphData(ctrlRef.current);
    }, [ctrlRef, graphRef]);

    return (
        <Point3D
            object={mesh}
            name={pointConfig.name}
            ref={pointRef}
            type={pointConfig.type}
        >
            <Point3DPanel ref={panelRef} items={pointConfig.items} />
            <Point3DGraph
                ref={graphRef}
                start={-45}
                graphHeight={40}
                graphRefs={graphRefs}
            >
                <RadialGraphSegmentsCanvas
                    ref={latencyAvgGraphRef}
                    start={-45}
                    graphHeight={40}
                    resolution={102}
                    tension={12}
                    lookupPrecision={[25, 200]}
                    segments={[12, 90]}
                    ratio={[0.125, 0.875]}
                    labels={['', '12hrs']}
                    range={300}
                    suffix="ms"
                    hoverLabels
                    noMarkerDrag
                />
                <RadialGraphSegmentsCanvas
                    ref={loadAvgGraphRef}
                    start={-45}
                    graphHeight={40}
                    resolution={102}
                    tension={6}
                    lookupPrecision={[25, 200]}
                    segments={[12, 90]}
                    ratio={[0.125, 0.875]}
                    labels={['', '12hrs']}
                    range={400}
                    suffix="%"
                    hoverLabels
                    noMarkerDrag
                />
                <RadialGraphSegmentsCanvas
                    ref={clientsGraphRef}
                    start={-45}
                    graphHeight={40}
                    resolution={102}
                    tension={12}
                    lookupPrecision={[25, 200]}
                    segments={[12, 90]}
                    ratio={[0.125, 0.875]}
                    labels={['', '12hrs']}
                    range={10}
                    hoverLabels
                    noMarkerDrag
                />
            </Point3DGraph>
        </Point3D>
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
    const panelRef = useRef(null);
    const pointConfigRef = useRef(null);

    // Graph refs for declarative RadialGraphSegmentsCanvas children.
    const latencyAvgGraphRef = useRef(null);
    const loadAvgGraphRef = useRef(null);
    const clientsGraphRef = useRef(null);
    const graphRef = useRef(null);
    const graphRefs = useMemo(() => [latencyAvgGraphRef, loadAvgGraphRef, clientsGraphRef], []);

    // Store graph refs on ctrl via a one-time effect so initPanel can find them.
    useEffect(() => {
        const ctrl = ctrlRef.current;
        ctrl.latencyAvgGraphRef = latencyAvgGraphRef;
        ctrl.loadAvgGraphRef = loadAvgGraphRef;
        ctrl.clientsGraphRef = clientsGraphRef;
        ctrl.graphRef = graphRef;
        ctrl.graphRefs = graphRefs;
        ctrl.panelRef = panelRef;
    }, [graphRefs]);
    const [mesh, setMesh] = useState(null);
    const [pointConfig, setPointConfig] = useState(null);

    const pointAdapter = useMemo(() => ({
        animateOut: (...args) => pointRef.current?.animateOut(...args),
        deactivate: () => pointRef.current?.deactivate(),
        getPanelIndex: name => panelRef.current?.getPanelIndex?.(name),
        getPanelValue: name => panelRef.current?.getPanelValue?.(name),
        get instances() {
            return pointRef.current?.instances ?? [];
        },
        get mesh() {
            return pointRef.current?.mesh;
        },
        onHover: event => pointRef.current?.onHover(event),
        setData: data => pointRef.current?.setData(data),
        setPanelIndex: (name, index, path) => panelRef.current?.setPanelIndex?.(name, index, path),
        setPanelValue: (name, value, path) => panelRef.current?.setPanelValue?.(name, value, path)
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
                        panelRef={panelRef}
                        pointRef={pointRef}
                        graphRef={graphRef}
                        graphRefs={graphRefs}
                        latencyAvgGraphRef={latencyAvgGraphRef}
                        loadAvgGraphRef={loadAvgGraphRef}
                        clientsGraphRef={clientsGraphRef}
                    />
                </Points3D>
            )}
        </>
    );
}
