import { Group } from 'three';

import { Mars } from './Mars.js';
import { Sun } from './Sun.js';

/**
 * Scene container grouping the Mars globe and the Sun.
 *
 * Ported from `examples/mars/src/views/SceneView.js`.
 */
export class SceneView extends Group {
    constructor(world) {
        super();

        this.world = world;

        this.visible = false;

        this.initViews();
    }

    initViews() {
        this.mars = new Mars(this.world);
        this.add(this.mars);

        this.sun = new Sun();
        this.add(this.sun);
    }

    // Public methods

    resize = () => {
    };

    update = () => {
        this.mars.update();
    };

    ready = () => this.mars.ready();
}
