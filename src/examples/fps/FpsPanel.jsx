import { createElement, useEffect, useRef, useState } from 'react';

import { brightness, getKeyByValue } from '@lib/index.js';

import { Example } from '@/components';

import { Panel } from '../../space/components/panels/Panel.jsx';
import { UI } from '../../space/components/ui/UI.jsx';

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
 * FPS Panel example — renders the UI with fps panel open and a full set of
 * panel controls including nested content. Mirrors `fps_panel.html`.
 */
export default function FpsPanelExample({ title }) {
    const uiRef = useRef(null);

    const [backgroundColor] = useState(() =>
        getComputedStyle(document.querySelector(':root')).getPropertyValue('--bg-color').trim()
    );
    const [originalBodyBg] = useState(() => document.body.style.backgroundColor);
    const [img] = useState(() => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = 'https://space.js.org/assets/meta/share.png';
        return image;
    });

    const [panelItems] = useState(() => [
        {
            name: 'FPS'
        },
        {
            type: 'divider'
        },
        {
            type: 'color',
            name: 'Color',
            value: backgroundColor,
            callback: value => {
                document.body.style.backgroundColor = `#${value.getHexString()}`;
                uiRef.current?.invert(brightness(value) > 0.6);
            }
        },
        {
            type: 'list',
            name: 'List Toggle',
            list: TOGGLE_OPTIONS,
            value: getKeyByValue(TOGGLE_OPTIONS, false),
            callback: value => {
                console.log('ListToggle callback:', value);

                const light = TOGGLE_OPTIONS.get(value);

                if (light) {
                    uiRef.current?.setPanelValue('Color', 0xffffff);
                } else {
                    uiRef.current?.setPanelValue('Color', backgroundColor);
                }
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'list',
            name: 'List Select',
            list: SELECT_OPTIONS,
            value: 'Never',
            callback: value => {
                console.log('ListSelect callback:', value);

                const roll = SELECT_OPTIONS.get(value);

                if (roll === 5) {
                    open('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
                }
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'list',
            name: 'List Content',
            list: CONTENT_OPTIONS,
            value: 'Content A',
            callback: (value, item) => {
                console.log('ListSelect with content callback:', value);

                switch (value) {
                    case 'Content A': {
                        item.setContent(createElement(Panel, {
                            items: [
                                {
                                    type: 'divider'
                                },
                                {
                                    type: 'color',
                                    name: 'Nested Color 1',
                                    value: backgroundColor,
                                    callback: colorValue => {
                                        document.body.style.backgroundColor = `#${colorValue.getHexString()}`;
                                        uiRef.current?.invert(brightness(colorValue) > 0.6);
                                    }
                                }
                            ],
                            autoAnimateIn: true
                        }));
                        item.toggleContent(true);
                        break;
                    }
                    case 'Content B': {
                        item.setContent(createElement(Panel, {
                            items: [
                                {
                                    type: 'divider'
                                },
                                {
                                    type: 'slider',
                                    name: 'Nested',
                                    min: 0,
                                    max: 1,
                                    step: 0.01,
                                    value: 0.5,
                                    callback: sliderValue => {
                                        console.log('Slider callback:', sliderValue);
                                    }
                                }
                            ],
                            autoAnimateIn: true
                        }));
                        item.toggleContent(true);
                        break;
                    }
                    default: {
                        item.toggleContent(false);
                        break;
                    }
                }
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'slider',
            name: 'Slider',
            min: 0,
            max: 1,
            step: 0.01,
            value: 0,
            callback: (value, item) => {
                console.log('Slider with content callback:', value);

                if (!item.hasContent()) {
                    item.setContent(createElement(Panel, {
                        items: [
                            {
                                type: 'divider'
                            },
                            {
                                type: 'color',
                                name: 'Nested Color 2',
                                value: backgroundColor,
                                callback: colorValue => {
                                    document.body.style.backgroundColor = `#${colorValue.getHexString()}`;
                                    uiRef.current?.invert(brightness(colorValue) > 0.6);
                                }
                            }
                        ],
                        autoAnimateIn: true
                    }));
                }

                if (value > 0) {
                    item.toggleContent(true);
                } else {
                    item.toggleContent(false);
                }
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'toggle',
            name: 'Toggle',
            value: false,
            callback: (value, item) => {
                console.log('Toggle with content callback:', value);

                if (!item.hasContent()) {
                    item.setContent(createElement(Panel, {
                        items: [
                            {
                                type: 'divider'
                            },
                            {
                                type: 'color',
                                name: 'Nested Color 3',
                                value: backgroundColor,
                                callback: colorValue => {
                                    document.body.style.backgroundColor = `#${colorValue.getHexString()}`;
                                    uiRef.current?.invert(brightness(colorValue) > 0.6);
                                }
                            }
                        ],
                        autoAnimateIn: true
                    }));
                }

                if (value > 0) {
                    item.toggleContent(true);
                } else {
                    item.toggleContent(false);
                }
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'content',
            callback: (value, item) => {
                item.setContent(createElement(Panel, {
                    items: [
                        {
                            type: 'color',
                            name: 'Nested Color 4',
                            value: backgroundColor,
                            callback: colorValue => {
                                document.body.style.backgroundColor = `#${colorValue.getHexString()}`;
                                uiRef.current?.invert(brightness(colorValue) > 0.6);
                            }
                        }
                    ],
                    autoAnimateIn: true
                }));
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'thumbnail',
            name: 'Thumbnail',
            value: img,
            callback: value => {
                console.log('Thumbnail callback:', value);
            }
        },
        {
            type: 'spacer'
        },
        {
            type: 'link',
            value: 'Reset',
            callback: () => {
                console.log('Link callback: Reset');

                uiRef.current?.setPanelValue('Color', backgroundColor);
                uiRef.current?.setPanelValue('List Toggle', false);
                uiRef.current?.setPanelValue('List Select', 1);
                uiRef.current?.setPanelValue('List Content', 1);
                uiRef.current?.setPanelValue('Slider', 0);
                uiRef.current?.setPanelValue('Toggle', false);
                uiRef.current?.setPanelValue('Thumbnail', img);
            }
        }
    ]);

    useEffect(() => {
        uiRef.current?.animateIn();

        return () => {
            document.body.style.backgroundColor = originalBodyBg;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <Example title={title}>
            <UI ref={uiRef} fps fpsOpen panelItems={panelItems} />
        </Example>
    );
}
