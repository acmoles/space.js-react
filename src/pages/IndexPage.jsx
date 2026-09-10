import { Link } from 'react-router-dom';

import { examples, groups } from '../examples/registry.js';
import { useClassName, useDocumentTitle } from '../hooks/index.js';

import './IndexPage.css';

export default function IndexPage() {
    useDocumentTitle('Examples — Space.js');
    useClassName('scroll');

    return (
        <div className="index">
            <header className="index-header">
                <h1>Space.js</h1>
                <p className="caption">Minimal monospace UI library</p>
            </header>
            {Object.entries(groups).map(([group, name]) => (
                <section key={group} className="index-group">
                    <h2>{name}</h2>
                    <ul>
                        {examples
                            .filter(example => example.group === group)
                            .map(({ path, title }) => (
                                <li key={path}>
                                    <Link to={path}>
                                        <span className="name">{title}</span>
                                        <span className="path">{path}</span>
                                    </Link>
                                </li>
                            ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}
