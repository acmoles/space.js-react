import { useEffect } from 'react';

import { Cluster } from '@lib/index.js';

import { Example } from '@/components';

/**
 * Exercises the Cluster data structure and logs the results to the console,
 * matching the original test_cluster.html.
 */
export default function TestClusterExample({ title }) {
    useEffect(() => {
        //

        const cluster = new Cluster();

        for (let i = 0; i < 4; i++) {
            cluster.push(i);
        }

        console.log(cluster.length); // 4

        let object = cluster.get();
        console.log(object, cluster.length); // 0 4

        object = cluster.get();
        console.log(object, cluster.length); // 1 4

        object = cluster.get();
        console.log(object, cluster.length); // 2 4

        object = cluster.get();
        console.log(object, cluster.length); // 3 4

        object = cluster.get();
        console.log(object, cluster.length); // 0 4

        //

        const cluster2 = new Cluster();
        cluster2.push(0, 1, 2, 3);
        console.log(cluster2.length); // 4

        const object2 = cluster2.get();
        console.log(object2, cluster2.length); // 0 4
    }, []);

    return <Example title={title} />;
}
