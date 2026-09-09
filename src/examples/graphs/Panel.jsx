import { useCallback, useEffect, useRef, useState } from 'react';

import { brightness, getKeyByValue } from '@lib/index.js';

import { Example } from '@/components';

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

const toggleOptions = new Map([
    ['Dark', false],
    ['Light', true]
]);

const selectOptions = new Map([
    ['Never', 1],
    ['Gonna', 2],
    ['Give', 3],
    ['You', 4],
    ['Up', 5]
]);

const contentOptions = new Map([
    ['Content A', 1],
    ['Content B', 2],
    ['Empty', 3]
]);

/**
 * Standalone Panel example — a full-featured panel centered in the viewport.
 * Mirrors `panel.html`.
 */
export default function PanelExample({ title }) {
    const panelRef = useRef(null);

    const backgroundColor = getComputedStyle(document.querySelector(':root'))
        .getPropertyValue('--bg-color').trim();

    const [originalBodyBg] = useState(() => document.body.style.backgroundColor);

    const [img] = useState(() => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = 'https://space.js.org/assets/meta/share.png';
        return image;
    });

    // Nested content is derived from state rather than injected imperatively.
    // `*Touched` mirrors the original `hasContent()` guard: content is created
    // on first interaction and then only shown or hidden, never rebuilt.
    const [contentSelection, setContentSelection] = useState(null);
    const [sliderValue, setSliderValue] = useState(0);
    const [sliderTouched, setSliderTouched] = useState(false);
    const [toggleValue, setToggleValue] = useState(false);
    const [toggleTouched, setToggleTouched] = useState(false);

    const applyBackground = useCallback(value => {
        document.body.style.backgroundColor = `#${value.getHexString()}`;
        panelRef.current?.invert(brightness(value) > 0.6);
    }, []);

    const handleColor = useCallback(e => applyBackground(e.value), [applyBackground]);

    const handleListToggle = useCallback(e => {
        console.log('ListToggle callback:', e.value);

        if (toggleOptions.get(e.value)) {
            panelRef.current?.setPanelValue('Color', 0xffffff);
        } else {
            panelRef.current?.setPanelValue('Color', backgroundColor);
        }
    }, [backgroundColor]);

    const handleListSelect = useCallback(e => {
        console.log('ListSelect callback:', e.value);

        if (selectOptions.get(e.value) === 5) {
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

        panelRef.current?.setPanelValue('Color', backgroundColor);
        panelRef.current?.setPanelValue('List Toggle', false);
        panelRef.current?.setPanelValue('List Select', 1);
        panelRef.current?.setPanelValue('List Content', 1);
        panelRef.current?.setPanelValue('Slider', 0);
        panelRef.current?.setPanelValue('Toggle', false);
        panelRef.current?.setPanelValue('Thumbnail', img);
    }, [backgroundColor, img]);

    useEffect(() => {
        panelRef.current?.animateIn();

        return () => {
            document.body.style.backgroundColor = originalBodyBg;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const nestedColor = (name, key) => (
        <Panel key={key} autoAnimateIn>
            <PanelDivider />
            <PanelColor name={name} value={backgroundColor} onChange={handleColor} />
        </Panel>
    );

    return (
        <Example title={title} center>
            <Panel ref={panelRef}>
                <PanelColor name="Color" value={backgroundColor} onChange={handleColor} />
                <PanelList
                    name="List Toggle"
                    list={toggleOptions}
                    value={getKeyByValue(toggleOptions, false)}
                    onChange={handleListToggle}
                />
                <PanelDivider />
                <PanelList
                    name="List Select"
                    list={selectOptions}
                    value="Never"
                    onChange={handleListSelect}
                />
                <PanelDivider />
                <PanelList
                    name="List Content"
                    list={contentOptions}
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
            </Panel>
        </Example>
    );
}
