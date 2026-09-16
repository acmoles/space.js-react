import { Socket } from './server-status/socket.js';
import { ServerStatusScene } from './server-status/ServerStatusScene.jsx';

function createSocketSource() {
    const socket = new Socket('wss://hello-websockets-server-status.cyberspace.app');

    return {
        emitter: socket,
        cleanup: () => socket.destroy()
    };
}

/**
 * Declarative server-status example backed by the live socket source.
 */
export default function ServerStatusExample({ title }) {
    return <ServerStatusScene title={title} createSource={createSocketSource} />;
}
