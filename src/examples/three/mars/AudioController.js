import { WebAudio } from '@lib/three.js';

import { isMobile } from './config.js';

/**
 * Audio controller for the Mars example.
 *
 * Ported from the static `AudioController` in
 * `examples/mars/src/controllers/audio/AudioController.js` to an instance so it
 * can be fully torn down on unmount (StrictMode / route navigation). WebAudio
 * itself is a library singleton; this class owns its lifecycle here.
 *
 * The `WebAudio` context is created up front (suspended); it only starts making
 * sound after the user gesture that calls `start()`, satisfying the browser
 * autoplay policy.
 *
 * @param {Map} files The `AssetLoader.files` map. Mirrors the original
 *   `WebAudio.load(loader.files)`; only the three sounds are ever played by
 *   name, the rest are registered but never decoded.
 */
export class AudioController {
    init(files) {
        this.destroyed = false;

        WebAudio.init({ sampleRate: 48000 });

        if (files) {
            WebAudio.load(files);
        }

        this.addListeners();
    }

    addListeners() {
        document.addEventListener('visibilitychange', this.onVisibility);
    }

    removeListeners() {
        document.removeEventListener('visibilitychange', this.onVisibility);
    }

    // Event handlers

    onVisibility = () => {
        if (document.hidden) {
            WebAudio.mute();
        } else {
            WebAudio.unmute();
        }
    };

    // Public methods

    trigger = event => {
        if (this.destroyed) {
            return;
        }

        switch (event) {
            case 'hover':
                WebAudio.play('hover', 0.05);
                break;
            case 'click':
                WebAudio.play('click', 0.04);
                break;
            case 'mars_start':
                // Resume the (autoplay-suspended) context inside the user
                // gesture that reaches here, without the master-gain fade that
                // `WebAudio.resume()` would apply.
                if (WebAudio.context) {
                    WebAudio.context.resume();
                }
                WebAudio.fadeInAndPlay('enough_loop', 0.05, true, 2000, 'linear');
                break;
        }
    };

    // Convenience helpers used by the UI event delegation

    hover = () => {
        if (!isMobile) {
            this.trigger('hover');
        }
    };

    click = () => {
        if (!isMobile) {
            this.trigger('click');
        }
    };

    destroy = () => {
        this.destroyed = true;

        this.removeListeners();

        if (WebAudio.context) {
            WebAudio.destroy();
        }
    };
}
