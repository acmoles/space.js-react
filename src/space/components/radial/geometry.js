/**
 * Pure geometry helpers shared between the radial graph components.
 *
 * All maths are ported verbatim from the Space.js originals so results are
 * numerically identical to the imperative library.
 */

import { SVGPathProperties } from '@lib/path/SVGPathProperties.js';
import { TwoPI } from '@lib/utils/Utils.js';

// ---------------------------------------------------------------------------
// Catmull-Rom → cubic bezier spline
// ---------------------------------------------------------------------------

/**
 * Builds an SVG path string from an augmented points array using
 * Catmull-Rom → bezier conversion at the given tension.
 *
 * @param {Array<{x: number, y: number}>} points Augmented points (index 0 and
 *   last two are padding points added by `buildRadialPoints`).
 * @param {number} tension Catmull-Rom tension.
 * @returns {string} SVG path data.
 */
export function buildCatmullRomPathData(points, tension) {
    let path = `M ${points[1].x} ${points[1].y}`;

    for (let i = 1, l = points.length; i < l - 2; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2];

        const cp1x = p1.x + (p2.x - p0.x) / tension;
        const cp1y = p1.y + (p2.y - p0.y) / tension;
        const cp2x = p2.x - (p3.x - p1.x) / tension;
        const cp2y = p2.y - (p3.y - p1.y) / tension;

        path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
    }

    return path;
}

/**
 * Draws Catmull-Rom bezier curves from an augmented points array into a 2D
 * canvas context.  The context must already have `beginPath` and `moveTo`
 * called before this is called.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{x: number, y: number}>} points
 * @param {number} tension
 */
export function drawCatmullRom(ctx, points, tension) {
    ctx.moveTo(points[1].x, points[1].y);

    for (let i = 1, l = points.length; i < l - 2; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2];

        const cp1x = p1.x + (p2.x - p0.x) / tension;
        const cp1y = p1.y + (p2.y - p0.y) / tension;
        const cp2x = p2.x - (p3.x - p1.x) / tension;
        const cp2y = p2.y - (p3.y - p1.y) / tension;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
}

// ---------------------------------------------------------------------------
// Radial graph point builders
// ---------------------------------------------------------------------------

/**
 * Builds the augmented points array for a full-circle radial graph.
 *
 * The array is padded with a phantom point before index 1 and two phantom
 * points at the end so the Catmull-Rom spline forms a smooth closed loop.
 *
 * @param {number[]} array Data values in [0, range] space.
 * @param {number} middle Canvas centre (width / 2).
 * @param {number} h Effective graph height (graphHeight - 1).
 * @param {number} rangeHeight Pixels per data unit.
 * @param {number} yMultiplier Animation multiplier [0, 1].
 * @param {number} startAngle Start angle in radians.
 * @returns {Array<{x: number, y: number}>}
 */
export function buildRadialPoints(array, middle, h, rangeHeight, yMultiplier, startAngle) {
    const pts = [];
    const l = array.length;

    for (let i = 0; i < l; i++) {
        const radius = middle - (h - array[i] * rangeHeight * yMultiplier - 1);

        if (i === 0) {
            const rad0 = startAngle + TwoPI * ((i - 1) / (l - 1));
            pts[0] = { x: middle + radius * Math.cos(rad0), y: middle + radius * Math.sin(rad0) };
            pts[1] = { x: middle + radius * Math.cos(startAngle), y: middle + radius * Math.sin(startAngle) };
        } else if (i !== l - 1) {
            const rad = startAngle + TwoPI * (i / (l - 1));
            pts[i + 1] = { x: middle + radius * Math.cos(rad), y: middle + radius * Math.sin(rad) };
        } else {
            const rad0 = startAngle + TwoPI;
            const rad1 = startAngle + TwoPI * ((i + 1) / (l - 1));
            pts[i + 1] = { x: middle + radius * Math.cos(rad0), y: middle + radius * Math.sin(rad0) };
            pts[i + 2] = { x: middle + radius * Math.cos(rad1), y: middle + radius * Math.sin(rad1) };
        }
    }

    return pts;
}

/**
 * Builds the augmented points array for a single radial graph segment.
 *
 * @param {number[]} segArray Slice of the data array for this segment.
 * @param {number} middle Canvas centre.
 * @param {number} h Effective graph height.
 * @param {number} rangeHeight Pixels per data unit for this segment.
 * @param {number} yMultiplier Animation multiplier.
 * @param {number} baseAngle Accumulated angle (startAngle + sum of previous slices).
 * @param {number} segmentSlice Angular span of this segment in radians.
 * @returns {Array<{x: number, y: number}>}
 */
