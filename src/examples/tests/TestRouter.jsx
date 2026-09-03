import { useEffect, useRef } from 'react';

import { router } from '@lib/index.js';

import { Example } from '@/components';

export default function TestRouterExample({ title }) {
    const ref = useRef(null);

    useEffect(() => {
        const prevPath = location.pathname;
        const prevScrollRestoration = history.scrollRestoration;

        router.add('/test_router', onPage, { title: 'Home' });

        router.init({
            path: '/examples',
            scrollRestoration: 'auto'
        });

        function onPage({ title: pageTitle }) {
            document.title = `${pageTitle} — Alien Kitty`;
        }

        return () => {
            window.removeEventListener('popstate', router.onPopState);
            router.routes.clear();
            router.path = null;
            history.scrollRestoration = prevScrollRestoration;
            history.replaceState(null, '', prevPath);
        };
    }, []);

    return <Example title={title} ref={ref} />;
}
