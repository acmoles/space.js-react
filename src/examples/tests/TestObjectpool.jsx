import { useEffect } from 'react';

import { ObjectPool } from '@lib/index.js';

import { Example } from '@/components';

/**
 * Exercises the ObjectPool data structure and logs the results to the console,
 * matching the original test_objectpool.html.
 */
export default function TestObjectpoolExample({ title }) {
    useEffect(() => {
        //

        const pool = new ObjectPool();

        for (let i = 0; i < 4; i++) {
            pool.put(i);
        }

        console.log(pool.length); // 4

        let object = pool.get();
        console.log(object, pool.length); // 0 3

        object = pool.get();
        console.log(object, pool.length); // 1 2

        object = pool.get();
        console.log(object, pool.length); // 2 1

        object = pool.get();
        console.log(object, pool.length); // 3 0

        object = pool.get();
        console.log(object, pool.length); // null 0

        pool.put(object);
        console.log(pool.length); // 1

        //

        const pool2 = new ObjectPool();
        pool2.put(0, 1, 2, 3);
        console.log(pool2.length); // 4

        const object2 = pool2.get();
        console.log(object2, pool2.length); // 0 3

        pool2.put(object2);
        console.log(pool2.length); // 4
    }, []);

    return <Example title={title} />;
}
