/**
 * Shared utilities and data-context for the Server Status examples.
 */

export class Utils {
    // https://stackoverflow.com/questions/36098913/convert-seconds-to-days-hours-minutes-and-seconds/52387803#52387803
    static formatSeconds(seconds) {
        seconds = Number(seconds);

        const d = Math.floor(seconds / 86400);
        const h = Math.floor(seconds % 86400 / 3600);
        const m = Math.floor(seconds % 3600 / 60);
        const s = Math.floor(seconds % 60);

        const daysFormatted = d > 0 ? `${d}${(d === 1 ? ' day ' : ' days ')}` : '';
        const hoursFormatted = h > 0 ? `${h}${(h === 1 ? ' hour ' : ' hours ')}` : '';
        const minutesFormatted = m > 0 ? `${m}${(m === 1 ? ' minute ' : ' minutes ')}` : '';
        const secondsFormatted = `${s}${(s === 1 ? ' second' : ' seconds')}`;

        return `${daysFormatted}${hoursFormatted}${minutesFormatted}${secondsFormatted}`;
    }

    static formatInfoSeconds(seconds) {
        seconds = Number(seconds);
        if (seconds < 60) return 'now';
        if (seconds < 3600) return `${Math.floor(seconds % 3600 / 60)}min`;
        if (seconds < 86400) return `${Math.floor(seconds % 86400 / 3600)}h`;
        return `${Math.floor(seconds / 86400)}d`;
    }

    static formatDateTimeSeconds(seconds) {
        seconds = Number(seconds);
        return new Date(seconds * 1000).toLocaleString('default', {
            month: 'short',
            day: 'numeric',
            // year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: false
        });
    }

    // https://stackoverflow.com/questions/32054170/how-to-resize-an-array/32055229#32055229
    static backfill(array, size, value) {
        return [...Array(Math.max(0, size - array.length)).fill(value), ...array];
    }
}

export class Data {
    static init({ projectDomain, networkName }) {
        this.projectDomain = projectDomain;
        this.networkName = networkName;
    }

    // Public methods

    static getName = () => {
        // return basename(this.projectDomain);
        return 'server-status';
    };

    static getType = () => {
        return this.networkName.match(/\(([^)]+)\)/).pop(); // IP address
    };
}
