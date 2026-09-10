/**
 * @author Space.js React
 *
 * Helpers shared by the ported three.js panel definitions.
 *
 * Panel definitions are plain functions of the shape
 * `(mesh, ui) => itemDescriptor[]`. Where the reference library nested a
 * sub-panel by constructing another `Panel` instance and handing it to
 * `item.setContent()`, the React port hands over a `<Panel>` element instead.
 *
 * Keeping that conversion in one place means every definition file stays
 * framework-free data — no JSX, no imports from the reference library.
 */

import { createElement } from 'react';

import { Panel } from '../../components/panels/index.js';

/**
 * Builds the React element used as nested panel content.
 *
 * `autoAnimateIn` reproduces the reference library's `animateIn(true)` call on
 * freshly constructed sub-panels, which stagger in without a tween.
 *
 * @param {object[]} items Item descriptors for the nested panel.
 * @returns {React.ReactElement}
 */
export function subPanel(items) {
    return createElement(Panel, { items, autoAnimateIn: true });
}
