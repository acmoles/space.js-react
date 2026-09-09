# Space.js React

A React 19 + [Vite](https://vite.dev/) port of [Space.js](https://github.com/alienkitty/space.js) — a minimal monospace UI library of HUD, panel, graph and meter components.

The original library is imperative: you construct view objects, call methods on them and append `element` to the DOM. This port re-implements that UI layer as declarative React components that own their markup, styles and animation, take props in and send events out. The 3D examples are rendered with [React Three Fiber](https://r3f.docs.pmnd.rs/).

<p>
    <img src="https://github.com/alienkitty/space.js/raw/main/space.js.png" alt="Space.js">
</p>

Every example from the original vanilla version has been ported to a route and is checked against its pre-port page pixel by pixel, so the ported UI is intended to be indistinguishable from the original at an experience level. See [Parity](#parity) for what that claim is currently worth.

### Getting started

```sh
npm install
npm run dev      # development server
npm run build    # production build to dist/
npm run preview  # preview the production build
npm run lint
```

The home page (`/`) is an index of every example. Each example lives at the route matching its original file name, for example `/examples/fps` and `/examples/three/3d_lights`.

### Usage

A `Panel` is described by an array of row descriptors, mirroring the item
objects the original library takes. Rows animate in in array order:

```jsx
import { Panel } from '@/space/components/panels/index.js';

const items = [
    { name: 'Settings' },
    { type: 'divider' },
    { type: 'slider', name: 'Speed', min: 0, max: 10, step: 0.1, value: 5, callback: value => setSpeed(value) },
    { type: 'toggle', name: 'Visible', value: true, callback: value => setVisible(value) },
    { type: 'color', name: 'Color', value: '#ffffff', callback: value => setColor(value) }
];

<Panel ref={panelRef} items={items} />
```

Call `panelRef.current.animateIn()` to stagger the rows in, or pass `autoAnimateIn` to show them untweened on mount (what nested panels do).

Row types are `divider`, `spacer`, `link`, `thumbnail`, `graph`, `meter`, `list`, `slider`, `toggle`, `color` and `content`; an item with no `type` renders a label.

`list`, `slider` and `toggle` rows take nested rows through `content`, which is
either an array of descriptors or a function returning one. `Panel` shows and
hides that group as the row opens and closes:

```jsx
{
    type: 'toggle',
    name: 'Advanced',
    value: false,
    callback: (value, item) => item.setContent(value ? new Panel(nestedItems) : null),
    content: [
        { type: 'divider' },
        { type: 'slider', name: 'Nested', min: 0, max: 1, step: 0.01, value: 0.5, callback: onNested }
    ]
}
```

HUD components:

```jsx
import { UI } from '@/space/components/ui/UI.jsx';

<UI ref={uiRef} fps fpsOpen panelItems={[{ name: 'FPS' }]} />
```

Graph and meter components:

```jsx
import { Graph, Meter } from '@/space/components/graphs/index.js';
import { RadialGraph } from '@/space/components/radial/index.js';

<Graph value={values} precision={2} lookupPrecision={100} />
<RadialGraph value={values} precision={2} lookupPrecision={200} />
<Meter value={0.5} precision={2} />
```

Panels and graphs attached to a `Point3D` are declared as children:

```jsx
<Point3D {...props}>
    <Point3DPanel items={panelItems} />
    <Point3DGraph {...graphProps} />
</Point3D>
```

Animation and per-frame work go through hooks rather than imperative calls — `useAnimation` returns a `[ref, controls]` pair mirroring `Interface.css`/`Interface.tween`, and `useTicker` subscribes to the shared render loop for the lifetime of a component. Both cancel on unmount.

### Project structure

```
index.html            Vite entry point
lib/                  Space.js library source (framework-agnostic engines)
public/assets/        Example assets
scripts/              Parity, DOM parity and smoke harnesses
src/
  main.jsx            React entry point
  App.jsx             Routes
  components/         Shared app components
  examples/           One component per example, grouped by category
    registry.js       Example metadata used by the router and index page
    shared/           Row sets shared between examples
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

The UI is re-implemented under `src/space/`, documented in [src/space/README.md](src/space/README.md).

No React component in `src/` uses a UI class from `lib/`. What `src/` still imports from `lib/` is only framework-agnostic, non-UI code: the tween engine and easing functions, `Utils`, the `Color` and `Vector2` math types, `SVGPathProperties`, the loaders, `Stage`, `router`, `ticker` and `WebAudio`. Sharing these is what keeps motion identical to the vanilla version, and none of them render anything.

#### Panel definitions as data

The three.js panel definitions — 60-odd files describing the contents of the light, material and texture inspectors — live under `src/space/three/panels/`. Where the vanilla library expressed these as classes (`class X extends Panel`, with `initPanel()` adding `PanelItem`s), the React versions are plain functions returning arrays of item descriptors, so a panel definition is *data* rather than a rendering concern. Nesting is expressed with the `subPanel()` helper, which keeps every definition file free of JSX.

These definitions derive their rows by introspecting three.js materials at runtime, so they genuinely are data and cannot be written out as JSX. `Panel` therefore also accepts an `items` prop, which is a thin adapter that maps descriptors onto the same row components used by the JSX API — not a second implementation. Hand-written panels should use JSX.

### Parity

Ports are checked against the pre-port pages with the parity harness, which renders a route and the original page side by side in headless Chromium and reports the number of differing pixels:

```sh
sudo apt-get install -y imagemagick     # once — the harness shells out to `compare`
npm install --no-save playwright-core   # once
npm run parity                          # every route
npm run parity -- tween magnetic        # specific routes
```

ImageMagick is required, and the harness exits immediately if `compare` is missing. It previously treated a failed `compare` invocation as a count of zero, because `Number('')` is `0`, so **every route reported `0 differing pixels` and passed** in environments without ImageMagick. Any parity result recorded before that fix should be treated as unverified.

Each route is compared twice: once idle, and once with the pointer at the centre of the viewport. Much of this UI — `Point3D` panels, radial graphs, trackers — only appears on hover, so an idle screenshot alone will happily pass a route whose panel is broken. Both columns must read `0`.

A pixel count tells you *that* a route differs. To see *what* differs, the layout harness walks the rendered tree of both pages and dumps tag names, class names, bounding boxes, typography, colour and opacity, ready to `diff`:

```sh
npm run domparity -- details_info
diff /tmp/domparity/details_info-reference.txt /tmp/domparity/details_info-current.txt
```

Neither harness catches a route that renders correctly but throws while it animates, so the smoke test opens every route and fails on any uncaught error:

```sh
npm run smoke                           # every route
npm run smoke -- panel fps_panel        # specific routes
```

#### Noise, and why the numbers can be trusted

The examples animate continuously and many feed `Math.random()` into graphs and meters, so two captures of the *same* page used to disagree by hundreds to tens of thousands of pixels. That noise floor was indistinguishable from a real regression.

`scripts/deterministic.mjs` removes both sources of it, on both sides of the comparison:

- `requestAnimationFrame`, `performance.now()` and `Date.now()` are replaced by a virtual clock that only moves when the harness steps it, so a capture lands on an exact frame rather than "wherever the screenshot happened to fall".
- `Math.random()` is replaced by a seeded PRNG, so a page plotting random data plots the same data every run.

Real timers are left alone, because module loading and texture decoding depend on them.

The floor is measured rather than assumed — `PARITY_NOISE=1` captures the reference a second time and diffs it against itself, and that self-diff becomes the route's tolerance:

```sh
PARITY_NOISE=1 npm run parity -- test_radial_graph
```

`test_radial_graph` went from a 19,845 px floor to 0, and `test_meter` from 764 to 0, so the default tolerance is 0 and a "0 differing pixels" claim now means something.

**44 of the 56 routes currently pass at 0 differing pixels, idle and on hover.** The 12 that do not are described below; ten of them are blank on both sides and are counted as failures precisely so that a vacuous match is never mistaken for parity.

#### Known gaps

`close`, `progress`, `progress_indeterminate` and `audio_stream` used to capture as an empty background and were assumed to be a harness limitation. They were not: each was a real port bug that the deterministic clock simply made visible. The port had added initial `drawLine` calls that hide strokes the original leaves solid until its ticker first runs, and `audio_stream` animated a panel whose items the original never animates — on a page that starts no ticker, so they stayed hidden forever. Two elements had also lost their box: the panel divider (the original sets `height: 1` inline) and the slider fill line (a block div, ported as an inline `<span>`, so it measured 0x0). All four now pass at 0 px.

`thumbnail` and `thread_canvas` paint per-pixel random noise over the whole viewport, so any difference in how many `Math.random()` calls precede a frame offsets the entire stream and every pixel differs. Both report roughly 1,024,000 px while their mean brightness matches the reference to four decimal places, which is the signature of a stream offset rather than a visual regression. `thread_canvas` additionally draws from a worker, and `page.addInitScript` does not reach worker contexts, so its `Math.random()` is not seeded at all. Their pixel numbers are meaningless until the RNG streams can be aligned; the surrounding chrome on both routes is verified by eye.

Ten routes report `reference page rendered nothing` and are counted as failures even though they show zero differing pixels. This is expected in a sandbox and is not a regression. Nine of them are the console-only `test_*` pages, which deliberately render no markup and only log; the tenth is `details_server_status`, whose original page builds its UI inside a websocket handler and so mounts nothing when `wss://hello-websockets-server-status.cyberspace.app` is unreachable. In both cases the two screenshots are blank and identical, so the zero pixel count is vacuous rather than evidence of parity — these routes need network access, or a manual check, to be verified properly.

### Examples

Routes are grouped on the index page as UI, FPS, Graphs & Panels, Audio, Tests and 3D.

#### ui

logo (interface), alienkitty (interface), alienkitty (canvas), ui (hud), components, audio, progress (canvas), progress (svg), progress indeterminate (svg), close (svg), tween (svg), magnetic (component, svg), details, info (details), server status (details), thumbnail

#### fps

fps, fps panel, fps graph, fps meter

#### graphs and panels

panel (standalone), graph (standalone), radial graph (standalone), radial graph (audio analyser), graph markers, meter (standalone)

#### audio

gong, stream, rhythm, audio (ui), analyser (ui, radial graph)

#### 3d

materials (panel tracking), materials instancing, materials instancing (custom), materials spherical cube (array of materials), lights, radial graph (graph and panel tracking), server status (details, graph and panel tracking), server status (websocket thread)

#### thread

canvas (noise), server status (websocket thread)

The standalone `mars` and `cyberspace` demos under `examples/` are built separately with Rollup and are not part of the SPA.

### See also

* [Space.js](https://github.com/alienkitty/space.js) — the original library this port is based on
* [Alien.js](https://github.com/alienkitty/alien.js)
* [Three.js](https://github.com/mrdoob/three.js)
* [React Three Fiber](https://r3f.docs.pmnd.rs/)

### License

MIT
