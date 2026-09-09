import { Mesh, MeshBasicMaterial, PlaneGeometry, Raycaster, Vector2 } from 'three';
import { Stage } from '@lib/three.js';
import { RigidBodyConfig, RigidBodyType, SphericalJointConfig } from '@alienkitty/alien.js/three/oimophysics';

import { isDebug, layers } from './config.js';

/**
 * Port of the About app's InputManager — the Oimo physics drag interaction.
 * Decoupled from the singletons; camera/physics controllers are injected.
 */
export class InputManager {
    constructor(scene, camera, controls, cameraController, physicsController) {
        this.scene = scene;
        this.camera = camera;
        this.controls = controls;
        this.cameraController = cameraController;
        this.physicsController = physicsController;

        this.raycaster = new Raycaster();
        this.raycaster.layers.enable(layers.picking);
        this.raycastInterval = 1 / 10; // 10 frames per second
        this.lastRaycast = 0;

        this.objects = [];
        this.mouse = new Vector2(-1, -1);
        this.delta = new Vector2();
        this.coords = new Vector2(-1, -1);
        this.hover = null;
        this.selected = null;
        this.click = null;
        this.lastTime = 0;
        this.lastMouse = new Vector2();
        this.body = null;
        this.joint = null;
        this.enabled = true;

        this.initMesh();

        this.addListeners();
    }

    initMesh() {
        this.quad = new PlaneGeometry(1, 1);

        let material;

        if (isDebug) {
            material = new MeshBasicMaterial({
                color: 0xff0000,
                wireframe: true
            });
        } else {
            material = new MeshBasicMaterial({ visible: false });
        }

        this.dragPlane = new Mesh(this.quad, material);
        this.dragPlane.scale.multiplyScalar(200);
        this.dragPlane.layers.enable(layers.picking);
    }

    addListeners() {
        window.addEventListener('pointerdown', this.onPointerDown);
        window.addEventListener('pointermove', this.onPointerMove);
        window.addEventListener('pointerup', this.onPointerUp);
    }

    removeListeners() {
        window.removeEventListener('pointerdown', this.onPointerDown);
        window.removeEventListener('pointermove', this.onPointerMove);
        window.removeEventListener('pointerup', this.onPointerUp);
    }

    // Event handlers

    onPointerDown = e => {
        if (!this.enabled) {
            return;
        }

        this.lastTime = performance.now();
        this.lastMouse.set(e.clientX, e.clientY);

        this.onPointerMove(e);

        if (this.hover) {
            this.click = this.hover;
        }
    };

    onPointerMove = e => {
        if (!this.enabled) {
            return;
        }

        if (e) {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            this.coords.x = (this.mouse.x / document.documentElement.clientWidth) * 2 - 1;
            this.coords.y = 1 - (this.mouse.y / document.documentElement.clientHeight) * 2;
        }

        if (this.selected) {
            this.raycaster.setFromCamera(this.coords, this.camera);

            const hit = this.raycaster.intersectObject(this.dragPlane)[0];

            if (hit) {
                const point = hit.point;

                this.physicsController.physics.setPosition(this.body, point);
            }

            return;
        }

        if (document.elementFromPoint(this.mouse.x, this.mouse.y) instanceof HTMLCanvasElement) {
            this.raycaster.setFromCamera(this.coords, this.camera);

            const hit = this.raycaster.intersectObjects(this.objects)[0];

            if (hit) {
                let object = hit.object;

                if (object.parent.isGroup) {
                    object = object.parent;
                }

                if (
                    this.physicsController.enabled &&
                    this.cameraController.isDown &&
                    !this.cameraController.isTransforming &&
                    this.selected !== object
                ) {
                    const point = hit.point;

                    const body = new RigidBodyConfig();
                    body.type = RigidBodyType.STATIC;
                    body.position.copyFrom(point);
                    this.physicsController.physics.add(body);

                    const joint = new SphericalJointConfig();
                    joint.rigidBody1 = this.physicsController.physics.get(object);
                    joint.rigidBody2 = this.physicsController.physics.get(body);
                    joint.rigidBody1.getLocalPointTo(point, joint.localAnchor1);
                    joint.rigidBody2.getLocalPointTo(point, joint.localAnchor2);
                    joint.springDamper.setSpring(4, 1); // frequency, dampingRatio
                    this.physicsController.physics.add(joint);

                    this.selected = object;
                    this.body = body;
                    this.joint = joint;

                    this.dragPlane.position.copy(point);
                    this.dragPlane.quaternion.copy(this.camera.quaternion);

                    this.scene.add(this.dragPlane);

                    this.controls.enabled = false;

                    Stage.css({ cursor: 'move' });
                } else if (!this.hover) {
                    this.hover = object;
                    this.hover.onHover({ type: 'over' });
                    Stage.css({ cursor: 'pointer' });
                } else if (this.hover !== object) {
                    this.hover.onHover({ type: 'out' });
                    this.hover = object;
                    this.hover.onHover({ type: 'over' });
                    Stage.css({ cursor: 'pointer' });
                }
            } else if (this.hover) {
                this.hover.onHover({ type: 'out' });
                this.hover = null;
                Stage.css({ cursor: '' });
            }
        } else if (this.hover) {
            this.hover.onHover({ type: 'out' });
            this.hover = null;
            Stage.css({ cursor: '' });
        }

        this.delta.subVectors(this.mouse, this.lastMouse);
    };

    onPointerUp = () => {
        if (!this.enabled) {
            return;
        }

        if (this.selected) {
            this.scene.remove(this.dragPlane);

            this.physicsController.physics.remove(this.joint);
            this.physicsController.physics.remove(this.body);

            this.selected = null;

            this.controls.enabled = true;
        }

        if (performance.now() - this.lastTime > 250 || this.delta.length() > 50) {
            this.click = null;
            return;
        }

        if (this.click && this.click === this.hover) {
            this.click.onClick();
        }

        this.click = null;
    };

    // Public methods

    setCamera = (camera, controls) => {
        this.camera = camera;
        this.controls = controls;
    };

    update = time => {
        if (!navigator.maxTouchPoints && time - this.lastRaycast > this.raycastInterval) {
            this.onPointerMove();
            this.lastRaycast = time;
        }
    };

    add = (...objects) => {
        this.objects.push(...objects);
    };

    remove = (...objects) => {
        objects.forEach(object => {
            const index = this.objects.indexOf(object);

            if (~index) {
                this.objects.splice(index, 1);
            }

            if (object.parent && object.parent.isGroup) {
                object = object.parent;
            }

            if (object === this.hover) {
                this.hover.onHover({ type: 'out' });
                this.hover = null;
                Stage.css({ cursor: '' });
            }
        });
    };

    destroy = () => {
        this.removeListeners();

        if (this.selected) {
            this.scene.remove(this.dragPlane);
        }

        this.dragPlane.material.dispose();
        this.quad.dispose();
    };
}
