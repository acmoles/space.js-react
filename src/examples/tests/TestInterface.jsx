import { useEffect, useRef } from 'react';

import { Interface } from '@lib/index.js';

import { Example } from '@/components';

export default function TestInterfaceExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        const container = ref.current;

        const logo = new Interface('.logo');
        logo.css({
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 90,
            height: 86,
            marginLeft: -90 / 2,
            marginTop: -86 / 2 - 65,
            webkitUserSelect: 'none',
            userSelect: 'none',
            scale: 0.96,
            opacity: 0
        });
        container.appendChild(logo.element);

        const image = new Interface(null, 'img');
        image.attr({
            src: '/assets/images/alienkitty.svg'
        });
        image.css({
            width: '100%',
            height: 'auto'
        });
        logo.add(image);

        logo.tween({ scale: 1, opacity: 1 }, 2000, 'easeOutCubic');

        return () => {
            logo.destroy();
        };
    }, []);

    return <Example title={title} ref={ref} />;
}
