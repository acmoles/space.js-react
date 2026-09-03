import { useEffect, useRef } from 'react';

import { Interface, clearTween, ticker, tween } from '@lib/index.js';

import { Example } from '@/components';

class Close extends Interface {
    constructor() {
        super(null, 'svg');

        const size = 90;

        this.width = size;
        this.height = size;
        this.x = size / 2;
        this.y = size / 2;
        this.radius = size * 0.4;
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
        this.circle.offset = -0.25;
        this.circle.progress = 0;
        this.add(this.circle);

        this.icon = new Interface(null, 'svg', 'g');
        this.icon.attr({
            transform: `translate(${(this.width - 22) / 2}, ${(this.height - 22) / 2})`
        });
        this.icon.css({
            fill: 'none',
            stroke: 'var(--ui-color)',
            strokeWidth: 1.5
        });
        this.add(this.icon);

        this.line1 = new Interface(null, 'svg', 'line');
        this.line1.attr({
            x1: 0,
            y1: 0,
            x2: 22,
            y2: 22
        });
        this.line1.start = 0;
        this.line1.offset = 0;
        this.line1.progress = 0;
        this.icon.add(this.line1);

        this.line2 = new Interface(null, 'svg', 'line');
        this.line2.attr({
            x1: 22,
            y1: 0,
            x2: 0,
            y2: 22
        });
        this.line2.start = 0;
        this.line2.offset = 0;
        this.line2.progress = 0;
        this.icon.add(this.line2);
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
        this.line1.drawLine();
        this.line2.drawLine();
    };

    animateIn = () => {
        if (this.needsUpdate) {
            return;
        }

        this.animatedIn = true;
        this.needsUpdate = true;

        this.addListeners();

        tween(this.circle, { progress: 1 }, 1000, 'easeOutCubic', () => {
            tween(this.line1, { progress: 1 }, 400, 'easeOutCubic', () => {
                tween(this.line2, { progress: 1 }, 400, 'easeOutCubic', () => {
                    this.removeListeners();
                    this.needsUpdate = false;
                });
            });
        });
    };

    animateOut = () => {
        if (this.needsUpdate) {
            return;
        }

        this.animatedIn = false;
        this.needsUpdate = true;

        this.addListeners();

        tween(this.circle, { start: 1 }, 1000, 'easeInOutCubic', () => {
            this.circle.start = 0;
            this.removeListeners();
            this.needsUpdate = false;
        }, () => {
            this.circle.progress = 1 - this.circle.start;
            this.line1.progress = this.circle.progress;
            this.line2.progress = this.circle.progress;
        });
    };

    destroy = () => {
        this.removeListeners();

        clearTween(this.circle);
        clearTween(this.line1);
        clearTween(this.line2);

        return super.destroy();
    };
}

export default function CloseExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        const container = ref.current;

        const view = new Close();
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
            if (view.animatedIn) {
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
