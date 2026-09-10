import { MathUtils } from 'three';
import { clearTween, tween } from '@/space/motion/index.js';

import { isDebug } from './config.js';

/**
 * Per-view camera controller for the Mars example.
 *
 * Ported from the static `CameraController` in
 * `examples/mars/src/controllers/world/CameraController.js` to an instance. The
 * shared `world` (cameras, scene, background intensity) and the `renderManager`
 * (volumetric-light material) are injected on `init`.
 */
export class CameraController {
    init(world, renderManager) {
        this.world = world;
        this.renderManager = renderManager;

        this.scene = world.scene;
        this.obliqueCamera = world.obliqueCamera;
        this.northPolarCamera = world.northPolarCamera;
        this.southPolarCamera = world.southPolarCamera;
        this.point1Camera = world.point1Camera;
        this.point2Camera = world.point2Camera;
        this.point3Camera = world.point3Camera;
        this.obliqueCameraControls = world.obliqueCameraControls;
        this.northPolarCameraControls = world.northPolarCameraControls;
        this.southPolarCameraControls = world.southPolarCameraControls;
        this.point1CameraControls = world.point1CameraControls;
        this.point2CameraControls = world.point2CameraControls;
        this.point3CameraControls = world.point3CameraControls;
        this.camera = world.camera;
        this.controls = world.controls;

        this.width = 0;
        this.height = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.detailsOffsetX = 0;
        this.progress = 0;
        this.isDetailsOpen = false;
    }

    transition(fast) {
        clearTween(this);

        if (fast) {
            this.camera.view.offsetX = this.isDetailsOpen ? this.offsetX + this.detailsOffsetX : this.offsetX;
            this.camera.view.offsetY = this.offsetY;
            this.camera.updateProjectionMatrix();
        } else {
            this.progress = 0;

            tween(this, { progress: 1 }, 2000, 'easeInOutSine', null, () => {
                this.camera.view.offsetX = MathUtils.lerp(
                    this.camera.view.offsetX,
                    this.isDetailsOpen ? this.offsetX + this.detailsOffsetX : this.offsetX,
                    this.progress
                );
                this.camera.view.offsetY = this.offsetY;
                this.camera.updateProjectionMatrix();
            });
        }
    }

    // Public methods

    setCamera = (camera, controls) => {
        this.camera = camera;
        this.controls = controls;

        if (this.camera === this.obliqueCamera) {
            if (this.width < this.height) {
                this.offsetX = 0;
                this.offsetY = 50;
            } else {
                this.offsetX = 0;
                this.offsetY = 0;
            }
        } else if (this.camera === this.northPolarCamera) {
            if (this.width < this.height) {
                this.offsetX = 0;
                this.offsetY = 50;
            } else {
                this.offsetX = 0;
                this.offsetY = 0;
            }
        } else if (this.camera === this.southPolarCamera) {
            if (this.width < this.height) {
                this.offsetX = 0;
                this.offsetY = 50;
            } else {
                this.offsetX = 0;
                this.offsetY = 0;
            }
        } else if (this.camera === this.point1Camera) {
            if (this.width < this.height) {
                this.offsetX = -60;
                this.offsetY = 190;
            } else {
                this.offsetX = -110;
                this.offsetY = 240;
            }
        } else if (this.camera === this.point2Camera) {
            if (this.width < this.height) {
                this.offsetX = 0;
                this.offsetY = 0;
            } else {
                this.offsetX = 0;
                this.offsetY = 0;
            }
        } else if (this.camera === this.point3Camera) {
            if (this.width < this.height) {
                this.offsetX = 0;
                this.offsetY = 0;
            } else {
                this.offsetX = 0;
                this.offsetY = 0;
            }
        }

        this.camera.setViewOffset(
            this.width,
            this.height,
            this.isDetailsOpen ? this.offsetX + this.detailsOffsetX : this.offsetX,
            this.offsetY,
            this.width,
            this.height
        );
        this.camera.updateProjectionMatrix();
    };

    setDetails = (open, fast) => {
        this.isDetailsOpen = open;

        this.transition(fast);
    };

