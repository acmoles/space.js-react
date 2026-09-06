import { useEffect, useRef, useState } from 'react';

import { AssetLoader, clearTween, degToRad, headsTails, randInt, tween } from '@lib/index.js';

import { Example } from '@/components';
import { useAnimation, useDelayedCall, useTicker } from '@/space';

import './AlienkittyCanvas.css';

const assetLoader = new AssetLoader();
const loadImage = path => assetLoader.loadImage(path);

function createCanvasObject(image, width, height, {
    x = 0,
    y = 0,
    pX = 0,
    pY = 0,
    rotation = 0,
    scaleX = 1,
    scaleY = 1,
    scale = 1,
    opacity = 1
} = {}) {
    return {
        image,
        width,
        height,
        x,
        y,
        pX: width * pX,
        pY: height * pY,
        rotation,
        scaleX: scaleX * scale,
        scaleY: scaleY * scale,
        opacity
    };
}

function drawImage(context, object) {
    context.save();
    context.translate(object.x + object.pX, object.y + object.pY);
    context.rotate(degToRad(object.rotation));
    context.scale(object.scaleX, object.scaleY);
    context.globalAlpha = object.opacity;
    context.drawImage(object.image, -object.pX, -object.pY, object.width, object.height);
    context.restore();
}

/**
 * Canvas version of the mascot, blinking at random intervals, fading out when
 * clicked.
 */
function AlienKittyCanvas({ onComplete }) {
    const [canvasRef, canvasAnim] = useAnimation({ opacity: 0 });
    const delay = useDelayedCall();
    const needsUpdateRef = useRef(false);
    const sceneRef = useRef(null);

    useTicker(() => {
        const scene = sceneRef.current;

        if (!needsUpdateRef.current || !scene) {
            return;
        }

        const { canvas, context, alienkitty, eyelid1, eyelid2 } = scene;

        context.clearRect(0, 0, canvas.width, canvas.height);
        drawImage(context, alienkitty);
        drawImage(context, eyelid1);
        drawImage(context, eyelid2);
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        const dpr = window.devicePixelRatio;
        canvas.width = Math.round(90 * dpr);
        canvas.height = Math.round(86 * dpr);
        canvas.style.width = '90px';
        canvas.style.height = '86px';
        context.scale(dpr, dpr);

        let eyelid1;
        let eyelid2;

        Promise.all([
            loadImage('/assets/images/alienkitty.svg'),
            loadImage('/assets/images/alienkitty_eyelid.svg')
        ]).then(([alienkittyImg, eyelidImg]) => {
            eyelid1 = createCanvasObject(eyelidImg, 24, 14, { pX: 0.5, x: 35, y: 25, scaleX: 1.5, scaleY: 0.01 });
            eyelid2 = createCanvasObject(eyelidImg, 24, 14, { x: 53, y: 26, scaleX: 1, scaleY: 0.01 });

            sceneRef.current = {
                canvas,
                context,
                alienkitty: createCanvasObject(alienkittyImg, 90, 86),
                eyelid1,
                eyelid2
            };

            needsUpdateRef.current = true;

            const blink = () => {
                delay(randInt(0, 10000), headsTails(onBlink1, onBlink2));
            };

            const onBlink1 = () => {
                needsUpdateRef.current = true;
                tween(eyelid1, { scaleY: 1.5 }, 120, 'easeOutCubic', () => {
                    tween(eyelid1, { scaleY: 0.01 }, 180, 'easeOutCubic');
                });
                tween(eyelid2, { scaleX: 1.3, scaleY: 1.3 }, 120, 'easeOutCubic', () => {
                    tween(eyelid2, { scaleX: 1, scaleY: 0.01 }, 180, 'easeOutCubic', () => {
                        needsUpdateRef.current = false;
                        blink();
                    });
                });
            };

            const onBlink2 = () => {
                needsUpdateRef.current = true;
                tween(eyelid1, { scaleY: 1.5 }, 120, 'easeOutCubic', () => {
                    tween(eyelid1, { scaleY: 0.01 }, 180, 'easeOutCubic');
                });
                tween(eyelid2, { scaleX: 1.3, scaleY: 1.3 }, 180, 'easeOutCubic', () => {
                    tween(eyelid2, { scaleX: 1, scaleY: 0.01 }, 240, 'easeOutCubic', () => {
                        needsUpdateRef.current = false;
                        blink();
                    });
                });
            };

            blink();
            canvasAnim.animate({ opacity: 1 }, 1000, 'easeOutSine');
        });

        return () => {
            if (eyelid1) {
                clearTween(eyelid1);
            }

            if (eyelid2) {
                clearTween(eyelid2);
            }

            sceneRef.current = null;
        };
    }, [canvasRef, canvasAnim, delay]);

    const handleClick = () => {
        canvasAnim.stop().animate({ opacity: 0 }, 500, 'easeInOutQuad', onComplete);
    };

    return <canvas ref={canvasRef} className="alienkitty-canvas" onClick={handleClick} />;
}

export default function AlienkittyCanvasExample({ title }) {
    const [visible, setVisible] = useState(true);

    return (
        <Example title={title}>
            {visible && <AlienKittyCanvas onComplete={() => setVisible(false)} />}
        </Example>
    );
}
