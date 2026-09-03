import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';

import { Example } from '@/components';
import { useClassName } from '@/hooks';

import { Socket } from './server-status/socket.js';
import { SceneContent } from './server-status/SceneContent.jsx';

const isDebug = /[?&]debug/.test(location.search);

// Factory called once per mount; returned emitter is a Socket (EventEmitter).
function createSocketSource() {
    const socket = new Socket('wss://hello-websockets-server-status.cyberspace.app');
    return {
        emitter: socket,
        cleanup: () => socket.close()
    };
}

export default function ServerStatusExample({ title }) {
    const containerRef = useRef(null);

    useClassName('scroll');

    return (
        <Example title={title} ref={containerRef}>
            <Canvas
                gl={{ antialias: true }}
                dpr={window.devicePixelRatio}
                camera={{ fov: 35, near: 1, far: 2000, position: [0, 0, 10] }}
            >
                <SceneContent
                    containerRef={containerRef}
                    isDebug={isDebug}
                    createSource={createSocketSource}
                />
            </Canvas>
        </Example>
    );
}
