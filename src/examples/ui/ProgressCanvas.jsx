import { useRef, useState } from 'react';

import { Example } from '@/components';
import { ProgressCanvas } from '@/space/components/indicators/ProgressCanvas.jsx';

import './ProgressCanvas.css';

/**
 * Canvas arc progress indicator that animates from 0→1 on mount and fades out
 * when clicked.
 */
export default function ProgressCanvasExample({ title }) {
    const [visible, setVisible] = useState(true);
    const progressRef = useRef(null);

    const handleClick = () => {
        progressRef.current?.animateOut(() => setVisible(false));
    };

    return (
        <Example title={title}>
            {visible && (
                <div className="progress-canvas-example" onClick={handleClick}>
                    <ProgressCanvas size={90} progress={1} ref={progressRef} />
                </div>
            )}
        </Example>
    );
}
