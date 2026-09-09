import { useCallback, useRef } from 'react';

import { ColorPicker } from '../ColorPicker.jsx';
import { Content } from '../Content.jsx';
import { List } from '../List.jsx';
import { PanelGraph } from '../PanelGraph.jsx';
import { PanelItem } from '../PanelItem.jsx';
import { PanelLink } from '../PanelLink.jsx';
import { PanelMeter } from '../PanelMeter.jsx';
import { PanelThumbnail } from '../PanelThumbnail.jsx';
import { Slider } from '../Slider.jsx';
import { Toggle } from '../Toggle.jsx';

/**
 * The row components that make up a `Panel`.
 *
 * Each renders a `PanelItem` envelope around a single control, and carries the
 * container margins the reference library applied per item type. Compose them
 * as children of a `Panel`:
 *
 * @example
 * <Panel ref={panelRef}>
 *     <PanelLabel name="Settings" />
 *     <PanelDivider />
 *     <PanelSlider name="Speed" min={0} max={10} step={0.1} value={5} onChange={setSpeed} />
 *     <PanelToggle name="Visible" value onChange={setVisible} />
 * </Panel>
 */

/**
 * Returns a change listener that stamps the event with the control producing it.
 *
 * The controls all emit `target: null`; filling it in means a listener — in
 * particular a descriptor's `callback`, which the reference API calls as
 * `(value, item)` — can reach the control's handle to set nested content.
 *
 * @param {object}   sourceRef  Ref to the control.
 * @param {function} [onChange] The listener to forward to.
 * @returns {function} The wrapped listener.
 */
function useSourceEvent(sourceRef, onChange) {
    return useCallback(e => {
        if (onChange) onChange({ ...e, target: e.target ?? sourceRef.current });
    }, [sourceRef, onChange]);
}

/** A plain text row. */
export function PanelLabel({ name }) {
    return (
        <PanelItem name={name}>
            <div className="content">{name}</div>
        </PanelItem>
    );
}

/** Vertical whitespace. */
export function PanelSpacer() {
    return <PanelItem style={{ height: 7 }} />;
}

/**
 * A horizontal rule.
 *
 * The height and colour are inline because the reference library sets them on
 * the element; no `.line` rule applies at this level.
 */
export function PanelDivider() {
    return (
        <PanelItem style={{ margin: '6px 0' }}>
            <div className="line" style={{ height: 1, backgroundColor: 'var(--ui-color-divider-line)' }} />
        </PanelItem>
    );
}

/** A hyperlink row. */
export function PanelLinkRow({ name, value, onChange, ref }) {
    const viewRef = useRef(null);
    const emit = useSourceEvent(viewRef, onChange);

    return (
        <PanelItem ref={ref} name={name} style={{ margin: '2px 0 0' }} viewRef={viewRef}>
            <PanelLink ref={viewRef} name={name} value={value} onChange={emit} />
        </PanelItem>
    );
}

/** An image strip whose frames can be selected. */
export function PanelThumbnailRow({ name, data, value, onChange, ref }) {
    const viewRef = useRef(null);
    const emit = useSourceEvent(viewRef, onChange);

    return (
        <PanelItem ref={ref} name={name} viewRef={viewRef}>
            <PanelThumbnail ref={viewRef} name={name} data={data} value={value} onChange={emit} />
        </PanelItem>
    );
}

/** A plotted graph row. */
export function PanelGraphRow({ name, ref, ...props }) {
    const graphRef = useRef(null);

    return (
        <PanelItem ref={ref} name={name} style={{ margin: '0 0 6px' }} graphRef={graphRef}>
            <PanelGraph ref={graphRef} name={name} {...props} />
        </PanelItem>
    );
}

/** A single-value meter row. */
export function PanelMeterRow({ name, ref, ...props }) {
    const graphRef = useRef(null);

    return (
        <PanelItem ref={ref} name={name} style={{ margin: '0 0 6px' }} graphRef={graphRef}>
            <PanelMeter ref={graphRef} name={name} {...props} />
        </PanelItem>
    );
}

/**
 * A list row, rendered as a toggle or a select depending on the list length.
 *
 * Children become the row's nested content, so a sub-panel can be derived from
 * state rather than pushed in imperatively.
 */
export function PanelList({ name, list, value, onChange, children, ref }) {
    const viewRef = useRef(null);
    const emit = useSourceEvent(viewRef, onChange);

    return (
        <PanelItem ref={ref} name={name} viewRef={viewRef}>
            <List ref={viewRef} name={name} list={list} value={value} onChange={emit}>
                {children}
            </List>
        </PanelItem>
    );
}

/** A draggable value row. Children become nested content. */
export function PanelSlider({ name, min, max, step, value, onChange, children, ref }) {
    const viewRef = useRef(null);
    const emit = useSourceEvent(viewRef, onChange);

    return (
        <PanelItem ref={ref} name={name} viewRef={viewRef}>
            <Slider
                ref={viewRef}
                name={name}
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={emit}
            >
                {children}
            </Slider>
        </PanelItem>
    );
}

/** A boolean row. Children become nested content. */
export function PanelToggle({ name, value, onChange, children, ref }) {
    const viewRef = useRef(null);
    const emit = useSourceEvent(viewRef, onChange);

    return (
        <PanelItem ref={ref} name={name} viewRef={viewRef}>
            <Toggle ref={viewRef} name={name} value={value} onChange={emit}>
                {children}
            </Toggle>
        </PanelItem>
    );
}

/** A colour swatch and picker row. */
export function PanelColor({ name, value, noSwatch, noText, onChange, ref }) {
    const viewRef = useRef(null);
    const emit = useSourceEvent(viewRef, onChange);

    return (
        <PanelItem ref={ref} name={name} style={{ margin: '6px 0 4px' }} viewRef={viewRef}>
            <ColorPicker
                ref={viewRef}
                name={name}
                value={value}
                noSwatch={noSwatch}
                noText={noText}
                onChange={emit}
            />
        </PanelItem>
    );
}

/** A bare container for arbitrary nested content. */
export function PanelContent({ name, onChange, children, ref }) {
    const viewRef = useRef(null);
    const emit = useSourceEvent(viewRef, onChange);

    return (
        <PanelItem ref={ref} name={name} viewRef={viewRef}>
            <Content ref={viewRef} onChange={emit}>
                {children}
            </Content>
        </PanelItem>
    );
}
