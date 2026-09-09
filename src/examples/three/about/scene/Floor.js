import { BoxGeometry, Color, Group, Mesh } from 'three';
import { Stage, clearTween, tween } from '@lib/three.js';

import { GridHelper } from './GridHelper.js';

export class Floor extends Group {
    constructor(world) {
        super();

        this.world = world;

        this.position.y = -1.36; // -0.86 - 1 / 2

        this.initMesh();
    }

    initMesh() {
        const { physics } = this.world;

        this.gridHelper = new GridHelper();
        this.gridHelper.position.y = 0.494; // 1 / 2 - 0.006
        this.gridHelper.material.transparent = true;
        this.add(this.gridHelper);

        // Physics mesh
        const floor = new Mesh(new BoxGeometry(11, 1, 11));
        floor.geometry.setDrawRange(0, 0); // Avoid rendering geometry
        this.add(floor);

        this.floor = floor;

        physics.add(floor, { density: 0, autoSleep: false });
    }

    // Public methods

    invert = isInverted => {
        const colorStyle = `rgb(${Stage.rootStyle.getPropertyValue('--ui-color-triplet').trim().replace(/\s/g, ', ')})`;
        const color = new Color(colorStyle);

        // Dark colour is muted
        if (!isInverted) {
            color.offsetHSL(0, 0, -0.8);
        }

        const array = color.toArray();

        const colors = this.gridHelper.geometry.getAttribute('color');

        for (let i = 0; i < colors.count; i++) {
            colors.setXYZ(i, ...array);
        }

        colors.needsUpdate = true;
    };

    toggle = show => {
        const duration = 400;
        const ease = 'easeOutCubic';

        clearTween(this.gridHelper.material);

        if (show) {
            tween(this.gridHelper.material, { opacity: 1 }, duration, ease);
        } else {
            tween(this.gridHelper.material, { opacity: 0 }, duration, ease);
        }
    };

    destroy = () => {
        clearTween(this.gridHelper.material);

        this.gridHelper.geometry.dispose();
        this.gridHelper.material.dispose();
        this.floor.geometry.dispose();
    };
}
