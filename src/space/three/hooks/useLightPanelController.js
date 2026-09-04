/**
 * @author Space.js React
 *
 * Initialises the lib LightPanelController for the given Three.js scene and
 * imperative ui object, and updates helpers every frame.
 *
 * StrictMode safe: cleanup is called synchronously before the re-mount, so
 * `LightPanelController.destroy()` always runs before the next `init()`.
 *
 * @param {import('three').Scene} scene
 * @param {object|null}           ui   Imperative UI object (from `new UI()`).
 * @param {boolean}               [enabled=true]
 */
import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';

import { LightPanelController } from '@lib/three.js';

function resolveUi(target) {
    if (target && typeof target === 'object' && 'current' in target) {
        return target.current;
    }

    return target;
}

export function useLightPanelController(scene, ui, enabled = true) {
    useEffect(() => {
        const instance = resolveUi(ui);

        if (!scene || !instance || !enabled) return undefined;

        LightPanelController.init(scene, instance);

        return () => {
            LightPanelController.destroy();
        };
    }, [scene, ui, enabled]);

    useFrame(() => {
        const instance = resolveUi(ui);

        if (enabled && instance) {
            LightPanelController.update();
        }
    });
}
