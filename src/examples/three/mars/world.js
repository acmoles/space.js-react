import { Color, ColorManagement, DirectionalLight, HemisphereLight, LinearSRGBColorSpace, MathUtils, PerspectiveCamera, SRGBColorSpace, Scene, Vector2 } from 'three';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ArcballControls } from 'three/addons/controls/ArcballControls.js';
import { TextureLoader, getFullscreenTriangle } from '@lib/three.js';
import { clearTween, tween } from '@/space/motion/index.js';

import { assetPath } from './config.js';

/**
 * World setup for the Mars example.
 *
 * Ported from the static `WorldController` in
 * `examples/mars/src/controllers/world/WorldController.js` to an instance so it
 * survives React StrictMode double-mounts and route navigation without leaking
 * global GPU/loader state. Uses the R3F-provided `WebGLRenderer` (`gl`) instead
 * of creating its own.
 */
export class World {
    constructor(renderer) {
        this.renderer = renderer;

        this.backgroundIntensity = 1.2;

        // Save globals so we can restore them on destroy
        this._prevColorManagement = ColorManagement.enabled;
        this._prevOutputColorSpace = renderer.outputColorSpace;

        this.initWorld();
        this.initLights();
        this.initLoaders();
        this.initBackground();
        this.initControls();

        this.addListeners();
    }

    initWorld() {
        const renderer = this.renderer;

        // Disable color management
        ColorManagement.enabled = false;
        renderer.outputColorSpace = LinearSRGBColorSpace;

        // 3D scene
        this.scene = new Scene();
        this.scene.background = new Color(
            getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim() || '#0e0e0e'
        );

        // Oblique camera
        this.obliqueCamera = new PerspectiveCamera(30);
        this.obliqueCamera.near = 0.1;
        this.obliqueCamera.far = 20000;
        this.obliqueCamera.position.set(-1.3, 0.7, 2.015);
        this.obliqueCamera.lookAt(this.scene.position);

        // North polar camera
        this.northPolarCamera = new PerspectiveCamera(30);
        this.northPolarCamera.near = 0.1;
        this.northPolarCamera.far = 20000;
        this.northPolarCamera.position.set(0, 2.5, 0);
        this.northPolarCamera.lookAt(this.scene.position);

        // South polar camera
        this.southPolarCamera = new PerspectiveCamera(30);
        this.southPolarCamera.near = 0.1;
        this.southPolarCamera.far = 20000;
        this.southPolarCamera.position.set(0, -2.5, 0);
        this.southPolarCamera.lookAt(this.scene.position);

        // Point of interest #1 camera
        this.point1Camera = new PerspectiveCamera(30);
        this.point1Camera.near = 0.1;
        this.point1Camera.far = 20000;
        this.point1Camera.position.set(0, -0.25, 1.6);

        // Point of interest #2 camera
        this.point2Camera = new PerspectiveCamera(30);
        this.point2Camera.near = 0.1;
        this.point2Camera.far = 20000;
        this.point2Camera.position.set(0, 0, 1.25);

        // Point of interest #3 camera
        this.point3Camera = new PerspectiveCamera(30);
        this.point3Camera.near = 0.1;
        this.point3Camera.far = 20000;
        this.point3Camera.position.set(-0.62, 0, 1);
        this.point3Camera.rotation.y = MathUtils.degToRad(-10);
        this.point3Camera.rotation.z = MathUtils.degToRad(90);

        // Output camera
        this.camera = this.obliqueCamera;

        // Global geometries
        this.screenTriangle = getFullscreenTriangle();

        // Global uniforms
        this.resolution = { value: new Vector2() };
        this.texelSize = { value: new Vector2() };
        this.aspect = { value: 1 };
        this.time = { value: 0 };
        this.frame = { value: 0 };

        // Global settings
        this.anisotropy = 8;

        // Start with the canvas hidden; `animateIn()` fades it in once the
        // preloader has animated out (mirrors WorldController canvas opacity).
        this.renderer.domElement.style.opacity = 0;
    }

    initLights() {
        this.scene.add(new HemisphereLight(0x606060, 0x404040, 0));

        const light = new DirectionalLight(0xffffff, 3);
        light.position.set(-3, 1.5, 3);
        this.scene.add(light);
    }

    initLoaders() {
        this.textureLoader = new TextureLoader();
        this.textureLoader.setPath(`${assetPath}/textures/`);

        this.ktx2Loader = new KTX2Loader();
        this.ktx2Loader.setPath(`${assetPath}/textures/cube/`);
        this.ktx2Loader.setTranscoderPath('https://www.gstatic.com/basis-universal/versioned/2021-04-15-ba1c3e4/');
        this.ktx2Loader.detectSupport(this.renderer);
    }

