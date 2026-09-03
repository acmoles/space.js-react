import { useEffect, useRef } from 'react';

import { Interface, clearTween, delayedCall, headsTails, randInt } from '@lib/index.js';

import { Example } from '@/components';

class AlienKitty extends Interface {
    constructor() {
        super('.alienkitty');

        this.init();
    }

    init() {
        this.css({
            position: 'relative',
            width: 90,
            height: 86,
            background: 'center / contain no-repeat url(/assets/images/alienkitty.svg)',
            opacity: 0
        });

        this.eyelid1 = new Interface('.eyelid1');
        this.eyelid1.css({
            position: 'absolute',
            left: 35,
            top: 25,
            width: 24,
            height: 14,
            background: 'center / contain no-repeat url(/assets/images/alienkitty_eyelid.svg)',
            transformOrigin: 'top center',
            scaleX: 1.5,
            scaleY: 0.01
        });
        this.add(this.eyelid1);

        this.eyelid2 = new Interface('.eyelid2');
        this.eyelid2.css({
            position: 'absolute',
            left: 53,
            top: 26,
            width: 24,
            height: 14,
            background: 'center / contain no-repeat url(/assets/images/alienkitty_eyelid.svg)',
            transformOrigin: 'top left',
            scaleX: 1,
            scaleY: 0.01
        });
        this.add(this.eyelid2);
    }

    blink() {
        this.timeout = delayedCall(randInt(0, 10000), headsTails(this.onBlink1, this.onBlink2));
    }

    // Event handlers

    onBlink1 = () => {
        this.eyelid1.tween({ scaleY: 1.5 }, 120, 'easeOutCubic', () => {
            this.eyelid1.tween({ scaleY: 0.01 }, 180, 'easeOutCubic');
        });
        this.eyelid2.tween({ scaleX: 1.3, scaleY: 1.3 }, 120, 'easeOutCubic', () => {
            this.eyelid2.tween({ scaleX: 1, scaleY: 0.01 }, 180, 'easeOutCubic', () => {
                this.blink();
            });
        });
    };

    onBlink2 = () => {
        this.eyelid1.tween({ scaleY: 1.5 }, 120, 'easeOutCubic', () => {
            this.eyelid1.tween({ scaleY: 0.01 }, 180, 'easeOutCubic');
        });
        this.eyelid2.tween({ scaleX: 1.3, scaleY: 1.3 }, 180, 'easeOutCubic', () => {
            this.eyelid2.tween({ scaleX: 1, scaleY: 0.01 }, 240, 'easeOutCubic', () => {
                this.blink();
            });
        });
    };

    // Public methods

    animateIn = () => {
        this.blink();

        this.tween({ opacity: 1 }, 1000, 'easeOutSine');
    };

    animateOut = callback => {
        this.tween({ opacity: 0 }, 500, 'easeInOutQuad', callback);
    };

    destroy = () => {
        clearTween(this.timeout);

        return super.destroy();
    };
}

export default function AlienkittyExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        const container = ref.current;

        const view = new AlienKitty();
        view.css({
            position: 'absolute',
            left: '50%',
            top: '50%',
            marginLeft: -90 / 2,
            marginTop: -86 / 2 - 65,
            cursor: 'pointer'
        });
        container.appendChild(view.element);

        const onClick = () => {
            view.element.removeEventListener('click', onClick);

            view.animateOut(() => {
                view.destroy();
            });
        };

        view.element.addEventListener('click', onClick);

        view.animateIn();

        return () => {
            view.element.removeEventListener('click', onClick);
            view.destroy();
        };
    }, []);

    return <Example title={title} ref={ref} center />;
}