export function buildSegmentPoints(segArray, middle, h, rangeHeight, yMultiplier, baseAngle, segmentSlice) {
    const pts = [];
    const jl = segArray.length;

    for (let j = 0; j < jl; j++) {
        const radius = middle - (h - segArray[j] * rangeHeight * yMultiplier - 1);

        if (j === 0) {
            const rad0 = baseAngle + segmentSlice * ((j - 1) / (jl - 1));
            pts[0] = { x: middle + radius * Math.cos(rad0), y: middle + radius * Math.sin(rad0) };
            pts[1] = { x: middle + radius * Math.cos(baseAngle), y: middle + radius * Math.sin(baseAngle) };
        } else if (j !== jl - 1) {
            const rad = baseAngle + segmentSlice * (j / (jl - 1));
            pts[j + 1] = { x: middle + radius * Math.cos(rad), y: middle + radius * Math.sin(rad) };
        } else {
            const rad0 = baseAngle + segmentSlice;
            const rad1 = baseAngle + segmentSlice * ((j + 1) / (jl - 1));
            pts[j + 1] = { x: middle + radius * Math.cos(rad0), y: middle + radius * Math.sin(rad0) };
            pts[j + 2] = { x: middle + radius * Math.cos(rad1), y: middle + radius * Math.sin(rad1) };
        }
    }

    return pts;
}

/**
 * Builds the augmented points array for a single segment at full scale
 * (no yMultiplier) used to compute the SVG lookup path.
 *
 * @param {number[]} segArray
 * @param {number} middle
 * @param {number} graphHeight
 * @param {number} rangeHeight
 * @param {number} baseAngle
 * @param {number} segmentSlice
 * @returns {Array<{x: number, y: number}>}
 */
export function buildSegmentLookupPoints(segArray, middle, graphHeight, rangeHeight, baseAngle, segmentSlice) {
    const pts = [];
    const jl = segArray.length;

    for (let j = 0; j < jl; j++) {
        const radius = middle - (graphHeight - segArray[j] * rangeHeight);

        if (j === 0) {
            const rad0 = baseAngle + segmentSlice * ((j - 1) / (jl - 1));
            pts[0] = { x: middle + radius * Math.cos(rad0), y: middle + radius * Math.sin(rad0) };
            pts[1] = { x: middle + radius * Math.cos(baseAngle), y: middle + radius * Math.sin(baseAngle) };
        } else if (j !== jl - 1) {
            const rad = baseAngle + segmentSlice * (j / (jl - 1));
            pts[j + 1] = { x: middle + radius * Math.cos(rad), y: middle + radius * Math.sin(rad) };
        } else {
            const rad0 = baseAngle + segmentSlice;
            const rad1 = baseAngle + segmentSlice * ((j + 1) / (jl - 1));
            pts[j + 1] = { x: middle + radius * Math.cos(rad0), y: middle + radius * Math.sin(rad0) };
            pts[j + 2] = { x: middle + radius * Math.cos(rad1), y: middle + radius * Math.sin(rad1) };
        }
    }

    return pts;
}

/**
 * Builds augmented points for the full-circle at full scale (for lookup).
 *
 * @param {number[]} array
 * @param {number} middle
 * @param {number} graphHeight
 * @param {number} rangeHeight
 * @param {number} startAngle
 * @returns {Array<{x: number, y: number}>}
 */
export function buildRadialLookupPoints(array, middle, graphHeight, rangeHeight, startAngle) {
    const pts = [];
    const l = array.length;

    for (let i = 0; i < l; i++) {
        const radius = middle - (graphHeight - array[i] * rangeHeight);

        if (i === 0) {
            const rad0 = startAngle + TwoPI * ((i - 1) / (l - 1));
            pts[0] = { x: middle + radius * Math.cos(rad0), y: middle + radius * Math.sin(rad0) };
            pts[1] = { x: middle + radius * Math.cos(startAngle), y: middle + radius * Math.sin(startAngle) };
        } else if (i !== l - 1) {
            const rad = startAngle + TwoPI * (i / (l - 1));
            pts[i + 1] = { x: middle + radius * Math.cos(rad), y: middle + radius * Math.sin(rad) };
        } else {
            const rad0 = startAngle + TwoPI;
            const rad1 = startAngle + TwoPI * ((i + 1) / (l - 1));
            pts[i + 1] = { x: middle + radius * Math.cos(rad0), y: middle + radius * Math.sin(rad0) };
            pts[i + 2] = { x: middle + radius * Math.cos(rad1), y: middle + radius * Math.sin(rad1) };
        }
    }

    return pts;
}

