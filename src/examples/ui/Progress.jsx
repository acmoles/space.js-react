import { useEffect, useRef } from 'react';

import { Interface, clearTween, ticker, tween } from '@lib/index.js';

import { Example } from '@/components';

class Progress extends Interface {
    constructor() {
        super(null, 'svg');

        const size = 90;

        this.width = size;
        this.height = size;
        this.x = size / 2;
        this.y = size / 2;
        this.radius = size * 0.4;
        this.startOffset = -0.25;
        this.progress = 0;
        this.needsUpdate = false;

        this.initSVG();

        this.addListeners();
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

    onProgress = ({ progress }) => {
        clearTween(this);

        this.needsUpdate = true;

        tween(this, { progress }, 500, 'easeOutCubic', () => {
            this.needsUpdate = false;

            if (this.progress >= 1) {
                this.onComplete();
            }
        });
    };

    onComplete = () => {
        this.removeListeners();

        this.events.emit('complete');
    };

    // Public methods

    update = () => {
        this.circle.drawLine(this.progress);
    };

    animateOut = callback => {
        this.tween({ scale: 0.9, opacity: 0 }, 400, 'easeInCubic', callback);
    };

    destroy = () => {
        this.removeListeners();

        clearTween(this);

        return super.destroy();
    };
}

export default function ProgressExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        const container = ref.current;

        const view = new Progress();
        view.css({
            position: 'absolute',
            left: '50%',
            top: '50%',
            marginLeft: -view.width / 2,
            marginTop: -view.height / 2,
            cursor: 'pointer'
        });
        container.appendChild(view.element);

        view.onProgress({ progress: 1 });

        const onClick = () => {
            view.element.removeEventListener('click', onClick);

            view.animateOut(() => {
                view.destroy();
            });
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
