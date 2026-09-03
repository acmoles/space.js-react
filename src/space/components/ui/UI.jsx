/**
 * @author pschroen / https://ufo.ai/
 */

import { useImperativeHandle, useRef } from 'react';

import { useEventListener, useResize } from '../../hooks/index.js';

import { Footer } from '../nav/Footer.jsx';
import { Header } from '../nav/Header.jsx';
import { Info } from '../nav/Info.jsx';
import { Menu } from '../nav/Menu.jsx';

import { Details } from '../details/Details.jsx';
import { DetailsButton } from '../details/DetailsButton.jsx';
import { DetailsInfo } from '../details/DetailsInfo.jsx';
import { MuteButton } from '../details/MuteButton.jsx';
import { AudioButton } from '../details/AudioButton.jsx';

import { Thumbnail } from '../indicators/Thumbnail.jsx';

import './UI.css';

/**
 * Full HUD container. Conditionally renders header, footer, menu, info,
 * details, thumbnail, and button overlays based on the props provided.
 * Mirrors `lib/ui/UI.js` as a declarative React component.
 *
 * @param {object}  props
 * @param {boolean} [props.fps=false]        Show the FPS counter in the header.
 * @param {boolean} [props.fpsOpen=false]    Show FPS counter and open its panel immediately.
 * @param {number}  [props.breakpoint=1000]  Width below which insets/positions narrow.
 * @param {object}  [props.header]           Data for the header: `{ title, links }`.
 * @param {object}  [props.footer]           Data forwarded to `Footer`.
 * @param {object}  [props.menu]             Data forwarded to `Menu`.
 * @param {object}  [props.info]             Data forwarded to `Info`.
 * @param {object}  [props.instructions]     Data forwarded to `Info` (pinned to bottom).
 * @param {object}  [props.details]          Data forwarded to `Details`.
 * @param {object}  [props.detailsInfo]      Data forwarded to `DetailsInfo`.
 * @param {object}  [props.thumbnail]        Data forwarded to `Thumbnail`.
 * @param {boolean|object} [props.detailsButton]  Pass `true` for an unstyled button, or
 *   an object `{ number, total }` to initialise the counter.
 * @param {object}  [props.muteButton]       Data forwarded to `MuteButton`.
 * @param {object}  [props.audioButton]      Data forwarded to `AudioButton`.
 * @param {function} [props.onDetails]       Called with `{ open }` when details toggles.
 * @param {function} [props.onUI]            Called with `{ open }` on Ctrl+0 toggle.
 * @param {object}  [props.style]            Inline style overrides on the root `.ui` div.
 *   Use `{ position: 'static' }` for scroll-layout examples.
 * @param {object}  [props.ref]  Exposes: `animateIn`, `animateOut`, `toggleDetails`,
 *   `animateInfoIn(delay?)`, `animateInstructionsIn(delay?)`,
 *   `animateDetailsInfoIn(delay?)`, `animateDetailsInfoOut(callback?)`,
 *   `addPanel(item)`, `getPanelIndex`, `getPanelValue`, `setPanelIndex`,
 *   `setPanelValue`, `invert(isInverted)`, `update` (no-op).
 * @example
 * const uiRef = useRef(null);
 * <UI fps header={{ title: { name: 'Space.js' } }} details={data} ref={uiRef} />
 * uiRef.current.animateIn();
 * uiRef.current.animateInfoIn();
 */
