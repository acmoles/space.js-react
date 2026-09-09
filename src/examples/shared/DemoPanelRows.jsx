import { useCallback, useState } from 'react';

import { brightness, getKeyByValue } from '@lib/index.js';

import {
    Panel,
    PanelColor,
    PanelContent,
    PanelDivider,
    PanelLinkRow,
    PanelList,
    PanelSlider,
    PanelSpacer,
    PanelThumbnailRow,
    PanelToggle
} from '../../space/components/panels/index.js';

const TOGGLE_OPTIONS = new Map([
    ['Dark', false],
    ['Light', true]
]);

const SELECT_OPTIONS = new Map([
    ['Never', 1],
    ['Gonna', 2],
    ['Give', 3],
    ['You', 4],
    ['Up', 5]
]);

const CONTENT_OPTIONS = new Map([
    ['Content A', 1],
    ['Content B', 2],
    ['Empty', 3]
]);

/**
 * The full set of demo panel rows shared by the `panel` and `fps_panel`
 * examples.  Nested content is derived from state rather than injected
 * imperatively; `*Touched` mirrors the original `hasContent()` guard, so
 * content is created on first interaction and thereafter only shown or hidden.
 *
 * @param {object} props
 * @param {object} props.hostRef Ref to the object exposing `invert()` and
 *   `setPanelValue()` — the `Panel` itself in `panel`, the `UI` in `fps_panel`.
 * @param {string} props.backgroundColor Initial colour value.
 * @param {HTMLImageElement} props.img Thumbnail image.
 */
export function DemoPanelRows({ hostRef, backgroundColor, img }) {
    const [contentSelection, setContentSelection] = useState(null);
    const [sliderValue, setSliderValue] = useState(0);
    const [sliderTouched, setSliderTouched] = useState(false);
    const [toggleValue, setToggleValue] = useState(false);
    const [toggleTouched, setToggleTouched] = useState(false);

    const handleColor = useCallback(e => {
        document.body.style.backgroundColor = `#${e.value.getHexString()}`;
        hostRef.current?.invert(brightness(e.value) > 0.6);
    }, [hostRef]);

    const handleListToggle = useCallback(e => {
        console.log('ListToggle callback:', e.value);

        if (TOGGLE_OPTIONS.get(e.value)) {
            hostRef.current?.setPanelValue('Color', 0xffffff);
        } else {
            hostRef.current?.setPanelValue('Color', backgroundColor);
        }
    }, [hostRef, backgroundColor]);

    const handleListSelect = useCallback(e => {
        console.log('ListSelect callback:', e.value);

        if (SELECT_OPTIONS.get(e.value) === 5) {
            open('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        }
    }, []);

    const handleListContent = useCallback(e => {
        console.log('ListSelect with content callback:', e.value);

        setContentSelection(e.value);
    }, []);

    const handleSlider = useCallback(e => {
        console.log('Slider with content callback:', e.value);

        setSliderTouched(true);
        setSliderValue(e.value);
    }, []);

    const handleToggle = useCallback(e => {
        console.log('Toggle with content callback:', e.value);

        setToggleTouched(true);
        setToggleValue(e.value);
    }, []);

    const handleThumbnail = useCallback(e => {
        console.log('Thumbnail callback:', e.value);
    }, []);

    const handleReset = useCallback(() => {
        console.log('Link callback: Reset');

        hostRef.current?.setPanelValue('Color', backgroundColor);
        hostRef.current?.setPanelValue('List Toggle', false);
        hostRef.current?.setPanelValue('List Select', 1);
        hostRef.current?.setPanelValue('List Content', 1);
        hostRef.current?.setPanelValue('Slider', 0);
        hostRef.current?.setPanelValue('Toggle', false);
        hostRef.current?.setPanelValue('Thumbnail', img);
    }, [hostRef, backgroundColor, img]);

    const nestedColor = (name, key) => (
        <Panel key={key} autoAnimateIn>
            <PanelDivider />
            <PanelColor name={name} value={backgroundColor} onChange={handleColor} />
        </Panel>
    );

    return (
        <>
            <PanelColor name="Color" value={backgroundColor} onChange={handleColor} />
            <PanelList
                name="List Toggle"
                list={TOGGLE_OPTIONS}
                value={getKeyByValue(TOGGLE_OPTIONS, false)}
                onChange={handleListToggle}
            />
            <PanelDivider />
            <PanelList
                name="List Select"
                list={SELECT_OPTIONS}
                value="Never"
                onChange={handleListSelect}
            />
            <PanelDivider />
            <PanelList
                name="List Content"
                list={CONTENT_OPTIONS}
                value="Content A"
                onChange={handleListContent}
            >
                {contentSelection === 'Content A' && nestedColor('Nested Color 1', 'a')}
                {contentSelection === 'Content B' && (
                    <Panel key="b" autoAnimateIn>
                        <PanelDivider />
                        <PanelSlider
                            name="Nested"
                            min={0}
                            max={1}
                            step={0.01}
                            value={0.5}
                            onChange={e => console.log('Slider callback:', e.value)}
                        />
                    </Panel>
                )}
            </PanelList>
            <PanelDivider />
            <PanelSlider
                name="Slider"
                min={0}
                max={1}
                step={0.01}
                value={0}
                onChange={handleSlider}
                showContent={sliderValue > 0}
            >
                {sliderTouched && nestedColor('Nested Color 2')}
            </PanelSlider>
            <PanelDivider />
            <PanelToggle
                name="Toggle"
                value={false}
                onChange={handleToggle}
                showContent={!!toggleValue}
            >
                {toggleTouched && nestedColor('Nested Color 3')}
            </PanelToggle>
            <PanelDivider />
            <PanelContent>
                <Panel autoAnimateIn>
                    <PanelColor
                        name="Nested Color 4"
                        value={backgroundColor}
                        onChange={handleColor}
                    />
                </Panel>
            </PanelContent>
            <PanelDivider />
            <PanelThumbnailRow name="Thumbnail" value={img} onChange={handleThumbnail} />
            <PanelSpacer />
            <PanelLinkRow value="Reset" onChange={handleReset} />
        </>
    );
}
