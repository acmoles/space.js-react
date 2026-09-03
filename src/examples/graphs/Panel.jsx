import { useEffect, useRef } from 'react';

import { Panel, PanelItem, brightness, getKeyByValue } from '@lib/index.js';

import { Example } from '@/components';

export default function PanelExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        const container = ref.current;

        const panel = new Panel();
        panel.animateIn();
        container.appendChild(panel.element);

        const backgroundColor = getComputedStyle(document.querySelector(':root')).getPropertyValue('--bg-color').trim();

        const originalBodyBg = document.body.style.backgroundColor;

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

        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = 'https://space.js.org/assets/meta/share.png';

        const items = [
            {
                type: 'color',
                name: 'Color',
                value: backgroundColor,
                callback: value => {
                    document.body.style.backgroundColor = `#${value.getHexString()}`;

                    // Light colour is inverted
                    panel.invert(brightness(value) > 0.6);
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
                        panel.setPanelValue('Color', 0xffffff);
                    } else {
                        panel.setPanelValue('Color', backgroundColor);
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
                            const nestedPanel = new Panel();
                            nestedPanel.animateIn(true);

                            [
                                {
                                    type: 'divider'
                                },
                                {
                                    type: 'color',
                                    name: 'Nested Color 1',
                                    value: backgroundColor,
                                    callback: value => {
                                        document.body.style.backgroundColor = `#${value.getHexString()}`;

                                        // Light colour is inverted
                                        panel.invert(brightness(value) > 0.6);
                                    }
                                }
                            ].forEach(data => {
                                nestedPanel.add(new PanelItem(data));
                            });

                            item.setContent(nestedPanel);
                            item.toggleContent(true);
                            break;
                        }
                        case 'Content B': {
                            const nestedPanel = new Panel();
                            nestedPanel.animateIn(true);

                            [
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
                                    callback: value => {
                                        console.log('Slider callback:', value);
                                    }
                                }
                            ].forEach(data => {
                                nestedPanel.add(new PanelItem(data));
                            });

                            item.setContent(nestedPanel);
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
                        const nestedPanel = new Panel();
                        nestedPanel.animateIn(true);

                        [
                            {
                                type: 'divider'
                            },
                            {
                                type: 'color',
                                name: 'Nested Color 2',
                                value: backgroundColor,
                                callback: value => {
                                    document.body.style.backgroundColor = `#${value.getHexString()}`;

                                    // Light colour is inverted
                                    panel.invert(brightness(value) > 0.6);
                                }
                            }
                        ].forEach(data => {
                            nestedPanel.add(new PanelItem(data));
                        });

                        item.setContent(nestedPanel);
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
                        const nestedPanel = new Panel();
                        nestedPanel.animateIn(true);

                        [
                            {
                                type: 'divider'
                            },
                            {
                                type: 'color',
                                name: 'Nested Color 3',
                                value: backgroundColor,
                                callback: value => {
                                    document.body.style.backgroundColor = `#${value.getHexString()}`;

                                    // Light colour is inverted
                                    panel.invert(brightness(value) > 0.6);
                                }
                            }
                        ].forEach(data => {
                            nestedPanel.add(new PanelItem(data));
                        });

                        item.setContent(nestedPanel);
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
                    const nestedPanel = new Panel();
                    nestedPanel.animateIn(true);

                    [
                        {
                            type: 'color',
                            name: 'Nested Color 4',
                            value: backgroundColor,
                            callback: value => {
                                document.body.style.backgroundColor = `#${value.getHexString()}`;

                                // Light colour is inverted
                                panel.invert(brightness(value) > 0.6);
                            }
                        }
                    ].forEach(data => {
                        nestedPanel.add(new PanelItem(data));
                    });

                    item.setContent(nestedPanel);
                }
            },
            {
                type: 'divider'
            },
            {
                type: 'thumbnail',
                name: 'Thumbnail',
                value: image,
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
                callback: value => {
                    console.log('Link callback:', value);

                    panel.setPanelValue('Color', backgroundColor);
                    panel.setPanelValue('List Toggle', false);
                    panel.setPanelValue('List Select', 1);
                    panel.setPanelValue('List Content', 1);
                    panel.setPanelValue('Nested Color 1', backgroundColor);
                    panel.setPanelValue('Nested', 0.5);
                    panel.setPanelValue('Slider', 0);
                    panel.setPanelValue('Nested Color 2', backgroundColor);
                    panel.setPanelValue('Toggle', false);
                    panel.setPanelValue('Nested Color 3', backgroundColor);
                    panel.setPanelValue('Nested Color 4', backgroundColor);
                    panel.setPanelValue('Thumbnail', image);
                    // panel.setPanelValue('Thumbnail', null);
                }
            }
        ];

        items.forEach(data => {
            panel.add(new PanelItem(data));
        });

        // Call after adding
        panel.animateIn();

        let raf;

        function animate() {
            raf = requestAnimationFrame(animate);

            panel.update();
        }

        raf = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(raf);
            panel.destroy();
            document.body.style.backgroundColor = originalBodyBg;
        };
    }, []);

    return <Example title={title} center ref={ref} />;
}
