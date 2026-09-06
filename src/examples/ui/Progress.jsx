import { useRef, useState } from 'react';

import { Example } from '@/components';
import { Progress } from '@/space/components/indicators/Progress.jsx';

import './Progress.css';

/**
 * SVG arc progress indicator that animates from 0→1 on mount and fades out
 * when clicked.
 */
export default function ProgressExample({ title }) {
    const [visible, setVisible] = useState(true);
    const progressRef = useRef(null);

    const handleClick = () => {
        progressRef.current?.animateOut(() => setVisible(false));
    };

    return (
        <Example title={title}>
            {visible && (
                <div className="progress-example" onClick={handleClick}>
                    <Progress size={90} progress={1} ref={progressRef} />
                </div>
            )}
        </Example>
    );
}