// ---------------------------------------------------------------------------
// Hover lookup table
// ---------------------------------------------------------------------------

/**
 * Builds the lookup table used to map a mouse angle to a curve point for the
 * hover crosshair.
 *
 * @param {string} pathData SVG path string.
 * @param {number} lookupPrecision Number of samples.
 * @param {number} middle Canvas centre.
 * @param {number} startAngle
 * @returns {{ length: number, lookup: Array<{x: number, y: number, angle: number}> }}
 */
export function calculateLookup(pathData, lookupPrecision, middle, startAngle) {
    const properties = new SVGPathProperties(pathData);
    const length = properties.getTotalLength();
    const lookup = [];
    let i = 0;

    while (i <= 1) {
        const point = properties.getPointAtLength(i * length);
        const x = point.x - middle;
        const y = point.y - middle;

        let angle = (-startAngle + Math.atan2(y, x)) % TwoPI;

        if (angle < 0) {
            angle += TwoPI;
        }

        lookup.push({ x: point.x, y: point.y, angle });
        i += 1 / lookupPrecision;
    }

    return { length, lookup };
}

/**
 * Returns the interpolated curve point for a given normalised mouse angle.
 *
 * @param {{ x: number, y: number, angle: number }[]} lookup
 * @param {number} lookupPrecision
 * @param {number} mouseAngle Normalised [0, 1].
 * @returns {{ x: number, y: number }}
 */
export function getCurvePoint(lookup, lookupPrecision, mouseAngle) {
    const angle = mouseAngle * TwoPI;
    const approxIndex = Math.floor(mouseAngle * lookupPrecision);

    let i = Math.max(1, approxIndex - Math.floor(lookupPrecision / 4));

    for (; i < lookupPrecision; i++) {
        if (lookup[i].angle > angle) {
            break;
        }
    }

    if (i === lookupPrecision) {
        return { x: lookup[lookupPrecision - 1].x, y: lookup[lookupPrecision - 1].y };
    }

    const lower = lookup[i - 1];
    const upper = lookup[i];
    const percent = (angle - lower.angle) / (upper.angle - lower.angle);

    return {
        x: lower.x + (upper.x - lower.x) * percent,
        y: lower.y + (upper.y - lower.y) * percent
    };
}

// ---------------------------------------------------------------------------
// Colour gradient
// ---------------------------------------------------------------------------

/**
 * Creates the radial colour gradient used for the graph line and fill.
 * Identical math to `RadialGraph.createGradient`.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('@lib/math/Color.js').Color[]} colorRange Array of 4 Color objects.
 * @param {import('@lib/math/Color.js').Color} color Scratch Color for lerping.
 * @param {import('@lib/tween/Easing.js').Easing} Easing
 * @param {number} x0
 * @param {number} y0
 * @param {number} r0
 * @param {number} x1
 * @param {number} y1
 * @param {number} r1
 * @param {number} [alpha=1]
 * @returns {CanvasGradient}
 */
export function createRadialGradient(ctx, colorRange, color, Easing, x0, y0, r0, x1, y1, r1, alpha = 1) {
    const gradient = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
    const colorStep = 1 / 3 / 5;
    let offset = 0;

    for (let i = 0; i < 3; i++) {
        for (let t = 0; t < 5; t++) {
            gradient.addColorStop(
                offset,
                toRGBA(color.lerpColors(colorRange[i], colorRange[i + 1], Easing.easeInOutSine(t / 5)), alpha, alpha)
            );
            offset += colorStep;
        }
    }

    gradient.addColorStop(offset, toRGBA(colorRange[3], 1, alpha));

    return gradient;
}

/**
 * Converts a Color object to an `rgb(r g b / a)` string.
 *
 * @param {{ r: number, g: number, b: number }} color
 * @param {number} channelAlpha Per-channel alpha (from the tween).
 * @param {number} multiplier Global alpha multiplier.
 * @returns {string}
 */
function toRGBA(color, channelAlpha, multiplier) {
    return `rgb(${Math.round(color.r * 255)} ${Math.round(color.g * 255)} ${Math.round(color.b * 255)} / ${channelAlpha * multiplier})`;
}
