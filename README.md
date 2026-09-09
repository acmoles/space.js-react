# Space.js

[![NPM Package][npm]][npm-url]
[![NPM Downloads][npm-downloads]][npmtrends-url]
[![DeepScan][deepscan]][deepscan-url]
[![Discord][discord]][discord-url]

This library is part of two sibling libraries, [Space.js](https://github.com/alienkitty/space.js) for UI, Panel components, Tween, Web Audio, loaders, utilities, and [Alien.js](https://github.com/alienkitty/alien.js) for 3D utilities, materials, shaders and physics.

<p>
    <img src="https://github.com/alienkitty/space.js/raw/main/space.js.png" alt="Space.js">
</p>

### Usage

Space.js is divided into two entry points depending on your use case.

The main entry point without any dependencies is for the UI components, loaders and utilities.

```sh
npm i @alienkitty/space.js
```

Math classes:

```js
import { Color, Vector2 } from '@alienkitty/space.js';
```

Panel components:

```js
import { Panel, PanelItem } from '@alienkitty/space.js';

const panel = new Panel();
const item = new PanelItem({
    // name: 'FPS'
    // type: 'spacer'
    // type: 'divider'
    // type: 'link'
    // type: 'thumbnail'
    // type: 'graph'
    // type: 'meter'
    // type: 'list'
    // type: 'slider'
    // type: 'toggle'
    // type: 'content'
    type: 'color'
});
panel.add(item);
panel.animateIn();
document.body.appendChild(panel.element);

function animate() {
    requestAnimationFrame(animate);

    panel.update();
}

requestAnimationFrame(animate);
```

HUD (heads-up display) components:

```js
import { UI } from '@alienkitty/space.js';

const ui = new UI({
    fps: true
    // header
    // footer
    // menu
    // info
    // details
    // instructions
    // detailsButton
    // muteButton
    // audioButton
});
ui.animateIn();
document.body.appendChild(ui.element);

function animate() {
    requestAnimationFrame(animate);

    ui.update();
}

requestAnimationFrame(animate);
```

Graph and meter components:

```js
import { Graph } from '@alienkitty/space.js';

const graph = new Graph({
    value: Array.from({ length: 10 }, () => Math.random()),
    precision: 2,
    lookupPrecision: 100
});
graph.animateIn();
document.body.appendChild(graph.element);

function animate() {
    requestAnimationFrame(animate);

    graph.update();
}

requestAnimationFrame(animate);
```

```js
import { RadialGraph } from '@alienkitty/space.js';

const graph = new RadialGraph({
    value: Array.from({ length: 10 }, () => Math.random()),
    precision: 2,
    lookupPrecision: 200
});
graph.animateIn();
document.body.appendChild(graph.element);

function animate() {
    requestAnimationFrame(animate);

    graph.update();
}

requestAnimationFrame(animate);
```

```js
import { Meter } from '@alienkitty/space.js';

const meter = new Meter({
    value: Math.random(),
    precision: 2
});
meter.animateIn();
document.body.appendChild(meter.element);

function animate() {
    requestAnimationFrame(animate);

    meter.update();
}

requestAnimationFrame(animate);
```

[Tween](https://github.com/alienkitty/space.js/wiki/Tween) animation engine:

```js
import { ticker, tween } from '@alienkitty/space.js';

ticker.start();

const data = {
    radius: 0
};

tween(data, { radius: 24, spring: 1.2, damping: 0.4 }, 1000, 'easeOutElastic', null, () => {
    console.log(data.radius);
});
```

Web Audio engine:

```js
import { BufferLoader, WebAudio } from '@alienkitty/space.js';

const loader = new BufferLoader();
await loader.loadAllAsync(['assets/sounds/gong.mp3']);
WebAudio.init({ sampleRate: 48000 });
WebAudio.load(loader.files);

const gong = WebAudio.get('gong');
gong.gain.set(0.5);

document.addEventListener('pointerdown', () => {
    gong.play();
});
```

Audio stream support:

```js
import { WebAudio } from '@alienkitty/space.js';

WebAudio.init({ sampleRate: 48000 });
WebAudio.load({ cyberspace: 'https://icecast.cyberspace.app/dive.ogg' });

const cyberspace = WebAudio.get('cyberspace');
cyberspace.gain.set(1);

document.addEventListener('pointerdown', () => {
    cyberspace.play();
});
```

And the `@alienkitty/space.js/three` entry point for [three.js](https://github.com/mrdoob/three.js) UI components, loaders and utilities.

```sh
npm i three @alienkitty/space.js
```

For example, loader utilities:

```js
import { EnvironmentTextureLoader } from '@alienkitty/space.js/three';

// ...
const loader = new EnvironmentTextureLoader(renderer);
loader.load('assets/textures/env/jewelry_black_contrast.jpg', texture => {
    scene.environment = texture;
    scene.environmentIntensity = 1.2;
});

// ...
const loader = new EnvironmentTextureLoader(renderer);
scene.environment = await loader.loadAsync('assets/textures/env/jewelry_black_contrast.jpg');
scene.environmentIntensity = 1.2;
```

### Examples

This repository is a React 19 + [Vite](https://vite.dev/) single page application. Every example from the original vanilla version has been ported to a route, with the 3D examples rendered with [React Three Fiber](https://r3f.docs.pmnd.rs/).

```sh
npm install
npm run dev      # development server
npm run build    # production build to dist/
npm run preview  # preview the production build
npm run lint
```

The home page (`/`) is an index of every example, and each example is available at the route matching its original file name, for example `/examples/fps` and `/examples/three/3d_lights`.

```
index.html            Vite entry point
lib/                  Space.js library source (published package)
public/assets/        Example assets
scripts/              Parity and smoke harnesses
src/
  main.jsx            React entry point
  App.jsx             Routes
  components/         Shared app components
  examples/           One component per example, grouped by category
    registry.js       Example metadata used by the router and index page
  hooks/              Shared app hooks
  pages/              Index page
  space/              Declarative React implementation of the UI library
    components/       Components, grouped by family
    hooks/            useEventListener, useResize, useMagnetic
    motion/           Style engine, useAnimation, useMotion, useTicker
    three/            React Three Fiber components and hooks
  styles/             Global styles
examples/mars/        Standalone demos (mars, about, cyberspace), built
                      separately with Rollup
```

The UI itself is re-implemented as declarative React components under
`src/space/`, documented in [src/space/README.md](src/space/README.md).
Components own their markup, styles and animation, and motion runs through the
library's own tween engine and easing functions so timings and curves are
identical to the vanilla version.

No React component in `src/` uses a UI class from `lib/`. The panels and graphs
attached to a `Point3D` are declared as children:

```jsx
<Point3D {...props}>
    <Point3DPanel items={panelItems} />
    <Point3DGraph {...graphProps} />
</Point3D>
```

The three.js panel definitions — 60-odd files describing the contents of the
light, material and texture inspectors — live under `src/space/three/panels/`.
Where the vanilla library expressed these as classes (`class X extends Panel`,
with `initPanel()` adding `PanelItem`s), the React versions are plain functions
returning arrays of item descriptors, so a panel definition is *data* rather
than a rendering concern. Nesting is expressed with the `subPanel()` helper,
which keeps every definition file free of JSX. Static class members such as
`type` and `properties` become properties on the exported function.

What `src/` still imports from `lib/` is only framework-agnostic, non-UI code:
the tween engine and easing functions, `Utils`, the `Color` and `Vector2` math
types, `SVGPathProperties`, the loaders, `Stage`, `router`, `ticker` and
`WebAudio`. Sharing these is what keeps motion identical to the vanilla version,
and none of them render anything.

Ports are checked against the pre-port pages with the parity harness, which
renders a route and the original page side by side in headless Chromium and
reports the number of differing pixels:

```sh
sudo apt-get install -y imagemagick     # once — the harness shells out to `compare`
npm install --no-save playwright-core   # once
npm run parity                          # every route
npm run parity -- tween magnetic        # specific routes
```

ImageMagick is required, and the harness now exits immediately if `compare` is
missing. It previously treated a failed `compare` invocation as a count of
zero, because `Number('')` is `0`, so **every route reported `0 differing
pixels` and passed** in environments without ImageMagick. Any parity result
recorded before that fix should be treated as unverified.

Each route is compared twice: once idle, and once with the pointer at the centre
of the viewport. Much of this UI — `Point3D` panels, radial graphs, trackers —
only appears on hover, so an idle screenshot alone will happily pass a route
whose panel is broken. Both columns must read `0`.

A pixel count tells you *that* a route differs. To see *what* differs, the
layout harness walks the rendered tree of both pages and dumps tag names,
class names, bounding boxes, typography, colour and opacity, ready to `diff`:

```sh
npm run domparity -- details_info
diff /tmp/domparity/details_info-reference.txt /tmp/domparity/details_info-current.txt
```

Neither harness catches a route that renders correctly but throws while it
animates, so the smoke test opens every route and fails on any uncaught error:

```sh
npm run smoke                           # every route
npm run smoke -- panel fps_panel        # specific routes
```

##### Noise, and why the numbers can be trusted now

The examples animate continuously and many feed `Math.random()` into graphs and
meters, so two captures of the *same* page used to disagree by hundreds to tens
of thousands of pixels. That noise floor was indistinguishable from a real
regression.

`scripts/deterministic.mjs` removes both sources of it, on both sides of the
comparison:

- `requestAnimationFrame`, `performance.now()` and `Date.now()` are replaced by
  a virtual clock that only moves when the harness steps it, so a capture lands
  on an exact frame rather than "wherever the screenshot happened to fall".
- `Math.random()` is replaced by a seeded PRNG, so a page plotting random data
  plots the same data every run.

Real timers are left alone, because module loading and texture decoding depend
on them.

The floor is measured rather than assumed — `PARITY_NOISE=1` captures the
reference a second time and diffs it against itself, and that self-diff becomes
the route's tolerance:

```sh
PARITY_NOISE=1 npm run parity -- test_radial_graph
```

`test_radial_graph` went from a 19,845 px floor to 0, and `test_meter` from 764
to 0, so the default tolerance is 0 and a "0 differing pixels" claim now means
something.

44 of the 56 routes currently pass at 0 differing pixels, idle and on hover. The
12 that do not are described below; ten of them are blank on both sides and are
counted as failures precisely so that a vacuous match is never mistaken for
parity.

##### Known gaps

`close`, `progress`, `progress_indeterminate` and `audio_stream` used to capture
as an empty background and were assumed to be a harness limitation. They were
not: each was a real port bug that the deterministic clock simply made visible.
The port had added initial `drawLine` calls that hide strokes the original
leaves solid until its ticker first runs, and `audio_stream` animated a panel
whose items the original never animates — on a page that starts no ticker, so
they stayed hidden forever. Two elements had also lost their box: the panel
divider (the original sets `height: 1` inline) and the slider fill line (a block
div, ported as an inline `<span>`, so it measured 0x0). All four now pass at
0 px.

`thumbnail` and `thread_canvas` paint per-pixel random noise over the whole
viewport, so any difference in how many `Math.random()` calls precede a frame
offsets the entire stream and every pixel differs. Both report roughly
1,024,000 px while their mean brightness matches the reference to four decimal
places, which is the signature of a stream offset rather than a visual
regression. `thread_canvas` additionally draws from a worker, and
`page.addInitScript` does not reach worker contexts, so its `Math.random()` is
not seeded at all. Their pixel numbers are meaningless until the RNG streams
can be aligned; the surrounding chrome on both routes is verified by eye.

Ten routes report `reference page rendered nothing` and are counted as
failures even though they show zero differing pixels. This is expected in a
sandbox and is not a regression. Nine of them are the console-only `test_*`
pages, which deliberately render no markup and only log; the tenth is
`details_server_status`, whose original page builds its UI inside a websocket
handler and so mounts nothing when `wss://hello-websockets-server-status.cyberspace.app`
is unreachable. In both cases the two screenshots are blank and identical, so
the zero pixel count is vacuous rather than evidence of parity — these routes
need network access, or a manual check, to be verified properly.

#### ui

[logo](https://space.js.org/examples/logo.html) (interface)  
[alienkitty](https://space.js.org/examples/alienkitty.html) (interface)  
[alienkitty](https://space.js.org/examples/alienkitty_canvas.html) (canvas)  
[ui](https://space.js.org/examples/ui.html) (hud)  
[components](https://space.js.org/examples/ui_components.html) (ui)  
[audio](https://space.js.org/examples/ui_audio.html) (ui)  
[progress](https://space.js.org/examples/progress_canvas.html) (canvas)  
[progress](https://space.js.org/examples/progress.html) (svg)  
[progress indeterminate](https://space.js.org/examples/progress_indeterminate.html) (svg)  
[close](https://space.js.org/examples/close.html) (svg)  
[tween](https://space.js.org/examples/tween.html) (svg)  
[magnetic](https://space.js.org/examples/magnetic.html) (component, svg)  
[details](https://space.js.org/examples/details.html)  
[info](https://space.js.org/examples/details_info.html) (details)  
[server status](https://space.js.org/examples/details_server_status.html) (details)  
[fps](https://space.js.org/examples/fps.html)  
[fps panel](https://space.js.org/examples/fps_panel.html)  
[fps graph](https://space.js.org/examples/fps_graph.html)  
[fps meter](https://space.js.org/examples/fps_meter.html)  
[panel](https://space.js.org/examples/panel.html) (standalone)  
[graph](https://space.js.org/examples/graph.html) (standalone)  
[radial graph](https://space.js.org/examples/radial_graph.html) (standalone)  
[radial graph](https://space.js.org/examples/audio_radial_graph.html) (audio analyser)  
[graph markers](https://space.js.org/examples/graph_markers.html)  
[meter](https://space.js.org/examples/meter.html) (standalone)  
[thumbnail](https://space.js.org/examples/thumbnail.html)  
[ufo](https://ufo.ai/) (2d scene, smooth scroll with skew effect)  

#### 3d

[materials](https://space.js.org/examples/three/3d_materials.html) (panel tracking)  
[materials instancing](https://space.js.org/examples/three/3d_materials_instancing.html) ([debug](https://space.js.org/examples/three/3d_materials_instancing.html?3&debug))  
[materials instancing](https://space.js.org/examples/three/3d_materials_instancing_modified.html) (custom, [debug](https://space.js.org/examples/three/3d_materials_instancing_modified.html?3&debug))  
[materials spherical cube](https://space.js.org/examples/three/3d_materials_spherical_cube.html) (array of materials)  
[lights](https://space.js.org/examples/three/3d_lights.html)  
[radial graph](https://space.js.org/examples/three/3d_radial_graph.html) (graph and panel tracking)  
[server status](https://space.js.org/examples/three/3d_server_status.html) (details, graph and panel tracking)  
[server status](https://space.js.org/examples/three/3d_server_status_thread.html) (websocket thread, details, graph and panel tracking)  
[mars](https://space.js.org/examples/mars/) (cubemaps, details info, ambient audio)  
[cyberspace](https://space.js.org/examples/cyberspace/) (geoip, details, points tracking)  

#### audio

[gong](https://space.js.org/examples/audio_gong.html)  
[stream](https://space.js.org/examples/audio_stream.html)  
[rhythm](https://space.js.org/examples/audio_rhythm.html)  
[audio](https://space.js.org/examples/ui_audio.html) (ui)  
[analyser](https://space.js.org/examples/audio_radial_graph.html) (ui, radial graph)  

#### thread

[canvas](https://space.js.org/examples/thread_canvas.html) (noise)  
[server status](https://space.js.org/examples/three/3d_server_status_thread.html) (websocket thread)  

### Getting started

Clone this repository and open the examples:

```sh
git clone https://github.com/alienkitty/space.js
cd space.js
npx servez
```

### ESLint

```sh
npm i -D eslint eslint-plugin-html @eslint/js globals
npx eslint src
npx eslint examples/about/src
npx eslint examples/mars/src
npx eslint examples/cyberspace/src
npx eslint examples/three/*.html
npx eslint examples/*.html
```

### Resources

* [The Wiki](https://github.com/alienkitty/space.js/wiki)
* [Tween](https://github.com/alienkitty/space.js/wiki/Tween)
* [Changelog](https://github.com/alienkitty/space.js/releases)

### See also

* [Alien.js](https://github.com/alienkitty/alien.js)
* [Three.js](https://github.com/mrdoob/three.js)
* [OGL](https://github.com/oframe/ogl)


[npm]: https://img.shields.io/npm/v/@alienkitty/space.js
[npm-url]: https://www.npmjs.com/package/@alienkitty/space.js
[npm-downloads]: https://img.shields.io/npm/dw/@alienkitty/space.js
[npmtrends-url]: https://www.npmtrends.com/@alienkitty/space.js
[deepscan]: https://deepscan.io/api/teams/20020/projects/23997/branches/734568/badge/grade.svg
[deepscan-url]: https://deepscan.io/dashboard#view=project&tid=20020&pid=23997&bid=734568
[discord]: https://img.shields.io/discord/773739853913260032
[discord-url]: https://discord.gg/9rSkAzB7PM
