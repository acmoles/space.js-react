import { clearTween, delayedCall } from '@/space/motion/index.js';

/**
 * Port of the About app's CameraController. Instead of the imperative
 * `Point3D` singleton it toggles the shared `<Points3D>` context state and
 * calls `animateOutAll()` after a camera transform, matching the original
 * behaviour of hiding open trackers while the user orbits.
 */
export class CameraController {
    constructor(cameras, points) {
        const {
            polarCamera,
            obliqueCamera,
            isometricCamera,
            polarCameraControls,
            obliqueCameraControls,
            isometricCameraControls,
            camera,
            controls
        } = cameras;

        this.polarCamera = polarCamera;
        this.obliqueCamera = obliqueCamera;
        this.isometricCamera = isometricCamera;
        this.polarCameraControls = polarCameraControls;
        this.obliqueCameraControls = obliqueCameraControls;
        this.isometricCameraControls = isometricCameraControls;
        this.camera = camera;
        this.controls = controls;

        // `points` is a getter/holder for the shared Points3D context.
        this.points = points;

        this.isDown = false;
        this.isTransforming = false;
        this.isAnimatingOut = false;

        this.addListeners();
    }

    getPointsState() {
        return this.points?.current?.state?.current ?? null;
    }

    addListeners() {
        this.polarCameraControls.addEventListener('change', this.onChange);
        this.polarCameraControls.addEventListener('start', this.onInteraction);
        this.polarCameraControls.addEventListener('end', this.onInteraction);

        this.obliqueCameraControls.addEventListener('change', this.onChange);
        this.obliqueCameraControls.addEventListener('start', this.onInteraction);
        this.obliqueCameraControls.addEventListener('end', this.onInteraction);

        this.isometricCameraControls.addEventListener('change', this.onChange);
        this.isometricCameraControls.addEventListener('start', this.onInteraction);
        this.isometricCameraControls.addEventListener('end', this.onInteraction);
    }

    removeListeners() {
        this.polarCameraControls.removeEventListener('change', this.onChange);
        this.polarCameraControls.removeEventListener('start', this.onInteraction);
        this.polarCameraControls.removeEventListener('end', this.onInteraction);

        this.obliqueCameraControls.removeEventListener('change', this.onChange);
        this.obliqueCameraControls.removeEventListener('start', this.onInteraction);
        this.obliqueCameraControls.removeEventListener('end', this.onInteraction);

        this.isometricCameraControls.removeEventListener('change', this.onChange);
        this.isometricCameraControls.removeEventListener('start', this.onInteraction);
        this.isometricCameraControls.removeEventListener('end', this.onInteraction);
    }

    // Event handlers

    onChange = () => {
        if (this.isDown) {
            if (this.isTransforming) {
                return;
            }

            this.isTransforming = true;

            const state = this.getPointsState();

            if (state) {
                state.enabled = false;
            }

            clearTween(this.timeout);

            this.timeout = delayedCall(300, () => {
                if (!this.isAnimatingOut) {
                    return;
                }

                this.isAnimatingOut = false;
                this.points?.current?.animateOutAll?.();
            });

            this.isAnimatingOut = true;
        }
    };

    onInteraction = ({ type }) => {
        if (type === 'start') {
            this.isDown = true;
        } else {
            this.isDown = false;
            this.isTransforming = false;

            const state = this.getPointsState();

            if (state) {
                state.enabled = true;
            }
        }
    };

    // Public methods

    setCamera = (camera, controls) => {
        this.camera = camera;
        this.controls = controls;
    };

    resize = (width, height) => {
        this.polarCamera.aspect = width / height;
        this.polarCamera.updateProjectionMatrix();

        this.obliqueCamera.aspect = width / height;
        this.obliqueCamera.updateProjectionMatrix();

        const aspect = width / height;
        const distance = 2.5;

        this.isometricCamera.left = -distance * aspect;
        this.isometricCamera.right = distance * aspect;
        this.isometricCamera.top = distance;
        this.isometricCamera.bottom = -distance;
        this.isometricCamera.updateProjectionMatrix();
    };

    update = () => {
        if (this.polarCameraControls.enabled) {
            this.polarCameraControls.update();
        }

        if (this.obliqueCameraControls.enabled) {
            this.obliqueCameraControls.update();
        }

        if (this.isometricCameraControls.enabled) {
            this.isometricCameraControls.update();
        }
    };

    destroy = () => {
        clearTween(this.timeout);
        this.removeListeners();
    };
}
