import { useEffect, useRef, useState } from 'react';

import { Example } from '@/components';
import { useClassName } from '@/hooks';
import { Meter } from '@/space/components/graphs/index.js';
import { useTicker } from '@/space/motion/index.js';

import './Meter.css';

const METER_WIDTH = 200;
const METER_RANGE = 150;
const METER_SUFFIX = 'ms';

export default function MeterExample({ title }) {
    const meterRef = useRef(null);
    const meter2Ref = useRef(null);
    const meter3Ref = useRef(null);
    const meter4Ref = useRef(null);
    const meter5Ref = useRef(null);
    const meter6Ref = useRef(null);
    const counterRef = useRef(-180);
    const [meterValue] = useState(Math.random);
    const [meter2Value] = useState(Math.random);
    const [meter3Value] = useState(() => METER_RANGE * Math.random());
    const [meter4Value] = useState(() => METER_RANGE * Math.random());
    const [meter4Ghost] = useState(() => METER_RANGE * Math.random());
    const [meter5Value] = useState(() => METER_RANGE * Math.random());
    const [meter5Ghost] = useState(() => METER_RANGE * Math.random());

    useClassName('scroll');

    useEffect(() => {
        meterRef.current?.animateIn();
        meter2Ref.current?.animateIn();
        meter3Ref.current?.animateIn();
        meter4Ref.current?.animateIn();
        meter5Ref.current?.animateIn();
        meter6Ref.current?.animateIn();
    }, []);

    useTicker(() => {
        const x = 0.5 + 0.5 * Math.sin(counterRef.current++ / 100);
        meter6Ref.current?.update(x);
    });

    return (
        <Example title={title} className='meter-example'>
            <Meter
                ref={meterRef}
                width={METER_WIDTH}
                value={meterValue}
                precision={2}
            />
            <Meter
                ref={meter2Ref}
                width={METER_WIDTH}
                value={meter2Value}
                noText
                noGradient
            />
            <Meter
                ref={meter3Ref}
                width={METER_WIDTH}
                range={METER_RANGE}
                value={meter3Value}
                suffix={METER_SUFFIX}
            />
            <Meter
                ref={meter4Ref}
                width={METER_WIDTH}
                range={METER_RANGE}
                value={meter4Value}
                ghost={meter4Ghost}
                suffix={METER_SUFFIX}
                noRange
            />
            <Meter
                ref={meter5Ref}
                width={METER_WIDTH}
                range={METER_RANGE}
                value={meter5Value}
                ghost={meter5Ghost}
                suffix={METER_SUFFIX}
            />
            <Meter
                ref={meter6Ref}
                width={METER_WIDTH}
                precision={2}
            />
        </Example>
    );
}
