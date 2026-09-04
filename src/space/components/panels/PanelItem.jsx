import { useImperativeHandle, useRef } from 'react';

import { useAnimation } from '../../motion/index.js';
import { ColorPicker } from './ColorPicker.jsx';
import { Content } from './Content.jsx';
import { List } from './List.jsx';
import { PanelGraph } from './PanelGraph.jsx';
import { PanelLink } from './PanelLink.jsx';
import { PanelMeter } from './PanelMeter.jsx';
import { PanelThumbnail } from './PanelThumbnail.jsx';
import { Slider } from './Slider.jsx';
import { Toggle } from './Toggle.jsx';

import './PanelItem.css';

/**
 * A panel item that wraps one of the panel control types based on `data.type`.
 * Supports all item types from the original `PanelItem` class with identical
 * animations and interaction behaviour.
 *
 * @param {object}   props
 * @param {object}   props.data          Item descriptor — same shape as original.
 * @param {function} [props.onChange]    Called when the item value changes.
 * @param {object}   [props.ref]  Exposes `animateIn(delay, fast)`,
 *                                `animateOut(index, total, delay, callback)`,
 *                                `enable()`, `disable()`,
 *                                `getPanelValue(name)`, `setPanelValue(name, value)`.
 * @example
 * <PanelItem data={{ type: 'slider', name: 'Speed', min: 0, max: 10, value: 5 }} onChange={e => console.log(e)} />
 */
export function PanelItem({ data, onChange, ref }) {
    const [rootRef, root] = useAnimation({ y: -10, opacity: 0 });
    const [containerRef, container] = useAnimation();

    // Ref to the view component (Slider, Toggle etc.) for enable/disable
    const viewRef = useRef(null);
    // Ref to PanelGraph/PanelMeter for enable/disable
    const graphRef = useRef(null);

    useImperativeHandle(ref, () => ({
        get element() { return rootRef.current; },
        animateIn(delay, fast) {
            root.stop();
            if (graphRef.current) graphRef.current.enable();
            if (fast) {
                root.set({ y: 0, opacity: 1 });
            } else {
                root.set({ y: -10, opacity: 0 }).animate({ y: 0, opacity: 1 }, 400, 'easeOutCubic', delay);
            }
        },
        animateOut(index, _total, delay, callback) {
            root.stop().animate({ y: -10, opacity: 0 }, 500, 'easeInCubic', delay, () => {
                if (graphRef.current) graphRef.current.disable();
                if (index === 0 && callback) callback();
            });
        },
        enable() {
            container.stop().animate({ opacity: 1 }, 500, 'easeInOutSine', () => {
                if (containerRef.current) containerRef.current.style.pointerEvents = 'auto';
            });
        },
        disable() {
            container.stop();
            if (containerRef.current) containerRef.current.style.pointerEvents = 'none';
            container.animate({ opacity: 0.35 }, 500, 'easeInOutSine');
        },
        // Panel value API — allows Panel.setPanelValue to delegate to items by name
        getPanelValue(name) {
            if (data.name !== name) return undefined;
            return viewRef.current?.getValue?.() ?? graphRef.current?.getValue?.();
        },
        setPanelValue(name, value) {
            if (data.name !== name) return;
            viewRef.current?.setValue?.(value, false);
            graphRef.current?.setValue?.(value);
        },
        getPanelIndex(name) {
            if (data.name !== name) return undefined;
            return viewRef.current?.getIndex?.();
        },
        setPanelIndex(name, index) {
            if (data.name !== name) return;
            viewRef.current?.setIndex?.(index, false);
        }
    }), [root, container, containerRef, rootRef]);

    const handleChange = e => {
        // Pass the view/graph ref as the second argument — mirrors the original
        // PanelItem API where callbacks receive `(value, item)` and can call
        // `item.update()`, `item.setContent()`, `item.toggleContent()`, etc.
        const itemHandle = viewRef.current || graphRef.current;
        if (data.callback) data.callback(e.value, itemHandle);
        if (onChange) onChange(e);
    };

    // Container style varies by type
    let containerStyle = {};
    if (data.type === 'spacer') {
        containerStyle = { height: 7 };
    } else if (data.type === 'divider') {
        containerStyle = { margin: '6px 0' };
    } else if (data.type === 'link') {
        containerStyle = { margin: '2px 0 0' };
    } else if (data.type === 'graph' || data.type === 'meter') {
        containerStyle = { margin: '0 0 6px' };
    } else if (data.type === 'color') {
        containerStyle = { margin: '6px 0 4px' };
    }

    const renderContent = () => {
        const { type } = data;

        if (!type) {
            return <div className="content">{data.name}</div>;
        }
        if (type === 'spacer') return null;
        if (type === 'divider') {
            return <div className="line" />;
        }
        if (type === 'link') {
            return (
                <PanelLink
                    ref={viewRef}
                    name={data.name}
                    value={data.value}
                    onChange={handleChange}
                />
            );
        }
        if (type === 'thumbnail') {
            return (
                <PanelThumbnail
                    ref={viewRef}
                    name={data.name}
                    data={data.data}
                    value={data.value}
                    onChange={handleChange}
                />
            );
        }
        if (type === 'graph') {
            return (
                <PanelGraph
                    ref={graphRef}
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
        }
        if (type === 'meter') {
            return (
                <PanelMeter
                    ref={graphRef}
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
        }
        if (type === 'list') {
            return (
                <List
                    ref={viewRef}
                    name={data.name}
                    list={data.list}
                    value={data.value}
                    onChange={handleChange}
                />
            );
        }
        if (type === 'slider') {
            return (
                <Slider
                    ref={viewRef}
                    name={data.name}
                    min={data.min}
                    max={data.max}
                    step={data.step}
                    value={data.value}
                    onChange={handleChange}
                />
            );
        }
        if (type === 'toggle') {
            return (
                <Toggle
                    ref={viewRef}
                    name={data.name}
                    value={data.value}
                    onChange={handleChange}
                />
            );
        }
        if (type === 'content') {
            return (
                <Content ref={viewRef} onChange={handleChange} />
            );
        }
        if (type === 'color') {
            return (
                <ColorPicker
                    ref={viewRef}
                    name={data.name}
                    value={data.value}
                    noSwatch={data.noSwatch}
                    noText={data.noText}
                    onChange={handleChange}
                />
            );
        }

        return null;
    };

    return (
        <div ref={rootRef} className="panel-item">
            <div ref={containerRef} className="container" style={containerStyle}>
                {renderContent()}
            </div>
        </div>
    );
}
