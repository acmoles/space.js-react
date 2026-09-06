import { createContext } from 'react';

/**
 * Context provided by `Panel` to coordinate `ColorPicker` open/close events
 * and item enable/disable state.
 *
 * `notifyOpen(element, closeFn)` — called when a ColorPicker opens.
 *   `element` is the picker's root DOM node for containment tests.
 *   `closeFn()` is called by the panel to force-close this picker when a
 *   different picker opens.
 *
 * `notifyClose()` — called when the active ColorPicker closes.
 */
export const PanelContext = createContext({
    notifyOpen: () => {},
    notifyClose: () => {}
});
