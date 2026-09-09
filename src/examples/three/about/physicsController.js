import { params as sharedParams } from './state.js';

export class PhysicsController {
    constructor(physics) {
        this.physics = physics;

        this.enabled = false;
        this.animatedOneFramePast = false;
    }

    update = () => {
        if (!this.enabled) {
            return;
        }

        if (sharedParams.animate || !this.animatedOneFramePast) {
            this.physics.step();

            this.animatedOneFramePast = !sharedParams.animate;
        }
    };
}
