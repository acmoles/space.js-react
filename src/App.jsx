import { Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { examples } from './examples/registry.js';
import IndexPage from './pages/IndexPage.jsx';

export default function App() {
    return (
        <BrowserRouter>
            <Suspense fallback={null}>
                <Routes>
                    <Route path="/" element={<IndexPage />} />
                    {examples.map(({ path, title, Component }) => (
                        <Route key={path} path={path} element={<Component title={title} />} />
                    ))}
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}
