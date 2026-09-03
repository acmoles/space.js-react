import { useEffect, useRef } from 'react';

import { Interface, clearTween, delayedCall, ticker, tween } from '@lib/index.js';

import { Example } from '@/components';

class ProgressIndeterminate extends Interface {
    constructor() {
        super(null, 'svg');

        const size = 90;

        this.width = size;
        this.height = size;
        this.x = size / 2;
        this.y = size / 2;
        this.radius = size * 0.4;
        this.startOffset = -0.25;
        this.animatedIn = false;
        this.needsUpdate = false;

        this.initSVG();
    }

    initSVG() {
        this.attr({
            width: this.width,
            height: this.height
        });

        this.circle = new Interface(null, 'svg', 'circle');
        this.circle.attr({
            cx: this.x,
            cy: this.y,
            r: this.radius
        });
        this.circle.css({
            fill: 'none',
            stroke: 'var(--ui-color)',
            strokeWidth: 1.5
        });
        this.circle.start = 0;
        this.circle.offset = this.startOffset;
        this.circle.progress = 0;
        this.add(this.circle);
    }

    addListeners() {
        ticker.add(this.onUpdate);
    }

    removeListeners() {
        ticker.remove(this.onUpdate);
    }

    // Event handlers

    onUpdate = () => {
        if (this.needsUpdate) {
            this.update();
        }
    };

    // Public methods

    update = () => {
        this.circle.drawLine();
    };

    animateIn = () => {
        this.animatedIn = true;
        this.needsUpdate = true;

        this.addListeners();

        const start = () => {
            tween(this.circle, { progress: 1 }, 1000, 'easeOutCubic', () => {
                tween(this.circle, { start: 1 }, 1000, 'easeInOutCubic', () => {
                    this.circle.start = 0;

                    delayedCall(500, () => {
                        if (this.animatedIn) {
                            start();
                        } else {
                            this.removeListeners();
                            this.needsUpdate = false;
                        }
                    });
                }, () => {
                    this.circle.progress = 1 - this.circle.start;
                });
            });
        };

        start();
    };

    animateOut = () => {
        this.animatedIn = false;
    };

    destroy = () => {
        this.removeListeners();

        clearTween(this.circle);

        return super.destroy();
    };
}

export default function ProgressIndeterminateExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        const container = ref.current;

        const view = new ProgressIndeterminate();
        view.css({
            position: 'absolute',
            left: '50%',
            top: '50%',
            marginLeft: -view.width / 2,
            marginTop: -view.height / 2,
            cursor: 'pointer'
        });
        container.appendChild(view.element);

        view.animateIn();

        const onClick = () => {
            if (view.needsUpdate) {
                view.animateOut();
            } else {
                view.animateIn();
            }
        };

        view.element.addEventListener('click', onClick);
        ticker.start();

        return () => {
            view.element.removeEventListener('click', onClick);
            view.destroy();
        };
    }, []);

    return <Example title={title} ref={ref} center />;
}
