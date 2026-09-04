import { createElement, useEffect, useRef, useState } from 'react';

import { brightness, getKeyByValue } from '@lib/index.js';

import { Example } from '@/components';

import { Panel } from '../../space/components/panels/Panel.jsx';

/**
 * Standalone Panel example — a full-featured panel centered in the viewport.
 * Mirrors `panel.html`.
 */
export default function PanelExample({ title }) {
    const panelRef = useRef(null);

    const backgroundColor = getComputedStyle(document.querySelector(':root'))
        .getPropertyValue('--bg-color').trim();

    const [originalBodyBg] = useState(() => document.body.style.backgroundColor);

    const [toggleOptions] = useState(() => new Map([
        ['Dark', false],
        ['Light', true]
    ]));

    const [selectOptions] = useState(() => new Map([
        ['Never', 1],
        ['Gonna', 2],
        ['Give', 3],
        ['You', 4],
        ['Up', 5]
    ]));

    const [contentOptions] = useState(() => new Map([
        ['Content A', 1],
        ['Content B', 2],
        ['Empty', 3]
    ]));

    const [img] = useState(() => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = 'https://space.js.org/assets/meta/share.png';
        return image;
    });

    const [items] = useState(() => [
        {
            type: 'color',
            name: 'Color',
            value: backgroundColor,
            callback: value => {
                document.body.style.backgroundColor = `#${value.getHexString()}`;
                panelRef.current?.invert(brightness(value) > 0.6);
            }
        },
        {
            type: 'list',
            name: 'List Toggle',
            list: toggleOptions,
            value: getKeyByValue(toggleOptions, false),
            callback: value => {
                console.log('ListToggle callback:', value);

                const light = toggleOptions.get(value);

                if (light) {
                    panelRef.current?.setPanelValue('Color', 0xffffff);
                } else {
                    panelRef.current?.setPanelValue('Color', backgroundColor);
                }
            }
        },
        {
            type: 'divider'
        },
        {
            type: 'list',
            name: 'List Select',
            list: selectOptions,
            value: 'Never',
            callback: value => {
                console.log('ListSelect callback:', value);

                const roll = selectOptions.get(value);

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
            list: contentOptions,
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
                                        panelRef.current?.invert(brightness(colorValue) > 0.6);
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
                                    panelRef.current?.invert(brightness(colorValue) > 0.6);
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
                                    panelRef.current?.invert(brightness(colorValue) > 0.6);
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
                                panelRef.current?.invert(brightness(colorValue) > 0.6);
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

                panelRef.current?.setPanelValue('Color', backgroundColor);
                panelRef.current?.setPanelValue('List Toggle', false);
                panelRef.current?.setPanelValue('List Select', 1);
                panelRef.current?.setPanelValue('List Content', 1);
                panelRef.current?.setPanelValue('Slider', 0);
                panelRef.current?.setPanelValue('Toggle', false);
                panelRef.current?.setPanelValue('Thumbnail', img);
            }
        }
    ]);

    useEffect(() => {
        panelRef.current?.animateIn();

        return () => {
            document.body.style.backgroundColor = originalBodyBg;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <Example title={title} center>
            <Panel ref={panelRef} items={items} />
        </Example>
    );
}
