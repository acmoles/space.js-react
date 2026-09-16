import { useEffect } from 'react';

import { LinkedList } from '@lib/index.js';

import { Example } from '@/components';

/**
 * Exercises the LinkedList data structure and logs the results to the console,
 * matching the original test_linkedlist.html.
 */
export default function TestLinkedlistExample({ title }) {
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

        object = list.find(item => item === 1);
        console.log(object); // 1
    }, []);

    return <Example title={title} />;
}
