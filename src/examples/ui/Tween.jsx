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
        this.r = size * 0.4;
        this.radius = this.r;
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
            r: this.r
        });
        this.circle.css({
            fill: 'none',
            stroke: 'var(--ui-color)',
            strokeWidth: 1.5
        });
        this.circle.start = 0;
        this.circle.offset = -0.25;
        this.add(this.circle);
    }

    addListeners() {
        window.addEventListener('pointerdown', this.onPointerDown);
        window.addEventListener('pointerup', this.onPointerUp);
        ticker.add(this.onUpdate);
    }

    removeListeners() {
        window.removeEventListener('pointerdown', this.onPointerDown);
        window.removeEventListener('pointerup', this.onPointerUp);
        ticker.remove(this.onUpdate);
    }

    // Event handlers

    onPointerDown = () => {
        clearTween(this);

        this.needsUpdate = true;

        tween(this, { radius: this.r * 0.5 }, 500, 'easeOutCubic', () => {
            this.needsUpdate = false;
        });
    };

    onPointerUp = () => {
        clearTween(this);

        this.needsUpdate = true;

        tween(this, { radius: this.r, spring: 1.2, damping: 0.4 }, 1000, 'easeOutElastic', () => {
            this.needsUpdate = false;
        });
    };

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
        });
    };

    // Public methods

    update = () => {
        this.circle.attr({ r: this.radius });
        this.circle.drawLine(this.progress);
    };

    destroy = () => {
        this.removeListeners();

        clearTween(this);

        return super.destroy();
    };
}

export default function TweenExample({ title }) {
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
            cursor: 'pointer',
            webkitUserSelect: 'none',
            userSelect: 'none'
        });
        container.appendChild(view.element);

        view.onProgress({ progress: 1 });

        ticker.start();

        return () => {
            view.destroy();
        };
    }, []);

    return <Example title={title} ref={ref} center />;
}
