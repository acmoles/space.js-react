import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';

import { clearTween, delayedCall, wait } from '@/space/motion/index.js';

import { Example } from '@/components';
import { UI } from '@/space/index.js';

import { MarsScene } from './MarsScene.jsx';
import { Preloader } from './Preloader.jsx';
import { dataPath, isDebug, numViews } from './config.js';

// Per-view captions and directional-light positions, copied verbatim from
// `App.setView` in the original Mars app.
const CAPTIONS = [
    'Oblique view',
    'North polar view',
    'South polar view',
    'Southern hemisphere view',
    'Surface close-up view',
    'Horizon view'
];

const LIGHT_POSITIONS = [
    [-3, 1.5, 3],
    [-1.5, 3, -1.5],
    [1.5, -3, -1.5],
    [-3, 1.5, 3],
    [-3, 1.5, 3],
    [-3, 1.5, -1.5]
];

// Extra `details` fields merged onto each page's data (from `App.initViews`).
const DETAILS_EXTRAS = {
    dividerLine: true,
    width: 'max(50vw, 250px)'
};

const DETAILS_INFO = {
    title: 'Mars',
    content: /* html */ `
Distance from Sun: 230 million km
<br>Mass: 0.107 Earths
<br>Surface gravity: 0.3794 Earths
                `
};

/**
 * Returns the initial view index from the `?view=` query parameter (1-based in
 * the URL, 0-based internally), mirroring `App.init`.
 */
function getInitialViewIndex() {
    const params = new URL(location.href).searchParams;

    return params.has('view') ? Number(params.get('view')) - 1 : 0;
}

/**
 * Returns true when the anchor's raw href is an internal Mars data path
 * (`/` or `/about`), which must be intercepted rather than opened in a new tab.
 */
function internalHref(anchor) {
    if (!anchor) {
        return null;
    }

    const href = anchor.getAttribute('href');

    if (href === '/' || href === '/about') {
        return href;
    }

    return null;
}

/**
 * Mars example.
 *
 * A cinematic Mars demo: a cube-textured globe, a volumetric-light sun with
 * lensflare, a multi-pass post-processing pipeline, six framed camera views, a
 * data-driven details panel, a nested control panel and ambient audio.
 *
 * Ported from `examples/mars/` (three.js + alien.js). The three.js scene lives
 * in {@link MarsScene} (inside the R3F `<Canvas>`, taking over rendering); this
 * component owns the React UI, the preloader and the orchestration that the
 * original `App` controller performed.
 *
 * @param {object} props
 * @param {string} props.title Route title, provided by the examples registry.
 */
