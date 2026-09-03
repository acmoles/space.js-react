/**
 * @author pschroen / https://ufo.ai/
 */

import { useImperativeHandle, useLayoutEffect, useRef } from 'react';

import { useEventListener, useResize } from '../../hooks/index.js';

import { Footer } from '../nav/Footer.jsx';
import { HeaderInfo } from '../nav/HeaderInfo.jsx';
import { Info } from '../nav/Info.jsx';
import { Menu } from '../nav/Menu.jsx';
import { NavLink } from '../nav/NavLink.jsx';
import { NavTitle } from '../nav/NavTitle.jsx';

import { Details } from '../details/Details.jsx';
import { DetailsButton } from '../details/DetailsButton.jsx';
import { DetailsInfo } from '../details/DetailsInfo.jsx';
import { MuteButton } from '../details/MuteButton.jsx';
import { AudioButton } from '../details/AudioButton.jsx';

import { Thumbnail } from '../indicators/Thumbnail.jsx';

import './UI.css';

// ─── Internal header ─────────────────────────────────────────────────────────
// UI renders its header sub-components directly (instead of composing the
// `Header` wrapper) so that it can hold a direct ref to `HeaderInfo` and
// expose `addPanel` / panel value helpers on its own imperative handle.

/**
 * Full HUD container. Conditionally renders header, footer, menu, info,
 * details, thumbnail, and button overlays based on the props provided.
 * Mirrors `lib/ui/UI.js` as a declarative React component.
 *
 * @param {object}  props
 * @param {boolean} [props.fps=false]        Show the FPS counter in the header.
 * @param {boolean} [props.fpsOpen=false]    Show FPS counter and immediately open its panel.
 * @param {number}  [props.breakpoint=1000]  Width below which insets/positions narrow.
 * @param {object}  [props.header]           Data for the header: `{ title, links }`.
 * @param {object}  [props.footer]           Data forwarded to `Footer`.
 * @param {object}  [props.menu]             Data forwarded to `Menu`.
 * @param {object}  [props.info]             Data forwarded to `Info`.
 * @param {object}  [props.instructions]     Data forwarded to `Info` (pinned to bottom).
 * @param {object}  [props.details]          Data forwarded to `Details`.
 * @param {object}  [props.detailsInfo]      Data forwarded to `DetailsInfo`.
 * @param {object}  [props.thumbnail]        Data forwarded to `Thumbnail`.
 * @param {boolean|object} [props.detailsButton]  Truthy → show `DetailsButton`.
 * @param {object}  [props.muteButton]       Data forwarded to `MuteButton`.
 * @param {object}  [props.audioButton]      Data forwarded to `AudioButton`.
 * @param {function} [props.onDetails]       Called with `{ open }` when details toggles.
 * @param {function} [props.onUI]            Called with `{ open }` on Ctrl+0 toggle.
 * @param {object}  [props.ref]  Exposes `animateIn`, `animateOut`, `toggleDetails`,
 *   `addPanel`, `getPanelIndex`, `getPanelValue`, `setPanelIndex`, `setPanelValue`,
 *   `invert` and `update`.
 * @example
 * const uiRef = useRef(null);
 * <UI fps header={{ title: { name: 'Space.js' } }} details={detailsData} ref={uiRef} />
 * uiRef.current.animateIn();
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
    ref
}) {
    // ── Per-child refs ──────────────────────────────────────────────────────
    const headerRootRef = useRef(null);
    const navTitleRef = useRef(null);
    const navLinkRefs = useRef([]);
    const headerInfoRef = useRef(null);

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

    // Button wrapper refs (for responsive positioning)
    const dbWrapRef = useRef(null);
    const muteWrapRef = useRef(null);
    const audioWrapRef = useRef(null);

    // Mutable tracking (no renders needed)
    const stateRef = useRef({
        animatedIn: false,
        detailsOpen: false,
        detailsInfoOpen: false,
        detailsToggle: false,
        detailsInfoToggle: false
    });

    // ── Derived flags ───────────────────────────────────────────────────────
    const showHeader = !!(header || fps || fpsOpen);
    const showInfo = fps || fpsOpen;
    const headerLinks = (header && Array.isArray(header.links)) ? header.links : [];

    // ── Header children collector for staggered animations ─────────────────
    const getHeaderChildren = () => [
        (header && header.title) ? navTitleRef.current : null,
        ...headerLinks.map((_, i) => navLinkRefs.current[i]),
        showInfo ? headerInfoRef.current : null
    ].filter(Boolean);

    // Hide header children before first paint (mirrors Header's useLayoutEffect)
    useLayoutEffect(() => {
        if (!showHeader) return;
        getHeaderChildren().forEach(child => child?.hide?.());
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Responsive layout ───────────────────────────────────────────────────
    useResize(({ width }) => {
        const narrow = width < breakpoint;
        const inset = narrow ? 10 : 20;

        if (headerRootRef.current) {
            headerRootRef.current.style.left = `${inset}px`;
            headerRootRef.current.style.top = `${inset}px`;
            headerRootRef.current.style.right = `${inset}px`;
        }

        // DetailsButton
        if (dbWrapRef.current) {
            dbWrapRef.current.style.left = narrow ? '9px' : '19px';
            dbWrapRef.current.style.bottom = narrow ? '8px' : '18px';
        }
        // MuteButton / AudioButton
        [muteWrapRef, audioWrapRef].forEach(r => {
            if (r.current) {
                r.current.style.right = narrow ? '12px' : '22px';
                r.current.style.bottom = narrow ? '10px' : '20px';
            }
        });

        // Canvas resize (MuteButton/AudioButton redraw)
        muteButtonRef.current?.resize?.();
        audioButtonRef.current?.resize?.();
    });

    // ── Core animation helpers (used by both imperative handle and keyboard) ─
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

        if (showHeader) {
            const children = getHeaderChildren();
            children.forEach((child, i) => child?.animateIn?.(i * 200));
            if (fpsOpen) headerInfoRef.current?.openPanel();
        }

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

        if (showHeader) {
            getHeaderChildren().forEach(child => child?.animateOut?.());
        }

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

    // ── Keyboard shortcuts ──────────────────────────────────────────────────
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

    // ── Imperative handle ───────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
        animateIn: () => handleAnimateIn(),
        animateOut: () => handleAnimateOut(),
        toggleDetails: show => handleToggleDetails(show),

        // Panel methods — delegate to HeaderInfo
        addPanel: item => headerInfoRef.current?.addPanel(item),
        getPanelIndex: name => headerInfoRef.current?.getPanelIndex(name),
        getPanelValue: name => headerInfoRef.current?.getPanelValue(name),
        setPanelIndex: (name, idx, path) => headerInfoRef.current?.setPanelIndex(name, idx, path),
        setPanelValue: (name, val, path) => headerInfoRef.current?.setPanelValue(name, val, path),

        /**
         * Set CSS colour variables on the document root to switch between light
         * and dark themes. Mirrors `UI.invert()` from the original.
         */
        invert(isInverted) {
            const s = getComputedStyle(document.documentElement);
            const get = v => s.getPropertyValue(v).trim();
            const r = document.documentElement;

            r.style.setProperty('--ui-color', isInverted ? get('--ui-invert-light-color') : get('--ui-invert-dark-color'));
            r.style.setProperty('--ui-color-triplet', isInverted ? get('--ui-invert-light-color-triplet') : get('--ui-invert-dark-color-triplet'));
            r.style.setProperty('--ui-color-line', isInverted ? get('--ui-invert-light-color-line') : get('--ui-invert-dark-color-line'));

            // Buttons redraw their canvas strokes from CSS vars on next frame
            muteButtonRef.current?.resize?.();
            audioButtonRef.current?.resize?.();
            detailsButtonRef.current?.resize?.();
        },

        /**
         * No-op. Per-frame work is driven by `useTicker` internally — no
         * external `requestAnimationFrame` loop required.
         */
        update: () => {}
    }), []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <div className="ui">
            {/* Details panel (rendered first so it sits below other overlays) */}
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

            {/* Header (inlined for direct headerInfoRef access) */}
            {showHeader && (
                <div ref={headerRootRef} className="header">
                    {header && header.title && (
                        <NavTitle
                            ref={navTitleRef}
                            {...header.title}
                        />
                    )}
                    {headerLinks.map((linkData, i) => (
                        <NavLink
                            key={i}
                            ref={el => { navLinkRefs.current[i] = el; }}
                            {...linkData}
                        />
                    ))}
                    {showInfo && (
                        <HeaderInfo
                            ref={headerInfoRef}
                            fpsOpen={fpsOpen}
                        />
                    )}
                </div>
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

            {/* Instructions (bottom) */}
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
                <div
                    ref={dbWrapRef}
                    className="ui-details-button"
                >
                    <DetailsButton
                        ref={detailsButtonRef}
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
                <div
                    ref={muteWrapRef}
                    className="ui-mute-button"
                >
                    <MuteButton
                        ref={muteButtonRef}
                        {...muteButton}
                    />
                </div>
            )}

            {/* AudioButton — fixed lower-right */}
            {audioButton && (
                <div
                    ref={audioWrapRef}
                    className="ui-audio-button"
                >
                    <AudioButton
                        ref={audioButtonRef}
                        {...audioButton}
                    />
                </div>
            )}
        </div>
    );
}
