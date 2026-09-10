import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useStore, useThree } from '@react-three/fiber';
import {
    Color,
    ColorManagement,
    DirectionalLight,
    HemisphereLight,
    LinearSRGBColorSpace,
    OrthographicCamera,
    PerspectiveCamera
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import {
    EnvironmentTextureLoader,
    Stage,
    TextureLoader,
    clearTween,
    defer,
    getFullscreenTriangle,
    tween
} from '@lib/three.js';

import {
    LightPanelController,
    Point3D,
    Point3DPanel,
    Points3D,
    useMaterialsPanelItems,
    usePoint3DContext
} from '@/space/three/index.js';

import { isDebug } from './config.js';
import { params, resetParams } from './state.js';
import { SceneView } from './scene/SceneView.js';
import { RenderManager } from './renderManager.js';
import { CameraController } from './cameraController.js';
import { registerAboutPatches } from './panels/registerPatches.js';
import { aboutHeaderPanelItems } from './panels/aboutHeaderPanel.js';

const TEXTURE_PATH = '/assets/textures/';
const ENV_PATH = '/assets/textures/env/';

// Tracker-sphere scale tweaks, matching ScenePanelController.initPanel().
const TRACKER_SCALES = {
    'Floating Crystal': [0.6, 1, 0.6],
    'Abstract Cube': [0.9, 0.9, 0.9]
};

/**
 * Captures the shared `<Points3D>` context so the imperative CameraController
 * can toggle tracker visibility, mirroring the reference `Point3D` singleton.
 */
function PointsBridge({ contextRef }) {
    const ctx = usePoint3DContext();

    useEffect(() => {
        contextRef.current = ctx;

        return () => {
            if (contextRef.current === ctx) {
                contextRef.current = null;
            }
        };
    }, [contextRef, ctx]);

    return null;
}

/**
 * Renders a single tracked object (Point3D + material inspector panel). Owns
 * the point ref, registers it so sibling panels can resolve it, and applies
 * the tracker-sphere scale tweak once the point has mounted.
 */
function AboutPoint({ mesh, name, type, uvTexture, meshToPoint }) {
    const pointRef = useRef(null);

    const panelUi = useMemo(() => ({
        uvTexture,
        get point() {
            return pointRef.current;
        },
        isDefault: true,
        constructor: {
            points: true,
            getPoint: targetMesh => meshToPoint.get(targetMesh)?.current ?? null,
            uvHelper: true
        }
    }), [uvTexture, meshToPoint]);

    const items = useMaterialsPanelItems(mesh, panelUi);

    useEffect(() => {
        meshToPoint.set(mesh, pointRef);

        const scale = TRACKER_SCALES[name];

        if (scale && pointRef.current?.mesh) {
            pointRef.current.mesh.scale.multiply({ x: scale[0], y: scale[1], z: scale[2] });
        }

        return () => {
            meshToPoint.delete(mesh);
        };
    }, [mesh, name, meshToPoint]);

    return (
        <Point3D
            object={mesh}
            name={name}
            type={type}
            uvTexture={uvTexture}
            ref={pointRef}
        >
            <Point3DPanel items={items} />
        </Point3D>
    );
}

/**
 * The About scene: dark planet, floating crystal, abstract cube, floor and
 * grid, driven through the ported RenderManager post-processing stack.
 * Rendering is taken over from React Three Fiber via
 * a high-priority `useFrame`, exactly as the reference app renders from its
 * `ticker` loop.
 */
export function AboutScene({ overlayEl, uiRef, uiProxy, onProgress, onPanelItems, sceneApiRef }) {
    const store = useStore();
    const size = useThree(s => s.size);

    const ctrlRef = useRef({});
    const pointsContextRef = useRef(null);

    const [sceneData, setSceneData] = useState(null);

    const onProgressRef = useRef(onProgress);
    const onPanelItemsRef = useRef(onPanelItems);

    useEffect(() => {
        onProgressRef.current = onProgress;
        onPanelItemsRef.current = onPanelItems;
    }, [onProgress, onPanelItems]);

    // ── Resize ────────────────────────────────────────────────────────────────

    useEffect(() => {
        const ctrl = ctrlRef.current;

        if (!ctrl.renderManager) {
            return;
        }

        const { gl } = store.getState();
        const { width, height } = size;
        const dpr = gl.getPixelRatio();

        ctrl.renderManager.resize(width, height, dpr);
        ctrl.cameraController.resize(width, height);
    }, [size, store]);

    // ── Main init effect ──────────────────────────────────────────────────────

    useEffect(() => {
        const ctrl = {};
        ctrlRef.current = ctrl;

        const { gl, scene } = store.getState();

        // Disable colour management to match the reference renderer output.
        const previousColorManagement = ColorManagement.enabled;
        ColorManagement.enabled = false;
        gl.outputColorSpace = LinearSRGBColorSpace;

        // Root styles + ticker (also required by Floor / BackgroundPanel).
        Stage.init();

        resetParams();

        // Canvas fades in during the start sequence.
        gl.domElement.style.opacity = '0';

        // ── Cameras ────────────────────────────────────────────────────────────

        scene.background = new Color(Stage.rootStyle.getPropertyValue('--bg-color').trim());

        const polarCamera = new PerspectiveCamera(30);
        polarCamera.near = 0.5;
        polarCamera.far = 40;
        polarCamera.position.set(0, 10, 0);
        polarCamera.lookAt(scene.position);
        polarCamera.manual = true;

        const obliqueCamera = new PerspectiveCamera(30);
        obliqueCamera.near = 0.5;
        obliqueCamera.far = 40;
        obliqueCamera.position.set(0, 6, 8);
        obliqueCamera.lookAt(scene.position);
        obliqueCamera.manual = true;

        const isometricCamera = new OrthographicCamera();
        isometricCamera.near = 0;
        isometricCamera.far = 40;
        isometricCamera.position.set(10, 10, 10);
        isometricCamera.lookAt(scene.position);
        isometricCamera.manual = true;

        const camera = obliqueCamera;

        // Project trackers and render through the active camera.
        store.getState().set({ camera });

        // ── Controls ───────────────────────────────────────────────────────────

        const polarCameraControls = new OrbitControls(polarCamera, gl.domElement);
        polarCameraControls.enableDamping = true;
        polarCameraControls.maxPolarAngle = 0;
        polarCameraControls.enabled = false;

        const obliqueCameraControls = new OrbitControls(obliqueCamera, gl.domElement);
        obliqueCameraControls.enableDamping = true;
        obliqueCameraControls.enabled = false;

        const isometricCameraControls = new OrbitControls(isometricCamera, gl.domElement);
        isometricCameraControls.enableDamping = true;
        isometricCameraControls.enabled = false;

        const controls = obliqueCameraControls;
        controls.enabled = true;

        const cameras = {
            polarCamera,
            obliqueCamera,
            isometricCamera,
            polarCameraControls,
            obliqueCameraControls,
            isometricCameraControls,
            camera,
            controls
        };
        ctrl.cameras = cameras;

        // ── Lights ─────────────────────────────────────────────────────────────

        const hemisphereLight = new HemisphereLight(0xffffff, 0x888888, 3);
        scene.add(hemisphereLight);

        const directionalLight = new DirectionalLight(0xffffff, 2);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        ctrl.lights = [hemisphereLight, directionalLight];

        // ── Loaders ────────────────────────────────────────────────────────────

        const textureLoader = new TextureLoader();
        textureLoader.setPath(TEXTURE_PATH);

        const environmentLoader = new EnvironmentTextureLoader(gl);
        environmentLoader.setPath(ENV_PATH);

        ctrl.textureLoader = textureLoader;
        ctrl.environmentLoader = environmentLoader;

        const getTexture = (path, callback) => textureLoader.load(path, callback);

        // ── Scene view ─────────────────────────────────────────────────────────

        const view = new SceneView();
        scene.add(view);
        ctrl.view = view;

        // ── Prevent default touch scrolling ────────────────────────────────────

        const onTouchStart = e => {
            e.preventDefault();
        };
        gl.domElement.addEventListener('touchstart', onTouchStart);
        ctrl.onTouchStart = onTouchStart;

        onProgressRef.current?.(0.5);

        // ── Async init ─────────────────────────────────────────────────────────

        const init = async () => {
            const environment = await environmentLoader.loadAsync('jewelry_black_contrast.jpg');

            if (ctrl.destroyed) {
                environment.dispose();
                return;
            }

            scene.environment = environment;
            scene.environmentIntensity = 1.2;
            ctrl.environment = environment;

            const uvTexture = await textureLoader.loadAsync('uv.jpg');

            if (ctrl.destroyed) {
                uvTexture.dispose();
                return;
            }

            ctrl.uvTexture = uvTexture;

            await Promise.all([document.fonts.ready, view.ready()]);

            if (ctrl.destroyed) {
                return;
            }

            // Precompile (SceneController.precompile()).
            view.visible = true;
            await defer();

            if (ctrl.destroyed) {
                return;
            }

            await gl.compileAsync(view, camera, scene);

            if (ctrl.destroyed) {
                return;
            }

            view.visible = false;

            // ── Render + camera controllers ────────────────────────────────────

            const renderManager = new RenderManager(gl, scene, camera, uiProxy, {
                screenTriangle: getFullscreenTriangle(),
                textureLoader,
                getTexture
            });
            ctrl.renderManager = renderManager;

            const cameraController = new CameraController(cameras, pointsContextRef);
            ctrl.cameraController = cameraController;

            // ── Material patches (Adjust / Subsurface / Helper) ────────────────

            ctrl.unregisterPatches = registerAboutPatches();
            LightPanelController.init(scene);
            LightPanelController.lights = ctrl.lights;

            // Initial resize now that render targets exist.
            const currentSize = store.getState().size;
            renderManager.resize(currentSize.width, currentSize.height, gl.getPixelRatio());
            cameraController.resize(currentSize.width, currentSize.height);

            // ── Trackable objects + per-object inspector UI ────────────────────

            const meshToPoint = new Map();

            const nextObjects = [view.darkPlanet, view.floatingCrystal, view.abstractCube].map(objectView => {
                const mesh = objectView.mesh;

                return {
                    id: mesh.uuid,
                    mesh,
                    name: mesh.material.name,
                    type: mesh.geometry.type
                };
            });

            if (ctrl.destroyed) {
                return;
            }

            setSceneData({ objects: nextObjects, uvTexture, meshToPoint });

            // ── Header hover panel ─────────────────────────────────────────────

            onPanelItemsRef.current?.(aboutHeaderPanelItems({
                scene,
                view,
                renderManager,
                ui: uiProxy
            }));

            onProgressRef.current?.(1);
        };

        init();

        // ── Invert (theme) handling ─────────────────────────────────────────────

        const onInvert = ({ invert }) => {
            ctrl.view?.invert(invert);
            ctrl.renderManager?.invert(invert);
        };
        Stage.events.on('invert', onInvert);
        ctrl.onInvert = onInvert;

        // ── UI toggle (Ctrl+0) → SceneController.toggle ────────────────────────

        const onUI = ({ open }) => {
            ctrl.view?.toggle(open);
        };
        Stage.events.on('ui', onUI);
        ctrl.onUI = onUI;

        // ── Menu / keyboard camera switching ────────────────────────────────────

        const setActiveCamera = index => {
            let nextCamera;
            let nextControls;

            if (index === 0) {
                nextCamera = polarCamera;
                nextControls = polarCameraControls;
            } else if (index === 1) {
                nextCamera = obliqueCamera;
                nextControls = obliqueCameraControls;
            } else if (index === 2) {
                nextCamera = isometricCamera;
                nextControls = isometricCameraControls;
            } else {
                return;
            }

            cameras.camera = nextCamera;
            cameras.controls = nextControls;

            polarCameraControls.enabled = false;
            obliqueCameraControls.enabled = false;
            isometricCameraControls.enabled = false;
            nextControls.enabled = true;

            store.getState().set({ camera: nextCamera });

            ctrl.cameraController?.setCamera(nextCamera, nextControls);
            ctrl.renderManager?.setCamera(nextCamera);
        };
        ctrl.setActiveCamera = setActiveCamera;

        const onCamera = ({ index }) => setActiveCamera(index);
        Stage.events.on('about-camera', onCamera);
        ctrl.onCamera = onCamera;

        const onKeyUp = e => {
            if (e.ctrlKey && e.keyCode >= 49 && e.keyCode <= 51) { // Ctrl 1-3
                setActiveCamera(e.keyCode - 49);
            }
        };
        window.addEventListener('keyup', onKeyUp);
        ctrl.onKeyUp = onKeyUp;

        // ── Start sequence (App.start) ──────────────────────────────────────────

        const start = async () => {
            if (ctrl.destroyed || !ctrl.renderManager) {
                return;
            }

            // WorldController.animateIn — fade the canvas in.
            const opacity = { value: 0 };
            tween(opacity, { value: 1 }, 1000, 'linear', 0, () => {
                gl.domElement.style.opacity = '';
            }, () => {
                gl.domElement.style.opacity = opacity.value;
            });
            ctrl.opacityTween = opacity;

            // SceneController.animateIn
            ctrl.view.visible = true;

            // RenderManager.animateIn
            ctrl.renderManager.animateIn();

            await new Promise(resolve => {
                ctrl.startTimeout = setTimeout(resolve, 1000);
            });

            if (ctrl.destroyed) {
                return;
            }

            // PanelController.animateIn — enable trackers.
            if (pointsContextRef.current) {
                pointsContextRef.current.state.current.enabled = true;
            }

            uiRef.current?.animateIn();
        };

        if (sceneApiRef) {
            sceneApiRef.current = { start };
        }

        // ── Cleanup ──────────────────────────────────────────────────────────────

        return () => {
            ctrl.destroyed = true;
            ctrlRef.current = {};

            if (sceneApiRef && sceneApiRef.current && sceneApiRef.current.start === start) {
                sceneApiRef.current = null;
            }

            clearTween(ctrl.opacityTween);

            if (ctrl.startTimeout) {
                clearTimeout(ctrl.startTimeout);
            }

            Stage.events.off('invert', ctrl.onInvert);
            Stage.events.off('ui', ctrl.onUI);
            Stage.events.off('about-camera', ctrl.onCamera);
            window.removeEventListener('keyup', ctrl.onKeyUp);
            gl.domElement.removeEventListener('touchstart', ctrl.onTouchStart);

            ctrl.cameraController?.destroy();
            ctrl.renderManager?.destroy();

            polarCameraControls.dispose();
            obliqueCameraControls.dispose();
            isometricCameraControls.dispose();

            scene.remove(view);
            view.destroy();

            scene.remove(hemisphereLight);
            scene.remove(directionalLight);
            hemisphereLight.dispose();
            directionalLight.dispose();

            LightPanelController.destroy();

            ctrl.unregisterPatches?.();

            if (scene.environment) {
                scene.environment = null;
            }
            ctrl.environment?.dispose();
            ctrl.uvTexture?.dispose();

            gl.domElement.style.opacity = '';

            ColorManagement.enabled = previousColorManagement;
        };
    }, [store, uiRef, uiProxy, sceneApiRef]);

    // Trackers start disabled (PanelController sets `Point3D.enabled = false`
    // until the app start sequence runs). Enforced once the points context is
    // available, before the deferred start sequence re-enables them.
    useEffect(() => {
        if (sceneData && pointsContextRef.current) {
            pointsContextRef.current.state.current.enabled = false;
        }
    }, [sceneData]);

    // ── Per-frame render loop (App.onUpdate) ─────────────────────────────────

    useFrame(({ clock }) => {
        const ctrl = ctrlRef.current;

        if (!ctrl.renderManager) {
            return;
        }

        const time = clock.elapsedTime;

        ctrl.cameraController.update();

        // SceneController.update
        if (ctrl.view.visible && (params.animate || !ctrl.sceneAnimatedOneFramePast)) {
            ctrl.view.update(time);
            ctrl.sceneAnimatedOneFramePast = !params.animate;
        }

        LightPanelController.update?.();

        ctrl.renderManager.update();
    }, 1);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <>
            {overlayEl && sceneData && (
                <Points3D container={overlayEl} headerSnap debug={isDebug}>
                    <PointsBridge contextRef={pointsContextRef} />
                    {sceneData.objects.map(object => (
                        <AboutPoint
                            key={object.id}
                            mesh={object.mesh}
                            name={object.name}
                            type={object.type}
                            uvTexture={sceneData.uvTexture}
                            meshToPoint={sceneData.meshToPoint}
                        />
                    ))}
                </Points3D>
            )}
        </>
    );
}