export default function Mars({ title }) {
    const [progress, setProgress] = useState(0);
    const [loadingLabel, setLoadingLabel] = useState('Loading');
    const [ready, setReady] = useState(false);
    const [started, setStarted] = useState(false);

    const [detailsData, setDetailsData] = useState(null);
    const [headerCaption, setHeaderCaption] = useState(CAPTIONS[0]);
    const [detailsNumber, setDetailsNumber] = useState(1);
    const [panelItems, setPanelItems] = useState(null);

    const ctrlRef = useRef(null);
    const uiRef = useRef(null);
    const preloaderRef = useRef(null);
    const dataRef = useRef(null);
    const scrollTimeoutRef = useRef(null);
    const mountedRef = useRef(true);
    const viewIndexRef = useRef(getInitialViewIndex());

    // ── Load the data file up front (also warmed by the asset loader) ─────────
    useEffect(() => {
        mountedRef.current = true;

        let cancelled = false;

        (async () => {
            const res = await fetch(dataPath);
            const data = await res.json();

            if (cancelled) {
                return;
            }

            const byPath = new Map();
            data.pages.forEach(page => byPath.set(page.path, page));
            dataRef.current = { pages: data.pages, byPath };

            setDetailsData({ ...DETAILS_EXTRAS, ...data.pages[0].details });
        })();

        return () => {
            cancelled = true;
            mountedRef.current = false;
            clearTween(scrollTimeoutRef.current);
            document.documentElement.classList.remove('scroll');
        };
    }, []);

    // ── View switching ────────────────────────────────────────────────────────
    const setView = useCallback(index => {
        const ctrl = ctrlRef.current;

        if (!ctrl || !ctrl.world) {
            return;
        }

        const w = ctrl.world;
        const cameras = [
            [w.obliqueCamera, w.obliqueCameraControls],
            [w.northPolarCamera, w.northPolarCameraControls],
            [w.southPolarCamera, w.southPolarCameraControls],
            [w.point1Camera, w.point1CameraControls],
            [w.point2Camera, w.point2CameraControls],
            [w.point3Camera, w.point3CameraControls]
        ];

        const [camera, controls] = cameras[index];
        const [lx, ly, lz] = LIGHT_POSITIONS[index];

        // Move the directional light directly (works whether or not the Mars
        // sub-panel is mounted), then sync the sliders when it is shown. The
        // React panel `setPanelValue` does not recurse into nested panels.
        if (ctrl.lights && ctrl.lights[1]) {
            ctrl.lights[1].position.set(lx, ly, lz);
        }

        const panel = ctrl.marsPanelRef?.current;

        if (panel) {
            panel.setPanelValue('Light X', lx);
            panel.setPanelValue('Light Y', ly);
            panel.setPanelValue('Light Z', lz);
        }

        w.setCamera(camera, controls);
        ctrl.cameraController.setCamera(camera, controls);
        ctrl.renderManager.setCamera(camera);

        viewIndexRef.current = index;
        setHeaderCaption(CAPTIONS[index]);
        setDetailsNumber(index + 1);
    }, []);

    const prevView = useCallback(() => {
        let index = viewIndexRef.current;

        if (--index < 0) {
            index = numViews - 1;
        }

        setView(index);
    }, [setView]);

    const nextView = useCallback(() => {
        let index = viewIndexRef.current;

        if (++index > numViews - 1) {
            index = 0;
        }

        setView(index);
    }, [setView]);

    // ── MarsScene callbacks ────────────────────────────────────────────────────
    const handleProgress = useCallback(event => {
        setProgress(event.progress);
    }, []);

    const handlePhase = useCallback(label => {
        setLoadingLabel(label);
    }, []);

    const handleReady = useCallback(ctrl => {
        ctrlRef.current = ctrl;
        setPanelItems(ctrl.panelItems);
        setReady(true);
    }, []);

    // Once the UI has mounted, apply the initial view (mirrors `setView` during
    // `App.init`, before `animateIn`).
    useEffect(() => {
        if (ready) {
            setView(viewIndexRef.current);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready]);

    // ── Details open/close bridge ──────────────────────────────────────────────
    const handleDetails = useCallback(({ open }) => {
        clearTween(scrollTimeoutRef.current);

        if (open) {
            document.documentElement.classList.add('scroll');
        } else {
            scrollTimeoutRef.current = delayedCall(400, () => {
                document.documentElement.classList.remove('scroll');
            });
        }

        ctrlRef.current?.cameraController.setDetails(open);
    }, []);

    // ── Keyboard shortcuts (Left/Right/Ctrl+1-6) ───────────────────────────────
    useEffect(() => {
        if (!ready) {
            return;
        }

        const onKeyUp = e => {
            if (e.keyCode === 37) {
                prevView();
            }

            if (e.keyCode === 39) {
                nextView();
            }

            if (e.ctrlKey && e.keyCode >= 49 && e.keyCode <= 54) {
                setView(e.keyCode - 49);
            }
        };

        window.addEventListener('keyup', onKeyUp);

        return () => window.removeEventListener('keyup', onKeyUp);
    }, [ready, prevView, nextView, setView]);

    // ── Details internal-link interception + UI audio ──────────────────────────
    const handleWrapperClick = useCallback(event => {
        const ctrl = ctrlRef.current;
        const anchor = event.target.closest('a');
        const href = internalHref(anchor);

        if (href) {
            event.preventDefault();

            const data = dataRef.current?.byPath.get(href);

            if (data) {
                setDetailsData({ ...DETAILS_EXTRAS, ...data.details });
            }
        }

        if (ctrl && event.target.closest('a, button, .link, .info')) {
            ctrl.audio.click();
        }
    }, []);

    const lastHoverRef = useRef(null);

    const handleWrapperOver = useCallback(event => {
        const ctrl = ctrlRef.current;

        if (!ctrl) {
            return;
        }

        const interactive = event.target.closest('a, button, .link, .info');

        if (interactive && interactive !== lastHoverRef.current) {
            lastHoverRef.current = interactive;
            ctrl.audio.hover();
        } else if (!interactive) {
            lastHoverRef.current = null;
        }
    }, []);

    // ── Start (user gesture) → animate in ──────────────────────────────────────
    const handleStart = useCallback(async () => {
        const ctrl = ctrlRef.current;

        if (!ctrl) {
            return;
        }

        // App.start(): begin the ambient loop and the sun transition.
        ctrl.audio.trigger('mars_start');
        ctrl.cameraController.start();

        await preloaderRef.current?.animateOut();

        if (!mountedRef.current) {
            return;
        }

        setStarted(true);

        // App.animateIn(): fade the canvas, run the 7s camera zoom, reveal the
        // scene, then stagger in the details info and the rest of the UI.
        ctrl.animatedIn = true;
        ctrl.world.animateIn();
        ctrl.cameraController.animateIn();
        ctrl.sceneView.visible = true;

        if (isDebug) {
            uiRef.current?.animateDetailsInfoIn();
            uiRef.current?.animateIn();
            return;
        }

        await wait(6000);

        if (!mountedRef.current) {
            return;
        }

        uiRef.current?.animateDetailsInfoIn();

        await wait(3000);

        if (!mountedRef.current) {
            return;
        }

        uiRef.current?.animateIn();
    }, []);

    return (
        <Example title={title}>
            {/* React UI overlay — rendered outside the Canvas so it lives in the
                normal DOM. The wrapper delegates internal-link interception and
                UI audio (hover/click). */}
            {ready && detailsData && (
                <div onClickCapture={handleWrapperClick} onMouseOver={handleWrapperOver}>
                    <UI
                        ref={uiRef}
                        fps
                        panelItems={panelItems}
                        header={{ title: { name: 'Mars', caption: headerCaption } }}
                        footer={{ info: { name: 'Next view', callback: nextView } }}
                        detailsButton={{ number: detailsNumber, total: numViews }}
                        details={detailsData}
                        detailsInfo={DETAILS_INFO}
                        onDetails={handleDetails}
                        style={{ position: 'static' }}
                    />
                </div>
            )}

            <Canvas
                linear
                flat
                gl={{ powerPreference: 'high-performance', antialias: false }}
                dpr={window.devicePixelRatio}
            >
                <MarsScene
                    onProgress={handleProgress}
                    onPhase={handlePhase}
                    onReady={handleReady}
                />
            </Canvas>

            {!started && (
                <Preloader
                    ref={preloaderRef}
                    progress={progress}
                    loading={loadingLabel}
                    onStart={handleStart}
                />
            )}
        </Example>
    );
}
