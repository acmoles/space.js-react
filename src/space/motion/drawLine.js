/**
 * Draws a partial SVG path by way of the stroke dash array, the same way the
 * `drawLine` method of the Space.js `Interface` class does.
 *
 * @param {SVGGeometryElement} element Path, circle, or other geometry element.
 * @param {number} progress Fraction of the path to draw, from 0 to 1.
 * @param {number} [start] Start of the stroke, as a fraction of the path.
 * @param {number} [offset] Offset of the stroke, as a fraction of the path.
 * @example
 * drawLine(circleRef.current, 0.5, 0, -0.25);
 */
export function drawLine(element, progress = 0, start = 0, offset = 0) {
    if (!element) {
        return;
    }

    const length = element.getTotalLength();
    const dash = length * progress;
    const gap = length - dash;

    element.style.strokeDasharray = `${dash},${gap}`;
    element.style.strokeDashoffset = -length * (start + offset);
}
