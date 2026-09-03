import { createContext } from 'react';

/**
 * Context provided by `Panel` so that `ColorPicker` children can signal
 * open/close events back to the panel for item enable/disable coordination.
 *
 * `notifyOpen(element)` — called when a ColorPicker opens; `element` is its
 *   root DOM node so the panel can test containment.
 * `notifyClose()` — called when a ColorPicker closes.
 */
export const PanelContext = createContext({
    notifyOpen: () => {},
    notifyClose: () => {}
});
