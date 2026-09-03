import { useEffect, useRef } from 'react';

import { Interface, clearTween, degToRad, ticker, tween } from '@lib/index.js';

import { Example } from '@/components';

class ProgressCanvas extends Interface {
    constructor() {
        super(null, 'canvas');

        const size = 90;

        this.width = size;
        this.height = size;
        this.x = size / 2;
        this.y = size / 2;
        this.radius = size * 0.4;
        this.startAngle = degToRad(-90);
        this.progress = 0;
        this.needsUpdate = false;

        this.initCanvas();

        this.addListeners();
        this.resize();
    }

    initCanvas() {
        this.context = this.element.getContext('2d');
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

    resize = () => {
        const dpr = 2; // Always 2

        this.element.width = Math.round(this.width * dpr);
        this.element.height = Math.round(this.height * dpr);
        this.element.style.width = `${this.width}px`;
        this.element.style.height = `${this.height}px`;
        this.context.scale(dpr, dpr);

        // Context properties need to be reassigned after resize
        this.context.lineWidth = 1.5;
        this.context.strokeStyle = getComputedStyle(document.querySelector(':root')).getPropertyValue('--ui-color').trim();

        this.update();
    };

    update = () => {
        this.context.clearRect(0, 0, this.element.width, this.element.height);
        this.context.beginPath();
        this.context.arc(this.x, this.y, this.radius, this.startAngle, this.startAngle + degToRad(360 * this.progress));
        this.context.stroke();
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

export default function ProgressCanvasExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        const container = ref.current;

        const view = new ProgressCanvas();
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
