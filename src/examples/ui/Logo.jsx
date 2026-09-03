import { useEffect, useRef } from 'react';

import { Interface } from '@lib/index.js';

import { Example } from '@/components';

class Logo extends Interface {
    constructor() {
        super('.logo');

        this.init();

        this.addListeners();
        this.onResize();
    }

    init() {
        this.css({
            position: 'absolute',
            left: 50,
            top: 50,
            width: 64,
            height: 64,
            cursor: 'pointer',
            webkitUserSelect: 'none',
            userSelect: 'none',
            opacity: 0
        });

        this.image = new Interface(null, 'img');
        this.image.attr({
            src: '/assets/images/alienkitty.svg'
        });
        this.image.css({
            width: '100%',
            height: 'auto'
        });
        this.add(this.image);
    }

    addListeners() {
        window.addEventListener('resize', this.onResize);
        this.element.addEventListener('mouseenter', this.onHover);
        this.element.addEventListener('mouseleave', this.onHover);
        this.element.addEventListener('click', this.onClick);
    }

    removeListeners() {
        window.removeEventListener('resize', this.onResize);
        this.element.removeEventListener('mouseenter', this.onHover);
        this.element.removeEventListener('mouseleave', this.onHover);
        this.element.removeEventListener('click', this.onClick);
    }

    // Event handlers

    onResize = () => {
        const width = document.documentElement.clientWidth;
        const height = document.documentElement.clientHeight;

        if (width < height) {
            this.css({
                left: 30,
                top: 30,
                width: 40,
                height: 40
            });
        } else {
            this.css({
                left: 50,
                top: 50,
                width: 64,
                height: 64
            });
        }
    };

    onHover = ({ type }) => {
        this.clearTween();

        if (type === 'mouseenter') {
            this.tween({ opacity: 0.6 }, 300, 'easeOutCubic');
        } else {
            this.tween({ opacity: 1 }, 300, 'easeOutCubic');
        }
    };

    onClick = () => {
        open('https://alien.js.org/');
    };

    // Public methods

    animateIn = () => {
        this.tween({ opacity: 1 }, 600, 'easeInOutSine');
    };

    destroy = () => {
        this.removeListeners();

        return super.destroy();
    };
}

export default function LogoExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        const container = ref.current;

        const view = new Logo();
        container.appendChild(view.element);

        view.animateIn();

        return () => {
            view.destroy();
        };
    }, []);

    return <Example title={title} ref={ref} />;
}
