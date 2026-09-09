import { useEffect, useRef } from 'react';
import { useFrame, useStore, useThree } from '@react-three/fiber';

import { AssetLoader, MultiLoader, defer, wait } from '@lib/three.js';

import { startTicker } from '@/space/motion';

import { World } from './world.js';
import { SceneView } from './scene/SceneView.js';
import { RenderManager } from './RenderManager.js';
import { CameraController } from './CameraController.js';
import { AudioController } from './AudioController.js';
import { createPanelItems } from './panels/index.js';
import { assetPath, dataPath, resetParams } from './config.js';

/**
 * Asset list for the loader, mirroring `Preloader.initLoader` in the original.
 * Adapted to the SPA served paths. The compressed star map (ktx2) is loaded
 * separately by `World.initBackground`, matching the original's commented-out
 * preloader entry.
 */
const assetList = [
    dataPath,
    `${assetPath}/textures/cube/mars/mars_basecolor_px.jpg`,
    `${assetPath}/textures/cube/mars/mars_basecolor_nx.jpg`,
    `${assetPath}/textures/cube/mars/mars_basecolor_py.jpg`,
    `${assetPath}/textures/cube/mars/mars_basecolor_ny.jpg`,
    `${assetPath}/textures/cube/mars/mars_basecolor_pz.jpg`,
    `${assetPath}/textures/cube/mars/mars_basecolor_nz.jpg`,
    `${assetPath}/textures/cube/mars/mars_normal_px.jpg`,
    `${assetPath}/textures/cube/mars/mars_normal_nx.jpg`,
    `${assetPath}/textures/cube/mars/mars_normal_py.jpg`,
    `${assetPath}/textures/cube/mars/mars_normal_ny.jpg`,
    `${assetPath}/textures/cube/mars/mars_normal_pz.jpg`,
    `${assetPath}/textures/cube/mars/mars_normal_nz.jpg`,
    `${assetPath}/textures/smaa/area.png`,
    `${assetPath}/textures/smaa/search.png`,
    `${assetPath}/sounds/enough_loop.mp3`,
    `${assetPath}/sounds/hover.mp3`,
    `${assetPath}/sounds/click.mp3`
];

/**
 * R3F scene content for the Mars example.
 *
 * Builds the entire three.js world (Mars globe, Sun, multi-pass render
 * pipeline, per-view cameras) on the R3F-provided renderer, runs the original
 * load/precompile/init sequence, and takes over rendering via a positive
 * priority `useFrame` (which disables R3F's own auto-render).
 *
 * All GPU/loader/audio/ticker resources are torn down in the effect cleanup so
 * the scene survives React StrictMode double-mounts and route navigation.
 *
 * @param {object}   props
 * @param {function} props.onProgress Called with `{ progress }` (0..1).
 * @param {function} props.onPhase    Called with the current loading label.
 * @param {function} props.onReady    Called with the assembled controller bag.
 */
export function MarsScene({ onProgress, onPhase, onReady }) {
    const store = useStore();
    const size = useThree(s => s.size);

    const ctrlRef = useRef({});
    const pipelineRef = useRef(null);
    const frameRef = useRef(0);

    // ── Resize ────────────────────────────────────────────────────────────────
    useEffect(() => {
        const ctrl = ctrlRef.current;

        if (!ctrl.world) {
            return;
        }

        const width = size.width;
        const height = size.height;
        const dpr = window.devicePixelRatio;

        ctrl.world.resize(width, height, dpr);
        ctrl.cameraController.resize(width, height);
        ctrl.sceneView.resize();
        ctrl.renderManager.resize(width, height, dpr);
    }, [size]);

    // ── Init / teardown ───────────────────────────────────────────────────────
    useEffect(() => {
        const { gl } = store.getState();
        const ctrl = {};
        ctrlRef.current = ctrl;
        ctrl.destroyed = false;

        // Reset the shared params singleton so a StrictMode remount starts clean.
        resetParams();

        // Build the world synchronously (fast); textures load asynchronously.
        const world = new World(gl);
        const sceneView = new SceneView(world);
        world.scene.add(sceneView);

        const renderManager = new RenderManager(world);
        renderManager.init(gl, world.scene, world.camera, sceneView);

        const cameraController = new CameraController();
        cameraController.init(world, renderManager);

        const audio = new AudioController();

        ctrl.world = world;
        ctrl.sceneView = sceneView;
        ctrl.renderManager = renderManager;
        ctrl.cameraController = cameraController;
        ctrl.audio = audio;

        // Aliases used by the panel builders
        ctrl.scene = world.scene;
        ctrl.view = sceneView;

        // Initial resize
        const { width, height } = store.getState().size;
        const dpr = window.devicePixelRatio;
        world.resize(width, height, dpr);
        cameraController.resize(width, height);
        renderManager.resize(width, height, dpr);

        // Enable the render loop
        pipelineRef.current = ctrl;

        (async () => {
            onPhase?.('Loading');

            const assetLoader = new AssetLoader();
            assetLoader.cache = true;
            assetLoader.loadAll(assetList);

            const loader = new MultiLoader();
            loader.load(assetLoader);
            loader.add(2);
            loader.events.on('progress', handleProgress);

            ctrl.loader = loader;
            ctrl.assetLoader = assetLoader;

            // Mirrors the original dynamic-import trigger step
            loader.trigger(1);

            onPhase?.('Transfer');
            await Promise.all([
                document.fonts.ready,
                assetLoader.ready()
            ]);
            if (ctrl.destroyed) {
                return;
            }

            onPhase?.('Data');

            onPhase?.('Textures');
            await sceneView.ready();
            await world.ready();
            if (ctrl.destroyed) {
                return;
            }

            onPhase?.('Shaders');
            sceneView.visible = true;
            await defer();
            await gl.compileAsync(sceneView, world.camera, world.scene);
            sceneView.visible = false;
            await wait(250);
            if (ctrl.destroyed) {
                return;
            }

            onPhase?.('Audio');
            audio.init(assetLoader.files);

            onPhase?.('View');
            const panelItems = createPanelItems(ctrl);
            ctrl.panelItems = panelItems;

            // Completes the loader → progress reaches 1
            loader.trigger(1);

            onPhase?.('Nominal');

            // Start the space.js ticker so tweens (camera, UI, panels) run.
            startTicker();

            if (!ctrl.destroyed) {
                onReady?.(ctrl);
            }
        })();

        function handleProgress(event) {
            if (!ctrl.destroyed) {
                onProgress?.(event);
            }
        }

        return () => {
            ctrl.destroyed = true;
            pipelineRef.current = null;
            ctrlRef.current = {};

            if (ctrl.loader) {
                ctrl.loader.events.off('progress', handleProgress);
                // MultiLoader.destroy() also destroys the child AssetLoader.
                ctrl.loader.destroy?.();
            }

            audio.destroy();
            cameraController.destroy();
            renderManager.destroy();
            world.destroy();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store]);

    // ── Render takeover (priority > 0 disables R3F's auto-render) ─────────────
    useFrame(({ clock }) => {
        const ctrl = pipelineRef.current;

        if (!ctrl || ctrl.destroyed) {
            return;
        }

        const time = clock.elapsedTime * 1000;
        const frame = frameRef.current++;

        ctrl.world.update(time, 0, frame);
        ctrl.cameraController.update();

        if (ctrl.sceneView.visible) {
            ctrl.sceneView.update();
        }

        ctrl.renderManager.update(time, 0, frame);
    }, 1);

    return null;
}
