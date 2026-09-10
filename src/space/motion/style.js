/**
 * Style engine.
 *
 * A direct port of the style handling in the Space.js `Interface` class, kept
 * as a pure function so React components can drive element styles from refs
 * without an imperative wrapper object. Transforms and filters are composed in
 * the same order, and unitless numbers get the same `px` treatment, so the
 * rendered `style` attribute is identical to the original library.
 */

// https://developer.mozilla.org/en-US/docs/Web/CSS/transform
// https://developer.mozilla.org/en-US/docs/Web/CSS/filter
const Transforms = ['x', 'y', 'z', 'skewX', 'skewY', 'rotation', 'rotationX', 'rotationY', 'rotationZ', 'scale', 'scaleX', 'scaleY', 'scaleZ'];
const Filters = ['blur', 'brightness', 'contrast', 'grayscale', 'hue', 'invert', 'saturate', 'sepia'];
const Numeric = ['opacity', 'zIndex', 'fontWeight', 'strokeWidth', 'strokeDashoffset', 'stopOpacity', 'flexGrow'];

// Properties whose neutral value is 1 rather than 0, used when a tween starts
// from a property that has never been set
const Lacuna1 = ['opacity', 'scale', 'brightness', 'contrast', 'saturate', 'stopOpacity'];

/**
 * Creates the mutable style state that `applyStyle` accumulates into. One
 * state object belongs to one element and holds the last value of every
 * property that has been set, which is what transform and filter composition
 * and tween interpolation both read from.
 */
export function createStyleState() {
    return {
        style: {},
        isTransform: false,
        isFilter: false
    };
}

/**
 * Returns the starting value for a tweened property, matching the lacuna
 * values used by the library.
 */
export function getStyleValue(state, key) {
    const value = state.style[key];

    if (typeof value === 'number') {
        return value;
    }

    return Lacuna1.includes(key) ? 1 : 0;
}

export function isTransformStyle(key) {
    return Transforms.includes(key);
}

/**
 * Applies style properties to an element, composing transforms and filters
 * from the accumulated state.
 */
export function applyStyle(element, props, state) {
    if (!element) {
        return;
    }

    const style = state.style;

    for (const key in props) {
        if (Transforms.includes(key)) {
            style[key] = props[key];
            state.isTransform = true;
            continue;
        }

        if (Filters.includes(key)) {
            style[key] = props[key];
            state.isFilter = true;
            continue;
        }

        if (Numeric.includes(key)) {
            style[key] = props[key];

            if (props[key] === '') {
                element.style.removeProperty(key);
            } else {
                element.style[key] = props[key];
            }
        } else {
            if (typeof props[key] === 'number') {
                style[key] = props[key];
            }

            element.style[key] = typeof props[key] !== 'string' ? `${props[key]}px` : props[key];
        }
    }

    if (state.isTransform) {
        let transform = '';

        if (style.x !== undefined || style.y !== undefined || style.z !== undefined) {
            const x = style.x !== undefined ? style.x : 0;
            const y = style.y !== undefined ? style.y : 0;
            const z = style.z !== undefined ? style.z : 0;

            transform += `translate3d(${x}px, ${y}px, ${z}px)`;
        }

        if (style.skewX !== undefined) {
            transform += `skewX(${style.skewX}deg)`;
        }

        if (style.skewY !== undefined) {
            transform += `skewY(${style.skewY}deg)`;
        }

        if (style.rotation !== undefined) {
            transform += `rotate(${style.rotation}deg)`;
        }

        if (style.rotationX !== undefined) {
            transform += `rotateX(${style.rotationX}deg)`;
        }

        if (style.rotationY !== undefined) {
            transform += `rotateY(${style.rotationY}deg)`;
        }

        if (style.rotationZ !== undefined) {
            transform += `rotateZ(${style.rotationZ}deg)`;
        }

        if (style.scale !== undefined) {
            transform += `scale(${style.scale})`;
        }

        if (style.scaleX !== undefined) {
            transform += `scaleX(${style.scaleX})`;
        }

        if (style.scaleY !== undefined) {
            transform += `scaleY(${style.scaleY})`;
        }

        if (style.scaleZ !== undefined) {
            transform += `scaleZ(${style.scaleZ})`;
        }

        element.style.transform = transform;
    }

    if (state.isFilter) {
        let filter = '';

        if (style.blur !== undefined) {
            filter += `blur(${style.blur}px)`;
        }

        if (style.brightness !== undefined) {
            filter += `brightness(${style.brightness})`;
        }

        if (style.contrast !== undefined) {
            filter += `contrast(${style.contrast})`;
        }

        if (style.grayscale !== undefined) {
            filter += `grayscale(${style.grayscale})`;
        }

        if (style.hue !== undefined) {
            filter += `hue-rotate(${style.hue}deg)`;
        }

        if (style.invert !== undefined) {
            filter += `invert(${style.invert})`;
        }

        if (style.saturate !== undefined) {
            filter += `saturate(${style.saturate})`;
        }

        if (style.sepia !== undefined) {
            filter += `sepia(${style.sepia})`;
        }

        element.style.filter = filter;
    }
}
