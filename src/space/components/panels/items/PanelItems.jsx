import { PanelItem } from '../PanelItem.jsx';
import {
    PanelColor,
    PanelContent,
    PanelDivider,
    PanelGraphRow,
    PanelLabel,
    PanelLinkRow,
    PanelList,
    PanelMeterRow,
    PanelSlider,
    PanelSpacer,
    PanelThumbnailRow,
    PanelToggle
} from './PanelRows.jsx';

/**
 * Renders item descriptors as panel rows.
 *
 * Declarative JSX is the primary way to build a panel. This adapter exists for
 * the panels that are genuinely data — the three.js material, light and texture
 * inspectors, which derive their rows by walking a material's properties at
 * runtime and so cannot be written out by hand.
 *
 * Those definitions drive nested content imperatively, through the `item`
 * handle passed as the second argument of a descriptor's `callback`. That is
 * why a descriptor's `callback` is wired up here in addition to `onChange`.
 *
 * @param {object}     props
 * @param {object[]}   props.items      Item descriptors. `id` or `name`, when
 *   present, is used as the React key.
 * @param {function}   [props.onChange] Called when any row emits a change.
 * @param {object[]}   [props.itemRefs] Optional array to collect row handles into.
 * @example
 * <Panel>
 *     <PanelItems items={materialsPanelItems(mesh, ui)} />
 * </Panel>
 */
export function PanelItems({ items = [], onChange, itemRefs }) {
    // Prefer a stable identity so that reordering or replacing descriptors does
    // not carry a row's uncontrolled state (slider position, list index) over to
    // a different row. Falls back to the index for anonymous rows such as
    // dividers and spacers, which hold no state.
    return items.map((data, i) => (
        <DescriptorRow
            key={data.id ?? data.name ?? i}
            data={data}
            onChange={onChange}
            ref={itemRefs ? el => { itemRefs[i] = el; } : undefined}
        />
    ));
}

/**
 * One descriptor rendered as its matching row component.
 *
 * @param {object}   props
 * @param {object}   props.data       The descriptor.
 * @param {function} [props.onChange] Called when the row emits a change.
 * @param {object}   [props.ref]      Forwarded to the underlying `PanelItem`.
 */
function DescriptorRow({ data, onChange, ref }) {
    // The reference API hands the control back to the descriptor's callback as
    // `(value, item)`, so that it can call `item.setContent()` and friends. The
    // row components forward their control's handle on the change event.
    const handleChange = e => {
        if (data.callback) data.callback(e.value, e.target);
        if (onChange) onChange(e);
    };

    switch (data.type) {
        case undefined:
            return <PanelLabel name={data.name} />;
        case 'spacer':
            return <PanelSpacer />;
        case 'divider':
            return <PanelDivider />;
        case 'link':
            return <PanelLinkRow ref={ref} name={data.name} value={data.value} onChange={handleChange} />;
        case 'thumbnail':
            return (
                <PanelThumbnailRow
                    ref={ref}
                    name={data.name}
                    data={data.data}
                    value={data.value}
                    onChange={handleChange}
                />
            );
        case 'graph':
            return (
                <PanelGraphRow
                    ref={ref}
                    name={data.name}
                    height={data.height}
                    resolution={data.resolution}
                    precision={data.precision}
                    lookupPrecision={data.lookupPrecision}
                    range={data.range}
                    suffix={data.suffix}
                    format={data.format}
                    value={data.value}
                    ghost={data.ghost}
                    noText={data.noText}
                    noHover={data.noHover}
                    noGradient={data.noGradient}
                    callback={data.callback}
                />
            );
        case 'meter':
            return (
                <PanelMeterRow
                    ref={ref}
                    name={data.name}
                    precision={data.precision}
                    range={data.range}
                    suffix={data.suffix}
                    format={data.format}
                    value={data.value}
                    ghost={data.ghost}
                    noText={data.noText}
                    noGradient={data.noGradient}
                    callback={data.callback}
                />
            );
        case 'list':
            return (
                <PanelList
                    ref={ref}
                    name={data.name}
                    list={data.list}
                    value={data.value}
                    onChange={handleChange}
                />
            );
        case 'slider':
            return (
                <PanelSlider
                    ref={ref}
                    name={data.name}
                    min={data.min}
                    max={data.max}
                    step={data.step}
                    value={data.value}
                    onChange={handleChange}
                />
            );
        case 'toggle':
            return <PanelToggle ref={ref} name={data.name} value={data.value} onChange={handleChange} />;
        case 'content':
            return <PanelContent ref={ref} name={data.name} onChange={handleChange} />;
        case 'color':
            return (
                <PanelColor
                    ref={ref}
                    name={data.name}
                    value={data.value}
                    noSwatch={data.noSwatch}
                    noText={data.noText}
                    onChange={handleChange}
                />
            );
        default:
            return <PanelItem ref={ref} name={data.name} />;
    }
}
