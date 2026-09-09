import { Group } from 'three';

import { Floor } from './Floor.js';
import { DarkPlanet } from './DarkPlanet.js';
import { FloatingCrystal } from './FloatingCrystal.js';
import { AbstractCube } from './AbstractCube.js';

export class SceneView extends Group {
    constructor(world) {
        super();

        this.world = world;

        this.visible = false;

        this.initViews();
    }

    initViews() {
        this.floor = new Floor(this.world);
        this.add(this.floor);

        this.darkPlanet = new DarkPlanet(this.world);
        this.add(this.darkPlanet);

        this.floatingCrystal = new FloatingCrystal(this.world);
        this.add(this.floatingCrystal);

        this.abstractCube = new AbstractCube(this.world);
        this.add(this.abstractCube);
    }

    addListeners() {
        this.world.input.add(this.darkPlanet, this.floatingCrystal, this.abstractCube);
    }

    removeListeners() {
        this.world.input.remove(this.darkPlanet, this.floatingCrystal, this.abstractCube);
    }

    // Public methods

    invert = isInverted => {
        this.floor.invert(isInverted);
    };

    toggle = show => {
        this.floor.toggle(show);
    };

    update = time => {
        this.darkPlanet.update(time);
        this.floatingCrystal.update(time);
        this.abstractCube.update(time);
    };

    animateIn = () => {
        this.addListeners();
    };

    ready = () => Promise.all([
        this.darkPlanet.ready(),
        this.floatingCrystal.ready(),
        this.abstractCube.ready()
    ]);

    destroy = () => {
        this.removeListeners();

        this.floor.destroy();
        this.darkPlanet.destroy();
        this.floatingCrystal.destroy();
        this.abstractCube.destroy();
    };
}
