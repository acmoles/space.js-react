/**
 * @author Space.js React
 *
 * Projects a Three.js mesh's screen-space bounding box to pixel coordinates.
 *
 * Returns a stable result object that is mutated in place on each `project()`
 * call — zero allocations per frame after mount.
 *
 * @example
 * const { project, pos } = useProjectedPosition();
 * // Inside useFrame or a _update() callback:
 * project(sphereMesh, camera, halfScreen);
 * // Read pos.centerX, pos.centerY, pos.width, pos.height, etc.
 */

import { useMemo, useRef } from 'react';
import { Vector2 } from 'three';

import { getScreenSpaceBox } from '@lib/three/utils/Utils3D.js';

export function useProjectedPosition() {
    const centerRef = useRef(new Vector2());
    const sizeRef = useRef(new Vector2());

    // Stable mutable scratch object — useMemo with empty deps creates it once
    // per component mount without triggering the react-hooks/refs "accessing
    // .current during render" rule that useRef().current would trigger.
    const pos = useMemo(() => ({
        centerX: 0,
        centerY: 0,
        width: 12,
        height: 12,
        halfWidth: 6,
        halfHeight: 6
    }), []);

    const project = (mesh, camera, halfScreen) => {
        const box = getScreenSpaceBox(mesh, camera);
        box.getCenter(centerRef.current).multiply(halfScreen);
        box.getSize(sizeRef.current).multiply(halfScreen);

        pos.centerX = halfScreen.x + centerRef.current.x;
        pos.centerY = halfScreen.y - centerRef.current.y;
        pos.width = Math.max(12, Math.round(sizeRef.current.x));
        pos.height = Math.max(12, Math.round(sizeRef.current.y));
        pos.halfWidth = Math.round(pos.width / 2);
        pos.halfHeight = Math.round(pos.height / 2);
    };

    return { pos, project };
}
