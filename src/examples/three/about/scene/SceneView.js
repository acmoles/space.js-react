import { Group } from 'three';

import { Floor } from './Floor.js';
import { DarkPlanet } from './DarkPlanet.js';
import { FloatingCrystal } from './FloatingCrystal.js';
import { AbstractCube } from './AbstractCube.js';

export class SceneView extends Group {
    constructor() {
        super();

        this.visible = false;

        this.initViews();
    }

    initViews() {
        this.floor = new Floor();
        this.add(this.floor);

        this.darkPlanet = new DarkPlanet();
        this.add(this.darkPlanet);

        this.floatingCrystal = new FloatingCrystal();
        this.add(this.floatingCrystal);

        this.abstractCube = new AbstractCube();
        this.add(this.abstractCube);
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

    ready = () => Promise.all([
        this.darkPlanet.ready(),
        this.floatingCrystal.ready(),
        this.abstractCube.ready()
    ]);

    destroy = () => {
        this.floor.destroy();
        this.darkPlanet.destroy();
        this.floatingCrystal.destroy();
        this.abstractCube.destroy();
    };
}
