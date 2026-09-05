/**
 * Shared scene wrapper for the two Server Status examples (socket and worker).
 *
 * Owns the emitter lifecycle, all React UI state, and the bag of imperative
 * refs that SceneContent writes to directly so that per-tick updates (latency,
 * load, etc.) bypass React re-renders. The `<UI>` is rendered outside the
 * `<Canvas>` so it lives in the normal DOM tree.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';

import { Stage } from '@lib/three.js';

import { Example } from '@/components';
import { useClassName } from '@/hooks';
import { UI } from '@/space/index.js';

import { SceneContent } from './SceneContent.jsx';

const isDebug = /[?&]debug/.test(location.search);

// ─── Content schema builder ───────────────────────────────────────────────────

/**
 * Constructs a stable Details content object from initial server data and the
 * shared `uiRefs` bag. Each dynamic element carries a ref so that SceneContent
 * can write to it imperatively (innerHTML / .update() / .setArray()) without
 * triggering React re-renders.
 *
 * @param {object} info  Formatted details from the first 'details' socket event.
 * @param {object} refs  Stable `uiRefs` bag (see `ServerStatusScene`).
 * @returns {object}     Data object for `<UI details={…} />`.
 */
function buildDetails(info, refs) {
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
    } = info;

    return {
        dividerLine: true,
        width: 'max(50vw, 250px)',
        style: { minWidth: 220 },
        title: 'server-status'.replace(/[\s.-]+/g, '_'),
        content: [
            // Block 0 — description
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
            // Block 1 — server version | uptime | latency meter
            {
                group: [
                    { title: 'Server version', content: serverVersion, width: 110 },
                    {
                        title: 'Uptime',
                        content: serverUptime,
                        contentRef: refs.uptime,
                        width: 200
                    },
                    {
                        title: 'Latency',
                        meter: { suffix: 'ms', range: 150, value: 0, width: 70, noRange: true },
                        meterRef: refs.latencyMeter,
                        width: 70
                    }
                ]
            },
            // Block 2 — network | clients
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
                        contentRef: refs.clientsText,
                        width: 70
                    }
                ]
            },
            // Block 3 — latency avg text + meter | latency rolling graph
            {
                group: [
                    {
                        title: 'Latency',
                        content: '0ms (avg)',
                        contentRef: refs.latencyAvgText,
                        width: 200,
                        meter: { range: 300, value: 0, width: 200, ghost: true, noText: true },
                        meterRef: refs.latencyAvgMeter
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
                        },
                        graphRef: refs.latencyGraph
                    }
                ]
            },
            // Block 4 — processor | vCPUs
            {
                group: [
                    { title: 'Processor', content: processorName, width: 330 },
                    { title: 'vCPUs', content: numProcessingUnits, width: 70 }
                ]
            },
            // Block 5 — load avg text + meter | load avg segments graph
            {
                group: [
                    {
                        title: 'Load',
                        content: '0% (1min avg)',
                        contentRef: refs.loadAvgText,
                        width: 200,
                        meter: { range: 400, value: 0, width: 200, ghost: true, noText: true },
                        meterRef: refs.loadAvgMeter
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
                        },
                        graphRef: refs.loadAvgGraph
                    }
                ]
            },
            // Block 6 — mem | swap
            {
                group: [
                    {
                        title: 'Mem',
                        content: `${memUsed} / ${memTotal} (${memUsedPercentage}%)`,
                        contentRef: refs.memText,
                        width: 200,
                        meter: { range: 100, value: memUsedPercentage, width: 200, noText: true },
                        meterRef: refs.memMeter
                    },
                    {
                        title: 'Swap',
                        content: `${swapUsed} / ${swapTotal} (${swapUsedPercentage}%)`,
                        contentRef: refs.swapText,
                        width: 200,
                        meter: { range: 100, value: swapUsedPercentage, width: 200, noText: true },
                        meterRef: refs.swapMeter
                    }
                ]
            },
            // Block 7 — storage
            {
                group: [
                    {
                        title: 'Storage',
                        content: `${storageUsed} / ${storageTotal} (${storageUsedPercentage}%)`,
                        contentRef: refs.storageText,
                        width: 200,
                        meter: { range: 100, value: storageUsedPercentage, width: 200, noText: true },
                        meterRef: refs.storageMeter
                    }
                ]
            }
        ]
    };
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Shared scene component for the Server Status examples.
 *
 * Accepts a `createSource` factory that produces `{ emitter, cleanup }` and
 * wires together the React UI (rendered outside the Canvas) with the R3F scene
 * content (cameras, 3D point tracker, data graphs) via a stable ref bag.
 *
 * @param {object}   props
 * @param {string}   props.title        Page/example title.
 * @param {function} props.createSource Factory: `() => { emitter, cleanup }`.
 */
