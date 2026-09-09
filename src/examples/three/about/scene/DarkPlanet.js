import { Color, Group, MathUtils, Mesh, MeshStandardMaterial } from 'three';
import { getSphericalCube } from '@lib/three.js';

import { layers } from '../config.js';

export class DarkPlanet extends Group {
    constructor(world) {
        super();

        this.world = world;

        this.position.x = -2.5;

        // 25 degree tilt like Mars
        this.rotation.z = MathUtils.degToRad(25);
    }

    async initMesh() {
        const { physics } = this.world;

        const geometry = getSphericalCube(0.6, 20);
        geometry.computeTangents();

        // For sphere geometry physics
        geometry.type = 'SphereGeometry';
        geometry.parameters.radius = geometry.parameters.width;

        const material = new MeshStandardMaterial({
            name: 'Dark Planet',
            color: new Color().offsetHSL(0, 0, -0.8),
            metalness: 0.5,
            roughness: 1
        });

        const mesh = new Mesh(geometry, material);
        mesh.layers.enable(layers.buffers);
        this.add(mesh);

        // Physics
        physics.add(mesh, { density: 2, autoSleep: false });

        this.mesh = mesh;
    }

    // Event handlers

    onHover = ({ type }) => {
        console.log('DarkPlanet', type);
    };

    onClick = () => {
        console.log('DarkPlanet', 'click');
    };

    // Public methods

    update = () => {
        if (this.world.isPhysicsEnabled()) {
            return;
        }

        // Counter clockwise rotation
        this.mesh.rotation.y += 0.005;
    };

    ready = () => this.initMesh();

    destroy = () => {
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    };
}
