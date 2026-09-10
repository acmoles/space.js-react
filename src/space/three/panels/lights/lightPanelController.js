/**
 * @author Space.js React
 *
 * Imperative light-panel controller: traverses the scene, builds per-light
 * panel items, and manages light helpers.
 *
 * Ported from the reference `LightPanelController` static class. The module-
 * level state and exported `init`/`update`/`destroy`/`lights` API are kept
 * identical so the existing `useLightPanelController` hook remains a drop-in
 * consumer.
 */

import {
    AmbientLight,
    DirectionalLight,
    DirectionalLightHelper,
    HemisphereLight,
    HemisphereLightHelper,
    PointLight,
    PointLightHelper,
    RectAreaLight,
    SpotLight,
    SpotLightHelper
} from 'three';
import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js';

import { ambientLightPanelItems } from './ambientLightPanel.js';
import { hemisphereLightPanelItems } from './hemisphereLightPanel.js';
import { directionalLightPanelItems } from './directionalLightPanel.js';
import { pointLightPanelItems } from './pointLightPanel.js';
import { spotLightPanelItems } from './spotLightPanel.js';
import { rectAreaLightPanelItems } from './rectAreaLightPanel.js';

import { subPanel } from '../subPanel.js';

export const LightOptions = new Map([
    ['Ambient', [AmbientLight, ambientLightPanelItems]],
    ['Hemi', [HemisphereLight, hemisphereLightPanelItems]],
    ['Direct', [DirectionalLight, directionalLightPanelItems]],
    ['Point', [PointLight, pointLightPanelItems]],
    ['Spot', [SpotLight, spotLightPanelItems]],
    ['Rect', [RectAreaLight, rectAreaLightPanelItems]]
]);

export function getKeyByLight(lightOptions, light) {
    for (const [key, value] of lightOptions.entries()) {
        if (light instanceof value[0]) {
            return key;
        }
    }
}

export class LightPanelController {
    static init(scene, ui) {
        this.scene = scene;
        this.ui = ui;

        this.lights = [];

        if (this.ui) {
            this.initPanel();
        }
    }

    static initPanel() {
        const scene = this.scene;
        const ui = this.ui;

        const lightOptions = new Map();

        scene.traverse(object => {
            if (object.isLight) {
                this.lights.push(object);
            }
        });

        const keys = this.lights.map(light => getKeyByLight(LightOptions, light));
        const counts = {};

        keys.forEach(key => {
            counts[key] = counts[key] ? counts[key] + 1 : 1;
        });

        this.lights.forEach(light => {
            const key = getKeyByLight(LightOptions, light);

            let count = 1;
            let lightKey = `${key} ${counts[key] > 1 ? count++ : ''}`;

            while (Array.from(lightOptions.keys()).includes(lightKey)) {
                lightKey = `${key}${count++}`;
            }

            lightOptions.set(lightKey, [light, LightOptions.get(key)[1]]);
        });

        const items = [
            {
                type: 'divider'
            },
            {
                type: 'list',
                name: 'Light',
                list: lightOptions,
                value: Array.from(lightOptions.keys())[0],
                callback: (value, item) => {
                    const [light, buildLightPanelItems] = lightOptions.get(value);

                    item.setContent(subPanel(buildLightPanelItems(this, light)));
                }
            }
        ];

        items.forEach(data => {
            ui.addPanel(data);
        });
    }

    // Public methods

    static toggleHemisphereLightHelper(light, show) {
        if (show) {
            if (!light.helper) {
                light.helper = new HemisphereLightHelper(light);
                this.scene.add(light.helper);
            }

            light.helper.visible = true;
        } else if (light.helper) {
            light.helper.visible = false;
        }
    }

    static toggleDirectionalLightHelper(light, show) {
        if (show) {
            if (!light.helper) {
                light.helper = new DirectionalLightHelper(light, 0.125);
                this.scene.add(light.helper);
            }

            light.helper.visible = true;
        } else if (light.helper) {
            light.helper.visible = false;
        }
    }

    static togglePointLightHelper(light, show) {
        if (show) {
            if (!light.helper) {
                light.helper = new PointLightHelper(light, 0.125);
                this.scene.add(light.helper);
            }

            light.helper.visible = true;
        } else if (light.helper) {
            light.helper.visible = false;
        }
    }

    static toggleSpotLightHelper(light, show) {
        if (show) {
            if (!light.helper) {
                light.helper = new SpotLightHelper(light);
                this.scene.add(light.helper);
            }

            light.helper.visible = true;
        } else if (light.helper) {
            light.helper.visible = false;
        }
    }

    static toggleRectAreaLightHelper(light, show) {
        if (show) {
            if (!light.helper) {
                light.helper = new RectAreaLightHelper(light);
                this.scene.add(light.helper);
            }

            light.helper.visible = true;
        } else if (light.helper) {
            light.helper.visible = false;
        }
    }

    static update() {
        this.lights.forEach(light => {
            if (light.helper && !light.isRectAreaLight) {
                light.helper.update();
            }
        });
    }

    static destroy() {
        this.lights.forEach(light => {
            if (light.helper) {
                if (light.isHemisphereLight) {
                    this.toggleHemisphereLightHelper(light, false);
                }

                if (light.isDirectionalLight) {
                    this.toggleDirectionalLightHelper(light, false);
                }

                if (light.isPointLight) {
                    this.togglePointLightHelper(light, false);
                }

                if (light.isSpotLight) {
                    this.toggleSpotLightHelper(light, false);
                }

                if (light.isRectAreaLight) {
                    this.toggleRectAreaLightHelper(light, false);
                }

                this.scene.remove(light.helper);
                light.helper.dispose();

                delete light.helper;
            }
        });

        for (const prop in this) {
            this[prop] = null;
        }

        return null;
    }
}
