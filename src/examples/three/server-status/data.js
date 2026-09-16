/**
 * TimestampData — manages timestamp downsampling and marker tracking.
 * GraphData — manages two-level downsampled float arrays for sparkline graphs.
 *
 * Ported verbatim from the original examples.
 */

import { consecutive, median, peaks } from '@lib/three.js';

// ---------------------------------------------------------------------------
// TimestampData
// ---------------------------------------------------------------------------

export class TimestampData {
    constructor() {
        // small = 1min samples (up to 12), large = 12hr samples (up to 90)
        this.smallArray = [];
        this.largeArray = [];
        this.smallCounter = 0;
        this.largeCounter = 0;
        this.markersArray = [];
        this.labelsArray = [];
    }

    setArrays({ smallArray, largeArray, markersArray, labelsArray }) {
        this.smallArray = smallArray;
        this.largeArray = largeArray;
        this.markersArray = markersArray || [];
        this.labelsArray = labelsArray || [];
    }

    addMarker([timestamp, label]) {
        const index = this.largeArray.indexOf(timestamp);
        if (index !== -1) {
            this.markersArray.push([index / (this.largeArray.length - 1), label]);
        }
    }

    update(timestamp) {
        this.smallArray.push(timestamp);
        this.smallCounter++;

        if (this.smallCounter >= 12) {
            this.smallCounter = 0;
            const sample = this.smallArray[this.smallArray.length - 1];
            this.largeArray.push(sample);
            this.smallArray = [];
        }
    }

    get smallArrayReversed() {
        return [...this.smallArray].reverse();
    }

    get largeArrayReversed() {
        return [...this.largeArray].reverse();
    }

    get markersArrayReversed() {
        const len = this.largeArray.length - 1;
        return this.markersArray.map(([pos, label]) => [(1 - pos) * len / len, label]);
    }

    get labelsArrayReversed() {
        return [...this.labelsArray].reverse();
    }
}

// ---------------------------------------------------------------------------
// GraphData
// ---------------------------------------------------------------------------

export class GraphData {
    constructor() {
        this.realtimeArray = [];
        this.realtimeGhostArray = [];
        this.smallArray = [];
        this.smallGhostArray = [];
        this.largeArray = [];
        this.largeGhostArray = [];
        this.smallCounter = 0;
        this.largeCounter = 0;
    }

    setArrays({ realtimeArray, realtimeGhostArray, smallArray, smallGhostArray, largeArray, largeGhostArray }) {
        this.realtimeArray = realtimeArray || [];
        this.realtimeGhostArray = realtimeGhostArray || [];
        this.smallArray = smallArray || [];
        this.smallGhostArray = smallGhostArray || [];
        this.largeArray = largeArray || [];
        this.largeGhostArray = largeGhostArray || [];
    }

    update(value) {
        this.realtimeArray.push(value);
        if (this.realtimeArray.length > 10) {
            this.realtimeArray.shift();
        }
        // Ghost (peak tracking)
        const peak = Math.max(...this.realtimeArray);
        this.realtimeGhostArray.push(peak);
        if (this.realtimeGhostArray.length > 10) {
            this.realtimeGhostArray.shift();
        }

        this.smallCounter++;
        if (this.smallCounter >= 6) {
            this.smallCounter = 0;
            const small = median(this.realtimeArray);
            this.smallArray.push(small);
            if (this.smallArray.length > 12) {
                this.smallArray.shift();
            }
            const smallGhost = peaks(this.realtimeGhostArray);
            this.smallGhostArray.push(smallGhost);
            if (this.smallGhostArray.length > 12) {
                this.smallGhostArray.shift();
            }
        }

        this.largeCounter++;
        if (this.largeCounter >= 90) {
            this.largeCounter = 0;
            const large = consecutive(this.smallArray, 90);
            this.largeArray.push(large);
            if (this.largeArray.length > 90) {
                this.largeArray.shift();
            }
            const largeGhost = consecutive(this.smallGhostArray, 90);
            this.largeGhostArray.push(largeGhost);
            if (this.largeGhostArray.length > 90) {
                this.largeGhostArray.shift();
            }
        }
    }

    getMax() {
        return Math.max(
            ...this.realtimeArray,
            ...this.smallArray,
            ...this.largeArray
        );
    }

    get realtimeArrayReversed() { return [...this.realtimeArray].reverse(); }
    get realtimeGhostArrayReversed() { return [...this.realtimeGhostArray].reverse(); }
    get smallArrayReversed() { return [...this.smallArray].reverse(); }
    get smallGhostArrayReversed() { return [...this.smallGhostArray].reverse(); }
    get largeArrayReversed() { return [...this.largeArray].reverse(); }
    get largeGhostArrayReversed() { return [...this.largeGhostArray].reverse(); }
}
