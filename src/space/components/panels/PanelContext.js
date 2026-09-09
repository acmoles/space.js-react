import { createContext } from 'react';

/**
 * Context provided by `Panel` so that item rows can take part in the panel's
 * staggered animations and colour-picker coordination without the panel having
 * to reach into its children.
 *
 * `registerItem(handle)` — called by every `PanelItem` on mount. Returns an
 *   unregister function. The panel keeps the set of live handles and sorts them
 *   into document order when it needs to stagger, so rows may be nested inside
 *   wrapper components and still animate in the right sequence.
 *
 * `notifyOpen(element, closeFn)` — called when a ColorPicker opens.
 *   `element` is the picker's root DOM node for containment tests.
 *   `closeFn()` is called by the panel to force-close this picker when a
 *   different picker opens.
 *
 * `notifyClose()` — called when the active ColorPicker closes.
 */
export const PanelContext = createContext({
    registerItem: () => () => {},
    notifyOpen: () => {},
    notifyClose: () => {}
});