export function UI({
    fps = false,
    fpsOpen = false,
    breakpoint = 1000,
    header,
    footer,
    menu,
    info,
    instructions,
    details,
    detailsInfo,
    thumbnail,
    detailsButton,
    muteButton,
    audioButton,
    onDetails,
    onUI,
    style,
    ref
}) {
    // ── Child refs ──────────────────────────────────────────────────────────
    const headerRef = useRef(null);
    const footerRef = useRef(null);
    const menuRef = useRef(null);
    const infoRef = useRef(null);
    const instructionsRef = useRef(null);
    const detailsRef = useRef(null);
    const detailsInfoRef = useRef(null);
    const thumbnailRef = useRef(null);
    const detailsButtonRef = useRef(null);
    const muteButtonRef = useRef(null);
    const audioButtonRef = useRef(null);

    // Wrapper refs for responsive button positioning
    const dbWrapRef = useRef(null);
    const muteWrapRef = useRef(null);
    const audioWrapRef = useRef(null);

    // Mutable state that does not drive re-renders
    const stateRef = useRef({
        animatedIn: false,
        detailsOpen: false,
        detailsInfoOpen: false,
        detailsToggle: false,
        detailsInfoToggle: false
    });

    // ── Derived ─────────────────────────────────────────────────────────────
    const showHeader = !!(header || fps || fpsOpen);
    // detailsButton can be `true` (boolean) or an object `{ number, total }`
    const detailsButtonData = detailsButton && typeof detailsButton === 'object'
        ? detailsButton
        : null;

    // ── Responsive button positioning ────────────────────────────────────────
    useResize(({ width }) => {
        const narrow = width < breakpoint;

        if (dbWrapRef.current) {
            dbWrapRef.current.style.left = narrow ? '9px' : '19px';
            dbWrapRef.current.style.bottom = narrow ? '8px' : '18px';
        }

        [muteWrapRef, audioWrapRef].forEach(r => {
            if (r.current) {
                r.current.style.right = narrow ? '12px' : '22px';
                r.current.style.bottom = narrow ? '10px' : '20px';
            }
        });

        muteButtonRef.current?.resize?.();
        audioButtonRef.current?.resize?.();
    });

    // ── Core animation helpers ───────────────────────────────────────────────
    const handleAnimateIn = () => {
        const st = stateRef.current;

        if (details && st.detailsToggle && !st.detailsOpen) {
            detailsRef.current?.animateIn();
            st.detailsOpen = true;
        }

        if (detailsInfo && st.detailsInfoToggle && !st.detailsInfoOpen) {
            detailsInfoRef.current?.animateIn();
            st.detailsInfoOpen = true;
        }

        headerRef.current?.animateIn();
        footerRef.current?.animateIn();
        menuRef.current?.animateIn();
        thumbnailRef.current?.animateIn();

        muteButtonRef.current?.animateIn();
        audioButtonRef.current?.animateIn();
        detailsButtonRef.current?.animateIn();

        st.animatedIn = true;
    };

    const handleAnimateOut = () => {
        const st = stateRef.current;

        if (details) {
            detailsRef.current?.animateOut();
            st.detailsOpen = false;
        }

        if (detailsInfo) {
            detailsInfoRef.current?.animateOut();
            st.detailsInfoOpen = false;
        }

        headerRef.current?.animateOut();
        footerRef.current?.animateOut();
        menuRef.current?.animateOut();
        infoRef.current?.animateOut();
        instructionsRef.current?.animateOut();
        thumbnailRef.current?.animateOut();

        muteButtonRef.current?.animateOut();
        audioButtonRef.current?.animateOut();
        detailsButtonRef.current?.animateOut();

        st.animatedIn = false;
    };

    const handleToggleDetails = show => {
        const st = stateRef.current;

        if (show) {
            detailsButtonRef.current?.open();
            detailsInfoRef.current?.animateOut();
            detailsRef.current?.animateIn();
            st.detailsOpen = true;
            st.detailsInfoOpen = false;
        } else {
            detailsRef.current?.animateOut();
            st.detailsOpen = false;

            if (detailsInfo) {
                detailsInfoRef.current?.animateIn();
                st.detailsInfoOpen = true;
            }

            detailsButtonRef.current?.close();
        }

        onDetails?.({ open: show });
    };

    // ── Keyboard shortcuts ───────────────────────────────────────────────────
    useEventListener(window, 'keyup', e => {
        const st = stateRef.current;

        // Esc → close details
        if (details && e.keyCode === 27) {
            if (st.detailsOpen) {
                st.detailsToggle = st.detailsOpen;
                st.detailsInfoToggle = st.detailsInfoOpen;
                handleToggleDetails(false);
            }

            return;
        }

        // Ctrl+0 → toggle whole UI
        if (e.ctrlKey && e.keyCode === 48) {
            if (st.animatedIn) {
                st.detailsToggle = st.detailsOpen;
                st.detailsInfoToggle = st.detailsInfoOpen;
                handleAnimateOut();
            } else {
                handleAnimateIn();
                st.detailsToggle = false;
                st.detailsInfoToggle = false;
            }

            onUI?.({ open: st.animatedIn });
        }
    });

    // ── Imperative handle ────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
        animateIn: () => handleAnimateIn(),
        animateOut: () => handleAnimateOut(),
        toggleDetails: show => handleToggleDetails(show),

        // Per-overlay animate methods so callers don't need direct child refs
        animateInfoIn: delay => infoRef.current?.animateIn(delay),
        animateInstructionsIn: delay => instructionsRef.current?.animateIn(delay),
        animateDetailsInfoIn: delay => detailsInfoRef.current?.animateIn(delay),
        animateDetailsInfoOut: callback => detailsInfoRef.current?.animateOut(callback),

        // Panel API — proxied through Header → HeaderInfo
        addPanel: item => headerRef.current?.addPanel(item),
        getPanelIndex: name => headerRef.current?.getPanelIndex(name),
        getPanelValue: name => headerRef.current?.getPanelValue(name),
        setPanelIndex: (name, idx, path) => headerRef.current?.setPanelIndex(name, idx, path),
        setPanelValue: (name, val, path) => headerRef.current?.setPanelValue(name, val, path),

        /**
         * Switches between light and dark colour themes by setting CSS vars
         * on the document root. Mirrors `UI.invert()` from the original.
         */
        invert(isInverted) {
            const s = getComputedStyle(document.documentElement);
            const get = v => s.getPropertyValue(v).trim();
            const r = document.documentElement;

            r.style.setProperty('--ui-color', isInverted ? get('--ui-invert-light-color') : get('--ui-invert-dark-color'));
            r.style.setProperty('--ui-color-triplet', isInverted ? get('--ui-invert-light-color-triplet') : get('--ui-invert-dark-color-triplet'));
            r.style.setProperty('--ui-color-line', isInverted ? get('--ui-invert-light-color-line') : get('--ui-invert-dark-color-line'));

            muteButtonRef.current?.resize?.();
            audioButtonRef.current?.resize?.();
            detailsButtonRef.current?.resize?.();
        },

        /**
         * No-op. Per-frame work is handled by `useTicker` inside each child.
         * External `requestAnimationFrame` loops are not required.
         */
        update: () => {}
    }), []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="ui" style={style}>
            {/* Details panel (behind everything else) */}
            {details && (
                <Details
                    ref={detailsRef}
                    data={details}
                    breakpoint={breakpoint}
                    onClick={() => {
                        if (stateRef.current.detailsOpen) handleToggleDetails(false);
                    }}
                />
            )}

            {/* DetailsInfo overlay */}
            {detailsInfo && (
                <DetailsInfo
                    ref={detailsInfoRef}
                    data={{ ...detailsInfo, detailsButton }}
                    breakpoint={breakpoint}
                />
            )}

            {/* Header — uses the Header composite; panel API is forwarded
                through Header.ref → HeaderInfo.ref */}
            {showHeader && (
                <Header
                    ref={headerRef}
                    {...header}
                    fps={fps}
                    fpsOpen={fpsOpen}
                    breakpoint={breakpoint}
                />
            )}

            {/* Footer */}
            {footer && (
                <Footer
                    ref={footerRef}
                    breakpoint={breakpoint}
                    {...footer}
                />
            )}

            {/* Menu */}
            {menu && (
                <Menu
                    ref={menuRef}
                    breakpoint={breakpoint}
                    {...menu}
                />
            )}

            {/* Info (top) */}
            {info && (
                <Info
                    ref={infoRef}
                    {...info}
                />
            )}

            {/* Instructions (bottom-pinned Info) */}
            {instructions && (
                <Info
                    ref={instructionsRef}
                    bottom
                    {...instructions}
                />
            )}

            {/* Thumbnail */}
            {thumbnail && (
                <Thumbnail
                    ref={thumbnailRef}
                    breakpoint={breakpoint}
                    {...thumbnail}
                />
            )}

            {/* DetailsButton — fixed lower-left */}
            {detailsButton && (
                <div ref={dbWrapRef} className="ui-details-button">
                    <DetailsButton
                        ref={detailsButtonRef}
                        data={detailsButtonData}
                        onClick={() => {
                            const st = stateRef.current;

                            if (st.detailsOpen) {
                                handleToggleDetails(false);
                            } else {
                                handleToggleDetails(true);
                            }
                        }}
                    />
                </div>
            )}

            {/* MuteButton — fixed lower-right */}
            {muteButton && (
                <div ref={muteWrapRef} className="ui-mute-button">
                    <MuteButton
                        ref={muteButtonRef}
                        {...muteButton}
                    />
                </div>
            )}

            {/* AudioButton — fixed lower-right */}
            {audioButton && (
                <div ref={audioWrapRef} className="ui-audio-button">
                    <AudioButton
                        ref={audioButtonRef}
                        {...audioButton}
                    />
                </div>
            )}
        </div>
    );
}
