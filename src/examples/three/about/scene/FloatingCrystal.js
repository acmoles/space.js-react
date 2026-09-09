import { Color, Group, Mesh, MeshStandardMaterial, OctahedronGeometry } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

import { layers } from '../config.js';

export class FloatingCrystal extends Group {
    constructor(world) {
        super();

        this.world = world;

        this.position.y = 0.7;

        // Resize to rhombus shape
        this.scale.set(0.5, 1, 0.5);
    }

    async initMesh() {
        const { physics } = this.world;

        let geometry = new OctahedronGeometry();

        // Convert to indexed geometry
        geometry = mergeVertices(geometry);

        geometry.computeTangents();

        const material = new MeshStandardMaterial({
            name: 'Floating Crystal',
            color: new Color().offsetHSL(0, 0, -0.8),
            metalness: 0.5,
            roughness: 0.7,
            flatShading: true
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
        console.log('FloatingCrystal', type);
    };

    onClick = () => {
        console.log('FloatingCrystal', 'click');
    };

    // Public methods

    update = time => {
        if (this.world.isPhysicsEnabled()) {
            return;
        }

        this.position.y = 0.7 + Math.sin(time) * 0.1;
        this.rotation.y += 0.01;
    };

    ready = () => this.initMesh();

    destroy = () => {
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    };
}
