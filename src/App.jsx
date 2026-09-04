import { Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

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
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}
