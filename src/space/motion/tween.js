import { animate } from 'motion';

import { Easing } from '@lib/tween/Easing.js';

/**
 * Tween engine backed by Motion.
 *
 * This replaces the library's own `lib/tween/Tween.js`, which accumulated
 * `elapsed` from the shared ticker's `delta`. Motion owns the frame loop and
 * the clock; everything else — the easing table, the interpolation and the
 * unusual clamped-delay behaviour — is reproduced exactly so that durations and
 * curves are unchanged.
 *
 * The API is deliberately identical to the library's, so call sites only swap
 * their import.
 */

// Every live tween, so `clearTween(object)` can find them by target.
const Tweens = [];

/**
 * Resolves the library's easing lookup: a function is used as-is, a name is
 * looked up, and anything unrecognised falls back to `easeOutCubic`.
 */
function resolveEase(ease) {
    return typeof ease === 'function' ? ease : Easing[ease] || Easing.easeOutCubic;
}

export class Tween {
    constructor(object, props, duration, ease, delay = 0, complete, update) {
        if (typeof delay !== 'number') {
            update = complete;
            complete = delay;
            delay = 0;
        }

        this.object = object;
        this.duration = duration;
        this.ease = resolveEase(ease);
        this.delay = delay;
        this.complete = complete;
        this.update = update;
        this.isAnimating = false;
        this.rendered = false;

        this.from = {};
        this.to = Object.assign({}, props);

        this.spring = this.to.spring;
        this.damping = this.to.damping;

        delete this.to.spring;
        delete this.to.damping;

        for (const prop in this.to) {
            if (typeof this.to[prop] === 'number' && typeof object[prop] === 'number') {
                this.from[prop] = object[prop];
            }
        }

        this.start();
    }

    /**
     * Applies the tween at `elapsed` milliseconds. Mirrors the library's
     * `onUpdate`: the delay is subtracted from the elapsed time and the result
     * clamped, so the update callback still runs while the tween is waiting.
     */
    render(elapsed) {
        // A zero-length tween is immediately complete; the division would
        // otherwise be 0 / 0.
        const progress = this.duration > 0
            ? Math.max(0, Math.min(1, (elapsed - this.delay) / this.duration))
            : 1;

        if (progress === 1) {
            this.rendered = true;
        }

        const alpha = this.ease(progress, this.spring, this.damping);

        for (const prop in this.from) {
            this.object[prop] = this.from[prop] + (this.to[prop] - this.from[prop]) * alpha;
        }

        if (this.update) {
            this.update();
        }
    }

    // Public methods

    start() {
        if (this.isAnimating) {
            return;
        }

        this.isAnimating = true;

        // The whole delay + duration window is driven linearly and the easing
        // applied in `render`, so that the delay behaves as the library's does.
        const total = this.delay + this.duration;

        this.animation = animate(0, 1, {
            duration: total / 1000,
            ease: 'linear',
            onUpdate: t => this.render(t * total),
            onComplete: () => {
                // A zero-length window resolves without ever running an
                // update, so make sure the final frame is applied exactly once.
                if (!this.rendered) {
                    this.render(total);
                }

                clearTween(this);

                if (this.complete) {
                    this.complete();
                }
            }
        });
    }

    stop() {
        if (!this.isAnimating) {
            return;
        }

        this.isAnimating = false;

        if (this.animation) {
            this.animation.stop();
            this.animation = null;
        }
    }
}

/**
 * Defers a function by the given duration.
 * @param {number} duration Time to wait in milliseconds.
 * @param {function} complete Callback function.
 * @returns {Tween}
 * @example
 * delayedCall(500, animateIn);
 */
export function delayedCall(duration, complete) {
    const tween = new Tween(complete, null, duration, 'linear', 0, complete);

    Tweens.push(tween);

    return tween;
}

/**
 * Defers by the given duration.
 * @param {number} [duration=0] Time to wait in milliseconds.
 * @returns {Promise}
 * @example
 * await wait(250);
 */
export function wait(duration = 0) {
    return new Promise(resolve => delayedCall(duration, resolve));
}

/**
 * Defers to the next tick.
 * @param {function} [complete] Callback function.
 * @returns {Promise}
 * @example
 * await defer();
 */
export function defer(complete) {
    const promise = new Promise(resolve => delayedCall(0, resolve));

    if (complete) {
        promise.then(complete);
    }

    return promise;
}

/**
 * Tween that animates to the given destination properties.
 * @see {@link https://easings.net/ | Easing Functions Cheat Sheet}
 * @param {object} object Target object.
 * @param {object} props Tween properties.
 * @param {number} duration Time in milliseconds.
 * @param {string|function} ease Ease string or function.
 * @param {number} [delay=0] Time to wait in milliseconds.
 * @param {function} [complete] Callback function when the animation has completed.
 * @param {function} [update] Callback function every time the animation updates.
 * @returns {Promise}
 * @example
 * tween(data, { value: 0.3 }, 1000, 'linear');
 */
export function tween(object, props, duration, ease, delay = 0, complete, update) {
    if (typeof delay !== 'number') {
        update = complete;
        complete = delay;
        delay = 0;
    }

    const promise = new Promise(resolve => {
        const tween = new Tween(object, props, duration, ease, delay, resolve, update);

        Tweens.push(tween);
    });

    if (complete) {
        promise.then(complete);
    }

    return promise;
}

/**
 * Immediately clears all delayedCalls and tweens of a given object.
 * @param {object} object Target object.
 * @returns {void}
 * @example
 * tween(data, { value: 0.3 }, 1000, 'linear');
 * clearTween(data);
 */
export function clearTween(object) {
    if (object instanceof Tween) {
        object.stop();

        const index = Tweens.indexOf(object);

        if (~index) {
            Tweens.splice(index, 1);
        }
    } else {
        for (let i = Tweens.length - 1; i >= 0; i--) {
            if (Tweens[i].object === object) {
                clearTween(Tweens[i]);
            }
        }
    }
}
