/**
 * Background sub-panel: background map controls + background colour with
 * automatic light/dark inversion. Port of the reference `BackgroundPanel`.
 *
 * The reference `BackgroundPanel.setInvert()` called `ui.invert(invert)`, and
 * the library `UI.invert()` in turn emitted a `Stage.events` `'invert'` event
 * that the App used to invert the floor colour and the RenderManager. The React
 * `<UI>.invert()` only flips the CSS theme, so we emit the `'invert'` event
 * ourselves to reproduce the full behaviour (AboutScene and Points3D listen).
 */

import { Stage, brightness } from '@lib/three.js';

import { backgroundMapPanelItems, subPanel } from '@/space/three/index.js';

export function backgroundPanelItems(scene, ui) {
    const state = {
        lastValue: scene.background,
        lastInvert: null
    };

    function setInvert(value) {
        if (!ui) {
            return;
        }

        // Light colour is inverted
        const invert = brightness(value) > 0.6;

        if (invert !== state.lastInvert) {
            state.lastInvert = invert;

            ui.invert(invert);
            Stage.events.emit('invert', { invert });
        }
    }

    const items = [
        {
            type: 'content',
            callback: (value, item) => {
                item.setContent(subPanel(backgroundMapPanelItems(scene)));
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'color',
            value: scene.background,
            callback: value => {
                if (scene.background && scene.background.isColor) {
                    scene.background.copy(value);

                    setInvert(value);
                } else if (state.lastValue && state.lastValue.isColor) {
                    state.lastValue.copy(value);

                    setInvert(value);
                }
            }
        }
    ];

    if (scene.background && scene.background.isColor) {
        setInvert(scene.background);
    }

    return items;
}