    async initBackground() {
        try {
            const cubeTexture = await this.loadCompressedTexture('hiptyc_2020_cube.ktx2');

            if (this._destroyed) {
                cubeTexture.dispose();
                return;
            }

            cubeTexture.colorSpace = SRGBColorSpace;

            this.scene.background = cubeTexture;
            this.scene.backgroundIntensity = this.backgroundIntensity;
            this.scene.backgroundRotation.x = MathUtils.degToRad(180);
            this.scene.backgroundRotation.z = MathUtils.degToRad(180);
        } catch (err) {
            // The compressed star map is transcoded via an external basis
            // transcoder; if it is unavailable (e.g. offline) keep the flat
            // background colour rather than crashing the scene.
            console.warn('Mars: star map background unavailable', err);
        }
    }

    initControls() {
        const dom = this.renderer.domElement;

        // Oblique camera controls
        this.obliqueCameraControls = new OrbitControls(this.obliqueCamera, dom);
        this.obliqueCameraControls.rotateSpeed = 1;
        this.obliqueCameraControls.enableDamping = true;
        this.obliqueCameraControls.enabled = false;

        // North polar camera controls
        this.northPolarCameraControls = new ArcballControls(this.northPolarCamera, dom);
        this.northPolarCameraControls.rotateSpeed = 1;
        this.northPolarCameraControls.enableAnimations = false;
        this.northPolarCameraControls.enabled = false;

        // South polar camera controls
        this.southPolarCameraControls = new ArcballControls(this.southPolarCamera, dom);
        this.southPolarCameraControls.rotateSpeed = 1;
        this.southPolarCameraControls.enableAnimations = false;
        this.southPolarCameraControls.enabled = false;

        // Point of interest #1 camera controls
        this.point1CameraControls = new ArcballControls(this.point1Camera, dom);
        this.point1CameraControls.rotateSpeed = 0.5;
        this.point1CameraControls.enableAnimations = false;
        this.point1CameraControls.enabled = false;

        // Point of interest #2 camera controls
        this.point2CameraControls = new ArcballControls(this.point2Camera, dom);
        this.point2CameraControls.rotateSpeed = 0.25;
        this.point2CameraControls.enableAnimations = false;
        this.point2CameraControls.enabled = false;

        // Point of interest #3 camera controls
        this.point3CameraControls = new ArcballControls(this.point3Camera, dom);
        this.point3CameraControls.rotateSpeed = 0.25;
        this.point3CameraControls.enableAnimations = false;
        this.point3CameraControls.enabled = false;

        // Output camera controls
        this.controls = this.obliqueCameraControls;
        this.controls.enabled = true;
    }

    addListeners() {
        this.renderer.domElement.addEventListener('touchstart', this.onTouchStart);
    }

    removeListeners() {
        this.renderer.domElement.removeEventListener('touchstart', this.onTouchStart);
    }

    // Event handlers

    onTouchStart = e => {
        e.preventDefault();
    };

    // Public methods

    setCamera = (camera, controls) => {
        this.camera = camera;
        this.controls = controls;

        this.obliqueCameraControls.enabled = false;
        this.northPolarCameraControls.enabled = false;
        this.southPolarCameraControls.enabled = false;
        this.point1CameraControls.enabled = false;
        this.point2CameraControls.enabled = false;
        this.point3CameraControls.enabled = false;

        this.controls.enabled = true;
    };

    resize = (width, height, dpr) => {
        width = Math.round(width * dpr);
        height = Math.round(height * dpr);

        this.resolution.value.set(width, height);
        this.texelSize.value.set(1 / width, 1 / height);
        this.aspect.value = width / height;
    };

    update = (time, delta, frame) => {
        this.time.value = time;
        this.frame.value = frame;
    };

    animateIn = () => {
        const el = this.renderer.domElement;
        const holder = { opacity: 0 };

        clearTween(holder);

        tween(holder, { opacity: 1 }, 1000, 'linear', 0, () => {
            el.style.opacity = '';
        }, () => {
            el.style.opacity = holder.opacity;
        });

        this._canvasFade = holder;
    };

    ready = () => Promise.all([
        this.textureLoader.ready()
    ]);

    // Global handlers

    loadTexture = path => this.textureLoader.loadAsync(path);

    loadCompressedTexture = path => this.ktx2Loader.loadAsync(path);

    destroy = () => {
        this._destroyed = true;

        this.removeListeners();

        if (this._canvasFade) {
            clearTween(this._canvasFade);
        }

        // Restore the canvas opacity in case a fade was in progress
        if (this.renderer && this.renderer.domElement) {
            this.renderer.domElement.style.opacity = '';
        }

        [
            this.obliqueCameraControls,
            this.northPolarCameraControls,
            this.southPolarCameraControls,
            this.point1CameraControls,
            this.point2CameraControls,
            this.point3CameraControls
        ].forEach(controls => controls && controls.dispose());

        if (this.ktx2Loader) {
            this.ktx2Loader.dispose();
        }

        if (this.screenTriangle) {
            this.screenTriangle.dispose();
        }

        if (this.scene?.background?.isTexture) {
            this.scene.background.dispose();
        }

        // Restore globals mutated on construction
        ColorManagement.enabled = this._prevColorManagement;
        this.renderer.outputColorSpace = this._prevOutputColorSpace;
    };
}