export function ServerStatusScene({ title, createSource }) {
    // `scroll` on <html> lets the body scroll (body { position: unset })
    useClassName('scroll');

    const containerRef = useRef(null);
    const [overlayEl, setOverlayEl] = useState(null);

    // ── UI imperative handle ─────────────────────────────────────────────────
    const uiRef = useRef(null);

    // ── Details panel state ──────────────────────────────────────────────────
    // Built once from the first 'details' event; never reconstructed, so the
    // DOM tree inside <Details> is stable and the imperative refs stay valid.
    const [details, setDetails] = useState(null);

    // Divider snap element: set after the UI first renders so Points3D receives
    // the actual top-line DOM element (fixes bug a — getComputedStyle crash).
    const [dividerTopEl, setDividerTopEl] = useState(null);

    // ── Imperative ref bag ───────────────────────────────────────────────────
    // Initialised lazily inside onDetailsReceived (a callback) so that
    // .current is never read during render (satisfies react-hooks/refs) and
    // the bag object is never treated as state (satisfies react-hooks/immutability).
    // SceneContent receives the holder ref and accesses `uiRefsRef.current.xyz`.
    const uiRefsRef = useRef(null);

    // ── Callbacks for SceneContent ───────────────────────────────────────────

    /**
     * Called by SceneContent on the first 'details' event. Builds and mounts
     * the React UI, which populates the `uiRefs` bag as components commit.
     */
    const onDetailsReceived = useCallback(formattedDetails => {
        if (uiRefsRef.current === null) {
            uiRefsRef.current = {
                uptime: { current: null },
                latencyMeter: { current: null },
                latencyGraph: { current: null },
                latencyAvgText: { current: null },
                latencyAvgMeter: { current: null },
                loadAvgText: { current: null },
                loadAvgMeter: { current: null },
                loadAvgGraph: { current: null },
                clientsText: { current: null },
                memText: { current: null },
                memMeter: { current: null },
                swapText: { current: null },
                swapMeter: { current: null },
                storageText: { current: null },
                storageMeter: { current: null }
            };
        }
        setDetails(prev => prev ?? buildDetails(formattedDetails, uiRefsRef.current));
    }, []);

    /**
     * Called by SceneContent on subsequent 'details' events (reconnection).
     * Updates mem/swap/storage imperatively to avoid rebuilding the tree.
     */
    const onDetailsReconnect = useCallback(({ memUsed, memTotal, memUsedPercentage, swapUsed, swapTotal, swapUsedPercentage, storageUsed, storageTotal, storageUsedPercentage }) => {
        const r = uiRefsRef.current;
        if (!r) return;

        if (r.memText.current) r.memText.current.innerHTML = `${memUsed} / ${memTotal} (${memUsedPercentage}%)`;
        if (r.memMeter.current) r.memMeter.current.update(memUsedPercentage);
        if (r.swapText.current) r.swapText.current.innerHTML = `${swapUsed} / ${swapTotal} (${swapUsedPercentage}%)`;
        if (r.swapMeter.current) r.swapMeter.current.update(swapUsedPercentage);
        if (r.storageText.current) r.storageText.current.innerHTML = `${storageUsed} / ${storageTotal} (${storageUsedPercentage}%)`;
        if (r.storageMeter.current) r.storageMeter.current.update(storageUsedPercentage);
    }, []);

    // ── Post-render wiring ───────────────────────────────────────────────────

    // Once the UI has committed, animate it in, open details, and capture the
    // divider's top-line element for the Points3D snap boundary.
    useEffect(() => {
        if (!details) return;

        uiRef.current?.animateIn();
        uiRef.current?.toggleDetails(true);

        // The DividerLine DOM element is available after the commit phase.
        Promise.resolve().then(() => {
            const el = uiRef.current?.getDividerTopElement?.() ?? null;
            setDividerTopEl(el);
        });
    }, [details]);

    // ── Details ↔ camera bridge ──────────────────────────────────────────────

    // Relay the React UI's open/close toggle to the Stage event bus that
    // SceneContent listens to for camera transitions.
    const handleDetailsToggle = useCallback(({ open }) => {
        Stage.events.emit('details', { open });
    }, []);

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <Example title={title} ref={containerRef}>
            {/* React UI overlay — rendered outside the Canvas so it lives in
                the normal DOM (createPortal from inside Canvas fails with R3F) */}
            {details && (
                <UI
                    ref={uiRef}
                    fps
                    detailsButton
                    details={details}
                    onDetails={handleDetailsToggle}
                    style={{ position: 'static' }}
                />
            )}

            <Canvas
                gl={{ antialias: true }}
                dpr={window.devicePixelRatio}
                camera={{ fov: 35, near: 1, far: 2000, position: [0, 0, 10] }}
            >
                <SceneContent
                    containerRef={containerRef}
                    createSource={createSource}
                    isDebug={isDebug}
                    overlayEl={overlayEl}
                    uiRef={uiRef}
                    uiRefsRef={uiRefsRef}
                    dividerTopEl={dividerTopEl}
                    onDetailsReceived={onDetailsReceived}
                    onDetailsReconnect={onDetailsReconnect}
                />
            </Canvas>

            {/* Overlay div for Points3D line-drawing canvas and per-point panels */}
            <div
                ref={setOverlayEl}
                style={{ inset: 0, pointerEvents: 'none', position: 'absolute' }}
            />
        </Example>
    );
}
