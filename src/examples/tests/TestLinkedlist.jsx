import { useEffect, useRef } from 'react';

import { LinkedList } from '@lib/index.js';

import { Example } from '@/components';

export default function TestLinkedlistExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        const list = new LinkedList();

        for (let i = 0; i < 4; i++) {
            list.push(i);
        }

        console.log(list.length); // 4

        let object = list.start();
        console.log(object); // 0

        while (object !== undefined) {
            console.log(object); // 0, 1, 2, 3

            object = list.next();
        }

        object = list.find(object => object === 1);
        console.log(object); // 1

        return () => {
        };
    }, []);

    return <Example title={title} ref={ref} />;
}