    resize = (width, height) => {
        this.width = width;
        this.height = height;
        this.detailsOffsetX = -width / 4;

        let offsetX;
        let offsetY;

        // Oblique camera
        this.obliqueCamera.aspect = width / height;

        if (width < height) {
            offsetX = 0;
            offsetY = 50;
            this.obliqueCamera.position.set(-2.2, 0.9, 3.8);
        } else {
            offsetX = 0;
            offsetY = 0;
            this.obliqueCamera.position.set(-1.3, 0.7, 2.015);
        }

        this.obliqueCamera.setViewOffset(
            width,
            height,
            this.isDetailsOpen ? offsetX + this.detailsOffsetX : offsetX,
            offsetY,
            width,
            height
        );
        this.obliqueCamera.updateProjectionMatrix();

        // North polar camera
        this.northPolarCamera.aspect = width / height;

        if (width < height) {
            offsetX = 0;
            offsetY = 50;
            this.northPolarCamera.position.set(0, 4.5, 0);
        } else {
            offsetX = 0;
            offsetY = 0;
            this.northPolarCamera.position.set(0, 2.5, 0);
        }

        this.northPolarCamera.setViewOffset(
            width,
            height,
            this.isDetailsOpen ? offsetX + this.detailsOffsetX : offsetX,
            offsetY,
            width,
            height
        );
        this.northPolarCamera.updateProjectionMatrix();

        // South polar camera
        this.southPolarCamera.aspect = width / height;

        if (width < height) {
            offsetX = 0;
            offsetY = 50;
            this.southPolarCamera.position.set(0, -4.5, 0);
        } else {
            offsetX = 0;
            offsetY = 0;
            this.southPolarCamera.position.set(0, -2.5, 0);
        }

        this.southPolarCamera.setViewOffset(
            width,
            height,
            this.isDetailsOpen ? offsetX + this.detailsOffsetX : offsetX,
            offsetY,
            width,
            height
        );
        this.southPolarCamera.updateProjectionMatrix();

        // Point of interest #1 camera
        this.point1Camera.aspect = width / height;

        if (width < height) {
            offsetX = -60;
            offsetY = 190;
            this.point1Camera.position.set(0, -0.25, 2.88);
        } else {
            offsetX = -110;
            offsetY = 240;
            this.point1Camera.position.set(0, -0.25, 1.6);
        }

        this.point1Camera.setViewOffset(
            width,
            height,
            this.isDetailsOpen ? offsetX + this.detailsOffsetX : offsetX,
            offsetY,
            width,
            height
        );
        this.point1Camera.updateProjectionMatrix();

        // Point of interest #2 camera
        this.point2Camera.aspect = width / height;

        if (width < height) {
            offsetX = 0;
            offsetY = 0;
            this.point2Camera.position.set(0, 0, 1.25);
        } else {
            offsetX = 0;
            offsetY = 0;
            this.point2Camera.position.set(0, 0, 1.25);
        }

        this.point2Camera.setViewOffset(
            width,
            height,
            this.isDetailsOpen ? offsetX + this.detailsOffsetX : offsetX,
            offsetY,
            width,
            height
        );
        this.point2Camera.updateProjectionMatrix();

        // Point of interest #3 camera
        this.point3Camera.aspect = width / height;

        if (width < height) {
            offsetX = 0;
            offsetY = 0;
            this.point3Camera.position.set(-0.62, 0, 1);
            this.point3Camera.rotation.y = MathUtils.degToRad(-10);
            this.point3Camera.rotation.z = MathUtils.degToRad(90);
        } else {
            offsetX = 0;
            offsetY = 0;
            this.point3Camera.position.set(-0.62, 0, 1);
            this.point3Camera.rotation.y = MathUtils.degToRad(-10);
            this.point3Camera.rotation.z = MathUtils.degToRad(90);
        }

        this.point3Camera.setViewOffset(
            width,
            height,
            this.isDetailsOpen ? offsetX + this.detailsOffsetX : offsetX,
            offsetY,
            width,
            height
        );
        this.point3Camera.updateProjectionMatrix();
    };

    update = () => {
        this.obliqueCameraControls.update();
    };

    start = () => {
        if (isDebug) {
            return;
        }

        this.scene.backgroundIntensity = 10;
        this.camera.scale.z = -1;
        this.renderManager.vlMaterial.uniforms.uTransition.value = true;
        this.renderManager.vlMaterial.uniforms.uPower.value = 0.8;
        this.renderManager.vlMaterial.uniforms.uAmount.value = 0.4;
    };

    animateIn = () => {
        const renderManager = this.renderManager;

        if (isDebug) {
            renderManager.animatedIn = true;
            renderManager.vlMaterial.uniforms.uTransition.value = false;
            renderManager.vlMaterial.uniforms.uPower.value = renderManager.glowPower;
            renderManager.vlMaterial.uniforms.uAmount.value = renderManager.glowAmount;
            return;
        }

        tween(this.camera.scale, { z: 1 }, 7000, 'easeInOutCubic', () => {
            renderManager.animatedIn = true;
            renderManager.vlMaterial.uniforms.uTransition.value = false;
            renderManager.vlMaterial.uniforms.uPower.value = renderManager.glowPower;
            renderManager.vlMaterial.uniforms.uAmount.value = renderManager.glowAmount;
        }, () => {
            const multiplier = 1 - this.camera.scale.z;

            this.scene.backgroundIntensity = Math.max(this.world.backgroundIntensity, 10 * multiplier);
        });

        this.progress = 0;

        tween(this, { progress: 1 }, 7000, 'easeInOutCubic', 3500, null, () => {
            renderManager.vlMaterial.uniforms.uPower.value = MathUtils.lerp(
                renderManager.vlMaterial.uniforms.uPower.value,
                renderManager.glowPower,
                this.progress
            );

            renderManager.vlMaterial.uniforms.uAmount.value = MathUtils.lerp(
                renderManager.vlMaterial.uniforms.uAmount.value,
                renderManager.glowAmount,
                this.progress
            );
        });
    };

    destroy = () => {
        clearTween(this);

        if (this.camera) {
            clearTween(this.camera.scale);
        }
    };
}
