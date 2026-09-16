import { useEffect, useState } from 'react';

import { router } from '@lib/index.js';

import { Example } from '@/components';

/**
 * Exercises the Space.js router and updates the document title via React
 * state when the route's page callback fires.
 */
export default function TestRouterExample({ title }) {
    const [pageTitle, setPageTitle] = useState(title);

    useEffect(() => {
        const prevPath = location.pathname;
        const prevScrollRestoration = history.scrollRestoration;

        router.add('/test_router', ({ title: t }) => {
            setPageTitle(`${t} — Alien Kitty`);
        }, { title: 'Home' });

        router.init({
            path: '/examples',
            scrollRestoration: 'auto'
        });

        return () => {
            window.removeEventListener('popstate', router.onPopState);
            router.routes.clear();
            router.path = null;
            history.scrollRestoration = prevScrollRestoration;
            history.replaceState(null, '', prevPath);
        };
    }, []);

    return <Example title={pageTitle} />;
}
