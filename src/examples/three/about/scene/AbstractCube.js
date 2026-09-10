import { BoxGeometry, Color, Group, MathUtils, Mesh, MeshStandardMaterial } from 'three';

import { layers } from '../config.js';

export class AbstractCube extends Group {
    constructor() {
        super();

        this.position.x = 2.5;
        this.rotation.x = MathUtils.degToRad(-45);
        this.rotation.z = MathUtils.degToRad(-45);
    }

    async initMesh() {
        const geometry = new BoxGeometry();
        geometry.computeTangents();

        const material = new MeshStandardMaterial({
            name: 'Abstract Cube',
            color: new Color().offsetHSL(0, 0, -0.8),
            metalness: 0.5,
            roughness: 0.7,
            flatShading: true
        });

        const mesh = new Mesh(geometry, material);
        mesh.layers.enable(layers.buffers);
        this.add(mesh);

        this.mesh = mesh;
    }

    // Event handlers

    onHover = ({ type }) => {
        console.log('AbstractCube', type);
    };

    onClick = () => {
        console.log('AbstractCube', 'click');
    };

    // Public methods

    update = () => {
        this.rotation.y -= 0.005;
    };

    ready = () => this.initMesh();

    destroy = () => {
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    };
}
