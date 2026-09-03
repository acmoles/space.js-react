import { useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react';

import { UI } from '@lib/index.js';

import { DetailsButton, MuteButton } from '../../space/components/details/index.js';
import {
    LineCanvas,
    Point,
    Reticle,
    ReticleCanvas,
    TargetNumber,
    Tracker
} from '../../space/components/indicators/index.js';
import { Link, NavLink } from '../../space/components/nav/index.js';
import { useAnimation, useTicker } from '../../space/motion/index.js';
import { useResize } from '../../space/hooks/index.js';

import { Example } from '@/components';
import { useClassName } from '@/hooks';

import './UiComponents.css';

// ─── Display names ────────────────────────────────────────────────────────────
// `getConstructor(ref.current).name` returns "Object" for React imperative
// handles, so we supply the exact strings the original rendered.
const DISPLAY_NAMES = [
    'Reticle',       // 0
    'Reticle',       // 1
    'ReticleCanvas', // 2
    'Tracker',       // 3
    'Tracker',       // 4
    'Tracker',       // 5
    'TargetNumber',  // 6
    'LineCanvas',    // 7
    'Point',         // 8
    'Point',         // 9
    'DetailsButton', // 10
    'DetailsButton', // 11
    'DetailsButton', // 12
    'DetailsButton', // 13
    'DetailsButton', // 14
    'DetailsButton', // 15
    'MuteButton',    // 16
    'MuteButton',    // 17
    'NavLink',       // 18
    'Link'           // 19
];

const ITEM_SIZE = 90;
const ITEM_HALF = Math.round(ITEM_SIZE / 2);

// ─── ComponentItem ────────────────────────────────────────────────────────────
/**
 * A bordered cell that labels, hosts and click-toggles a single indicator.
 *
 * @param {object}   props
 * @param {number}   props.index        0-based index — rendered as a label.
 * @param {string}   props.displayName  Class-name label next to the index.
 * @param {object}   props.viewRef      Ref to the hosted component's imperative handle.
 * @param {function} [props.onHover]    Forwarded to mouseenter/mouseleave.
 * @param {object}   [props.ref]        Exposes `animateIn(delay)` and `element` getter.
 */
function ComponentItem({ index, displayName, viewRef, onHover, ref, children }) {
    const animatedInRef = useRef(false);
    const [boxRef, box] = useAnimation({ opacity: 0 });

    useImperativeHandle(ref, () => ({
        animateIn: delay => {
            box.animate({ opacity: 1 }, 400, 'easeOutCubic', delay ?? 0);
            viewRef.current?.animateIn();
            animatedInRef.current = true;
        },
        get element() {
            return boxRef.current;
        }
    }), [box, boxRef, viewRef]);

    const handleClick = e => {
        e.stopPropagation();
        if (animatedInRef.current) {
            viewRef.current?.animateOut();
            animatedInRef.current = false;
        } else {
            viewRef.current?.animateIn();
            animatedInRef.current = true;
        }
    };

    return (
        <div
            ref={boxRef}
            className="component-item"
            onMouseEnter={onHover}
            onMouseLeave={onHover}
            onClick={handleClick}
        >
            <span className="number">
                {index + 1}
                <span className="type">{displayName}</span>
            </span>
            {children}
        </div>
    );
}

// ─── Main example ─────────────────────────────────────────────────────────────
export default function UiComponentsExample({ title }) {
    useClassName('scroll');

    // ── View refs (hold each component's useImperativeHandle object) ──────────
    const vReticle1 = useRef(null);
    const vReticle2 = useRef(null);
    const vReticle3 = useRef(null); // ReticleCanvas
    const vTracker1 = useRef(null);
    const vTracker2 = useRef(null);
    const vTracker3 = useRef(null);
    const vTargetNum = useRef(null);
    const vLine     = useRef(null); // LineCanvas
    const vPoint1   = useRef(null);
    const vPoint2   = useRef(null);
    const vDb1      = useRef(null);
    const vDb2      = useRef(null);
    const vDb3      = useRef(null);
    const vDb4      = useRef(null);
    const vDb5      = useRef(null);
    const vDb6      = useRef(null);
    const vMb1      = useRef(null);
    const vMb2      = useRef(null);
    const vNavLink  = useRef(null);
    const vLink     = useRef(null);

    // ── Item refs (hold ComponentItem animateIn handles) ──────────────────────
    const iRef0  = useRef(null);
    const iRef1  = useRef(null);
    const iRef2  = useRef(null);
    const iRef3  = useRef(null);
    const iRef4  = useRef(null);
    const iRef5  = useRef(null);
    const iRef6  = useRef(null);
    const iRef7  = useRef(null);
    const iRef8  = useRef(null);
    const iRef9  = useRef(null);
    const iRef10 = useRef(null);
    const iRef11 = useRef(null);
    const iRef12 = useRef(null);
    const iRef13 = useRef(null);
    const iRef14 = useRef(null);
    const iRef15 = useRef(null);
    const iRef16 = useRef(null);
    const iRef17 = useRef(null);
    const iRef18 = useRef(null);
    const iRef19 = useRef(null);

    // ── Canvas ────────────────────────────────────────────────────────────────
    const containerRef = useRef(null);
    const canvasRef    = useRef(null);
    const ctxRef       = useRef(null);

    // ── UI component (kept imperative) ────────────────────────────────────────
    const exampleRef = useRef(null);
    const uiRef      = useRef(null);

    // ── DetailsButton counter state (body-click driven) ───────────────────────
    // Tracked in a ref so body-click handler doesn't need state re-renders
    const db3nRef  = useRef(1);
    const db4nRef  = useRef(1);
    const db56nRef = useRef(1);

    // ── Mount: UI ─────────────────────────────────────────────────────────────
    useEffect(() => {
        // TODO(rev2): swap for the declarative <UI> composite once it lands
        const ui = new UI({
            instructions: {
                content: `${navigator.maxTouchPoints ? 'Tap' : 'Click'} each component to toggle`
            }
        });
        uiRef.current = ui;
        ui.instructions.animateIn();

        if (exampleRef.current) {
            exampleRef.current.appendChild(ui.element);
        }

        return () => ui.destroy?.();
    }, []);

    // ── Load: animate all items in ────────────────────────────────────────────
    useEffect(() => {
        const allItems = [
            iRef0, iRef1, iRef2, iRef3, iRef4,
            iRef5, iRef6, iRef7, iRef8, iRef9,
            iRef10, iRef11, iRef12, iRef13, iRef14,
            iRef15, iRef16, iRef17, iRef18, iRef19
        ];

        const animateIn = () => {
            uiRef.current?.animateIn();
            allItems.forEach((ref, i) => ref.current?.animateIn(i * 50));
        };

        if (document.readyState === 'complete') {
            animateIn();
        } else {
            window.addEventListener('load', animateIn);
            return () => window.removeEventListener('load', animateIn);
        }
    }, []);

    // ── Initial positions for absolute-positioned indicators ─────────────────
    useLayoutEffect(() => {
        for (const vr of [vReticle1, vReticle2]) {
            if (vr.current?.position) {
                vr.current.position.x = ITEM_HALF;
                vr.current.position.y = ITEM_HALF;
                vr.current.update();
            }
        }

        for (const vt of [vTracker1, vTracker2, vTracker3]) {
            if (vt.current?.position) {
                vt.current.position.x = ITEM_HALF;
                vt.current.position.y = ITEM_HALF;
                vt.current.update();
            }
        }
    }, []);

    // ── Lock / open initial states ────────────────────────────────────────────
    useLayoutEffect(() => {
        // Tracker2 + Tracker3 are locked (number/info always visible)
        vTracker2.current?.lock();
        vTracker3.current?.lock();
        // DetailsButton 2, 4, 6 start open (smaller circle)
        vDb2.current?.open();
        vDb4.current?.open();
        vDb6.current?.open();
        // Point2 is locked (info permanently shown)
        vPoint2.current?.lock();
    });

    // ── Body-click counter ────────────────────────────────────────────────────
    useEffect(() => {
        const onClick = () => {
            vDb3.current?.setData?.({ number: db3nRef.current + 1 });
            vDb4.current?.setData?.({ number: db4nRef.current + 1 });
            vDb5.current?.setData?.({ number: db56nRef.current + 1 });
            vDb6.current?.setData?.({ number: db56nRef.current + 1 });

            db3nRef.current += 1;
            db4nRef.current += 1;
            db56nRef.current += 1;
        };

        document.body.addEventListener('click', onClick);
        return () => document.body.removeEventListener('click', onClick);
    }, []);

    // ── Canvas resize + component positioning ─────────────────────────────────
    useResize(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const bounds = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio;

        if (!ctxRef.current) {
            ctxRef.current = canvas.getContext('2d');
        }
        const ctx = ctxRef.current;

        canvas.width = Math.round(bounds.width * dpr);
        canvas.height = Math.round(bounds.height * dpr);
        canvas.style.width = `${bounds.width}px`;
        canvas.style.height = `${bounds.height}px`;
        ctx.scale(dpr, dpr);

        // Propagate the shared context to headless helpers
        vReticle3.current?.setContext(ctx);
        vLine.current?.setContext(ctx);

        // Position ReticleCanvas at the centre of items[2]
        const item2El = iRef2.current?.element;
        if (item2El && vReticle3.current?.position) {
            const b = item2El.getBoundingClientRect();
            vReticle3.current.position.x = b.left - bounds.left + ITEM_HALF;
            vReticle3.current.position.y = b.top - bounds.top + ITEM_HALF;
        }

        // Set LineCanvas endpoints diagonally across items[7]
        const item7El = iRef7.current?.element;
        if (item7El && vLine.current) {
            const b = item7El.getBoundingClientRect();
            const lx = b.left - bounds.left;
            const ly = b.top - bounds.top;
            vLine.current.setStartPoint({ x: lx + 1, y: ly + ITEM_SIZE + 1 });
            vLine.current.setEndPoint({ x: lx + ITEM_SIZE + 1, y: ly + 1 });
        }

        // Immediate draw after resize
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        vReticle3.current?.update();
        vLine.current?.update();
    });

    // ── Per-frame canvas draw ─────────────────────────────────────────────────
    useTicker(() => {
        const ctx = ctxRef.current;
        const canvas = canvasRef.current;
        if (!ctx || !canvas) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        vReticle3.current?.update();
        vLine.current?.update();
    });

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Example title={title} ref={exampleRef} className="ui-components-example">
            <div className="components">
                <div className="container" ref={containerRef}>
                    <canvas
                        ref={canvasRef}
                        style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
                    />

                    {/* 0 — Reticle */}
                    <ComponentItem index={0} displayName={DISPLAY_NAMES[0]} viewRef={vReticle1} ref={iRef0}>
                        <Reticle ref={vReticle1} />
                    </ComponentItem>

                    {/* 1 — Reticle with info */}
                    <ComponentItem index={1} displayName={DISPLAY_NAMES[1]} viewRef={vReticle2} ref={iRef1}>
                        <Reticle data={{ primary: '127.0.0.1', secondary: 'localhost' }} ref={vReticle2} />
                    </ComponentItem>

                    {/* 2 — ReticleCanvas (headless) */}
                    <ComponentItem index={2} displayName={DISPLAY_NAMES[2]} viewRef={vReticle3} ref={iRef2}>
                        <ReticleCanvas ref={vReticle3} />
                    </ComponentItem>

                    {/* 3 — Tracker */}
                    <ComponentItem index={3} displayName={DISPLAY_NAMES[3]} viewRef={vTracker1} ref={iRef3}>
                        <Tracker
                            ref={vTracker1}
                            style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
                        />
                    </ComponentItem>

                    {/* 4 — Tracker with target number (locked) */}
                    <ComponentItem index={4} displayName={DISPLAY_NAMES[4]} viewRef={vTracker2} ref={iRef4}>
                        <Tracker
                            data={{ targetNumber: 1 }}
                            ref={vTracker2}
                            style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
                        />
                    </ComponentItem>

                    {/* 5 — Tracker noCorners + number + info (locked) */}
                    <ComponentItem index={5} displayName={DISPLAY_NAMES[5]} viewRef={vTracker3} ref={iRef5}>
                        <Tracker
                            noCorners
                            data={{ targetNumber: 1, primary: '127.0.0.1', secondary: 'localhost' }}
                            ref={vTracker3}
                            style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
                        />
                    </ComponentItem>

                    {/* 6 — TargetNumber */}
                    <ComponentItem index={6} displayName={DISPLAY_NAMES[6]} viewRef={vTargetNum} ref={iRef6}>
                        <TargetNumber targetNumber={1} ref={vTargetNum} />
                    </ComponentItem>

                    {/* 7 — LineCanvas (headless) */}
                    <ComponentItem index={7} displayName={DISPLAY_NAMES[7]} viewRef={vLine} ref={iRef7}>
                        <LineCanvas ref={vLine} />
                    </ComponentItem>

                    {/* 8 — Point */}
                    <ComponentItem index={8} displayName={DISPLAY_NAMES[8]} viewRef={vPoint1} ref={iRef8}>
                        <Point data={{ name: '127.0.0.1', type: 'localhost' }} ref={vPoint1} />
                    </ComponentItem>

                    {/* 9 — Point with target numbers (locked) */}
                    <ComponentItem index={9} displayName={DISPLAY_NAMES[9]} viewRef={vPoint2} ref={iRef9}>
                        <Point
                            data={{ name: '127.0.0.1', type: 'localhost' }}
                            targetNumbers={[1, 2, 3]}
                            ref={vPoint2}
                        />
                    </ComponentItem>

                    {/* 10 — DetailsButton (closed) */}
                    <ComponentItem
                        index={10}
                        displayName={DISPLAY_NAMES[10]}
                        viewRef={vDb1}
                        onHover={e => vDb1.current?.onHover?.(e)}
                        ref={iRef10}
                    >
                        <div style={{ marginLeft: 20 }}>
                            <DetailsButton ref={vDb1} />
                        </div>
                    </ComponentItem>

                    {/* 11 — DetailsButton (open) */}
                    <ComponentItem
                        index={11}
                        displayName={DISPLAY_NAMES[11]}
                        viewRef={vDb2}
                        onHover={e => vDb2.current?.onHover?.(e)}
                        ref={iRef11}
                    >
                        <div style={{ marginLeft: 20 }}>
                            <DetailsButton ref={vDb2} />
                        </div>
                    </ComponentItem>

                    {/* 12 — DetailsButton with number (closed) */}
                    <ComponentItem
                        index={12}
                        displayName={DISPLAY_NAMES[12]}
                        viewRef={vDb3}
                        onHover={e => vDb3.current?.onHover?.(e)}
                        ref={iRef12}
                    >
                        <div style={{ marginLeft: 20 }}>
                            <DetailsButton data={{ number: 1 }} ref={vDb3} />
                        </div>
                    </ComponentItem>

                    {/* 13 — DetailsButton with number (open) */}
                    <ComponentItem
                        index={13}
                        displayName={DISPLAY_NAMES[13]}
                        viewRef={vDb4}
                        onHover={e => vDb4.current?.onHover?.(e)}
                        ref={iRef13}
                    >
                        <div style={{ marginLeft: 20 }}>
                            <DetailsButton data={{ number: 1 }} ref={vDb4} />
                        </div>
                    </ComponentItem>

                    {/* 14 — DetailsButton with number and total (closed) */}
                    <ComponentItem
                        index={14}
                        displayName={DISPLAY_NAMES[14]}
                        viewRef={vDb5}
                        onHover={e => vDb5.current?.onHover?.(e)}
                        ref={iRef14}
                    >
                        <div style={{ marginLeft: 20 }}>
                            <DetailsButton data={{ number: 1, total: 6 }} ref={vDb5} />
                        </div>
                    </ComponentItem>

                    {/* 15 — DetailsButton with number and total (open) */}
                    <ComponentItem
                        index={15}
                        displayName={DISPLAY_NAMES[15]}
                        viewRef={vDb6}
                        onHover={e => vDb6.current?.onHover?.(e)}
                        ref={iRef15}
                    >
                        <div style={{ marginLeft: 20 }}>
                            <DetailsButton data={{ number: 1, total: 6 }} ref={vDb6} />
                        </div>
                    </ComponentItem>

                    {/* 16 — MuteButton (sound on) */}
                    <ComponentItem
                        index={16}
                        displayName={DISPLAY_NAMES[16]}
                        viewRef={vMb1}
                        onHover={e => vMb1.current?.onHover?.(e)}
                        ref={iRef16}
                    >
                        <MuteButton sound ref={vMb1} />
                    </ComponentItem>

                    {/* 17 — MuteButton (sound off) */}
                    <ComponentItem
                        index={17}
                        displayName={DISPLAY_NAMES[17]}
                        viewRef={vMb2}
                        onHover={e => vMb2.current?.onHover?.(e)}
                        ref={iRef17}
                    >
                        <MuteButton sound={false} ref={vMb2} />
                    </ComponentItem>

                    {/* 18 — NavLink */}
                    <ComponentItem
                        index={18}
                        displayName={DISPLAY_NAMES[18]}
                        viewRef={vNavLink}
                        onHover={e => vNavLink.current?.onHover?.(e)}
                        ref={iRef18}
                    >
                        <NavLink title="Link" ref={vNavLink} />
                    </ComponentItem>

                    {/* 19 — Link */}
                    <ComponentItem index={19} displayName={DISPLAY_NAMES[19]} viewRef={vLink} ref={iRef19}>
                        <Link title="Link" ref={vLink} />
                    </ComponentItem>
                </div>
            </div>
        </Example>
    );
}
