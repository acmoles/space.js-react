# `src/space` — declarative Space.js for React

An idiomatic React re-implementation of the Space.js UI layer. Components own
their markup, styles and animation, take props in and send events out. There
are no singletons and no imperative view objects.

## What is reused from `lib/`

Everything that is already framework agnostic and pure:

- `tween/` — `Ticker`, `Tween`, `Easing`, `BezierEasing`
- `math/`, `path/`, `utils/Utils.js` — pure helpers
- `loaders/`, `audio/` — non-DOM engines

Reusing the tween engine and easing functions is deliberate: motion runs
through exactly the same code path as the original library, so durations and
curves cannot drift.

## What is re-implemented here

The imperative DOM layer — `utils/Interface.js`, `ui/*` and `panels/*` — is
replaced by React components.

## Conventions

- **One component per file**, named export, co-located `.css` file, JSDoc with
  an `@example`.
- **Class names match the library.** `link`, `line`, `title`, `name`, `info`,
  `item` and friends are part of the public styling contract that
  `src/styles/global.css` and per-example styles target, so they stay global
  rather than being hashed by CSS Modules. Component-private rules live in the
  co-located file, scoped under the component's own class name.
- **Animation goes through `useAnimation`**, which returns a `[ref, controls]`
  pair. `controls.set` mirrors `Interface.css` and `controls.animate` mirrors
  `Interface.tween`, including the argument order, so a port can be read
  side by side with the original source. Running animations are cancelled on
  unmount.
- **Per-frame work goes through `useTicker`**, which subscribes to the shared
  render loop for the lifetime of the component.
- **Imperative handles are the exception, not the rule.** Where a composite
  needs to stagger children in and out, the child exposes `animateIn` and
  `animateOut` through `useImperativeHandle`. Everything else is props.
- **No `document` or `window` mutation** outside of providers and hooks.

## Layout

```
src/space/
├── components/
│   ├── nav/          Title, Link, NavLink, Menu, Header, Footer, ...
│   ├── details/      Details, DetailsButton, DetailsInfo, buttons
│   ├── indicators/   Progress, Thumbnail, Reticle, Tracker, Point, ...
│   ├── graphs/       Graph, GraphSegments, GraphLabel, GraphMarker, Meter
│   ├── radial/       RadialGraph, RadialGraphSegments and canvases
│   ├── panels/       Panel, PanelItem, Slider, Toggle, List, ColorPicker, ...
│   └── ui/           UI composite
├── hooks/            useEventListener, useResize
├── motion/           style engine, useAnimation, useTicker, useDelayedCall
└── three/            R3F components and hooks
```

## Reference implementation

`components/nav/Link.jsx` and `components/nav/NavLink.jsx` are the canonical
examples of the pattern: static styling in CSS, dynamic styling and motion
through `useAnimation`, events as props, imperative handle for `animateIn` and
`animateOut`.

---

## Component catalogue

All components are re-exported from `src/space/index.js` (and from
`src/space/components/index.js`), so a consumer can write:

```js
import { Panel, Tracker, useAnimation } from '../../space/index.js';
```

### Name-collision audit

No name collisions exist across families (verified programmatically). If a
family adds a name that already exists in another family, fix the duplication
in the family's own `index.js` before merging.

---

### `nav` — navigation chrome

Replaces `lib/ui/`: DividerLine, Footer, FooterTitle, Header, HeaderInfo,
Info, Link, Menu, MenuItem, NavLink, NavTitle, Title.

| Component | Props | `ref` methods |
|---|---|---|
| `DividerLine` | `[left]` | `animateIn()`, `animateOut()` |
| `Footer` | `[title]`, `[links]`, `[info]`, `[breakpoint=0]` | `animateIn()`, `animateOut()` |
| `FooterTitle` | `[name]`, `[caption]`, `[link]`, `[target]`, `[callback]`, `[onHover]`, `[onClick]` | `hide()`, `animateIn(delay)`, `animateOut()` |
| `Header` | `[title]`, `[links]`, `[fps=false]`, `[fpsOpen=false]`, `[breakpoint=0]` | `animateIn()`, `animateOut()` |
| `HeaderInfo` | `[fpsOpen=false]` | `hide()`, `animateIn(delay)`, `animateOut()`, `enable()`, `disable()`, `openPanel()`, `addPanel(item)`, `getPanelIndex(path)`, `getPanelValue(path)`, `setPanelIndex(path,i)` |
| `Info` | `content` *(required)*, `[bottom=false]` | `animateIn(delay)`, `animateOut(callback)` |
| `Link` | `title` *(required)*, `link` *(required)*, `[target]`, `[onHover]`, `[onClick]` | `animateIn()`, `animateOut()` |
| `Menu` | `items` *(required)*, `[active]`, `[bottom=false]`, `[itemWidth]`, `[breakpoint=0]`, `[onUpdate]`, `[onHover]`, `[onClick]` | `animateIn()`, `animateOut()` |
| `MenuItem` | `name` *(required)*, `index` *(required)*, `[width]`, `[onHover]`, `[onClick]` | `animateIn(delay)`, `animateOut()`, `activate(direction)`, `deactivate(direction)` |
| `NavLink` | `title` *(required)*, `link` *(required)*, `[target]`, `[onHover]`, `[onClick]` | `hide()`, `animateIn(delay)`, `animateOut()` |
| `NavTitle` | `[name]`, `[caption]`, `[link]`, `[target]`, `[callback]`, `[onHover]`, `[onClick]` | `hide()`, `animateIn(delay)`, `animateOut()` |
| `Title` | `title` *(required)* | `animateIn()`, `animateOut(callback)`, `setTitle(text)` |

---

### `details` — details overlay

Replaces `lib/ui/`: AudioButton, AudioButtonInfo, Details, DetailsButton,
DetailsInfo, DetailsLink, DetailsTitle, MuteButton.

| Component | Props | `ref` methods |
|---|---|---|
| `AudioButton` | `[sound=true]`, `[info]`, `[onUpdate]`, `[onHover]`, `[onClick]` | `animateIn()`, `animateOut()` |
| `AudioButtonInfo` | `[data]` (`{ name, title, image, link }`) | — |
| `Details` | `data` *(required)* (`{ width?, background?, dividerLine?, title?, content? }`), `[breakpoint=0]`, `[onClick]` | `animateIn()`, `animateOut(callback)` |
| `DetailsButton` | `[data]` (`{ number, total }`), `[fastUpdate=false]`, `[onHover]`, `[onClick]` | `animateIn()`, `animateOut()`, `open()`, `close()` |
| `DetailsInfo` | `data` *(required)* (`{ title?, content? }`), `[hasDetailsButton=false]`, `[breakpoint=0]` | `animateIn()`, `animateOut(callback)` |
| `DetailsLink` | `title` *(required)*, `link` *(required)*, `[target='_blank']`, `[onHover]`, `[onClick]` | — |
| `DetailsTitle` | `title` *(required)* | `animateIn()` |
| `MuteButton` | `[sound=true]`, `[onUpdate]`, `[onHover]`, `[onClick]` | `animateIn()`, `animateOut()` |

---

### `indicators` — on-screen indicators and overlays

Replaces `lib/ui/`: LineCanvas, Point, PointInfo, Progress, ProgressCanvas,
Reticle, ReticleCanvas, ReticleInfo, TargetNumber, Thumbnail, Tracker.

| Component | Props | `ref` methods |
|---|---|---|
| `LineCanvas` | `[context]` | `setContext(ctx)`, `setStartPoint({x,y})`, `setEndPoint({x,y})`, `update()`, `animateIn(reverse)`, `animateOut(fast,callback)`, `deactivate()` |
| `Point` | `[data]` (`{ name, type }`), `[targetNumbers]`, `[onHover]`, `[trackerRef]`, `[onUiShow]`, `[onUiLock]` | `target` *(getter)*, `position` *(getter)*, `update(pos)`, `animateIn()`, `animateOut()` |
| `PointInfo` | `[data]` (`{ name, type }`), `[targetNumbers]`, `[onContainerHover]` | `animateIn()`, `animateOut()`, `open()`, `close()`, `lock()`, `unlock()`, `enable()`, `disable()` |
| `Progress` | `[size=32]`, `[progress]` (0–1), `[onComplete]` | `animateIn()`, `animateOut(callback)` |
| `ProgressCanvas` | `[size=32]`, `[progress]` (0–1), `[onComplete]` | `animateIn()`, `animateOut(callback)` |
| `Reticle` | `[data]` (`{ primary, secondary }`) | `update(pos)`, `animateIn()`, `animateOut()` |
| `ReticleCanvas` | `[context]` | `position` *(getter)*, `setContext(ctx)`, `update(pos)`, `animateIn()`, `animateOut()` |
| `ReticleInfo` | `[data]` (`{ primary, secondary }`) | `animateIn()`, `animateOut()` |
| `TargetNumber` | `[targetNumber]`, `[style]` | `animateIn(delay)`, `animateOut(fast)` |
| `Thumbnail` | `[image]`, `[width=150]`, `[height=100]`, `[snapMargin=20]`, `[breakpoint=1024]`, `[position='tl']` | `animateIn()` |
| `Tracker` | `[noCorners=false]`, `[data]` (`{ targetNumber, primary, secondary }`) | `update(pos)`, `lock()`, `unlock()`, `show()`, `hide()` |

---

### `graphs` — 2-D line / bar graphs and meters

Replaces `lib/ui/`: Graph, GraphLabel, GraphMarker, GraphSegments, Meter.

| Component | Props | `ref` methods |
|---|---|---|
| `Graph` | *(children)* | `animateIn()` |
| `GraphLabel` | `name` *(required)* | *(forwards ref to DOM element; exposes `element`, `css`, `tween`, `clearTween`)* |
| `GraphMarker` | `[onUpdate]` (`{ dragging, target }`), `[onClick]` (`{ target }`) | — |
| `GraphSegments` | `[lookupPrecision=0]`, `[range=1]` | `animateIn()` |
| `Meter` | `[format]` | `animateIn()` |

---

### `radial` — radial / polar graphs

Replaces `lib/ui/`: RadialGraph, RadialGraphCanvas, RadialGraphContainer,
RadialGraphSegments, RadialGraphSegmentsCanvas, RadialGraphTracker.

| Component | Props | `ref` methods |
|---|---|---|
| `RadialGraph` | `[value]`, `[ghost]`, `[width=300]`, `[height=300]`, `[start=0]`, `[graphHeight=60]`, … (18+ props) | — |
| `RadialGraphCanvas` | `[value]`, `[ghost]`, `[start=0]`, `[graphHeight=60]`, `[resolution=80]`, `[tension=6]`, … (17+ props) | — |
| `RadialGraphContainer` | `[start=0]`, `[graphHeight=60]`, `[graphRefs=[]]`, `[onCursor]`, `[children]` | `setSize(w,h)`, `setIndex(i)`, `setContext(ctx)`, … |
| `RadialGraphSegments` | `[value]`, `[ghost]`, `[width=300]`, `[height=300]`, `[start=0]`, `[graphHeight=60]`, … (23+ props) | — |
| `RadialGraphSegmentsCanvas` | `[value]`, `[ghost]`, `[start=0]`, `[graphHeight=60]`, `[resolution=80]`, `[tension=6]`, … (22+ props) | — |
| `RadialGraphTracker` | *(minimal)* | `update(pos)`, `lock()`, `unlock()`, `open()`, … |

---

### `panels` — debug / control panels

Replaces `lib/panels/`: ColorPicker, Content, List, ListSelect, ListToggle,
Panel, PanelGraph, PanelItem, PanelLink, PanelMeter, PanelThumbnail, Slider,
Toggle.

| Component | Props | `ref` methods |
|---|---|---|
| `ColorPicker` | `[onChange]` (`{ path, value: Color, target }`) | `setValue(v)`, `setHSL(h,s,l)`, `open()`, `close()` |
| `Content` | `[onChange]`, `[children]` | — |
| `List` | `[onChange]` (`{ path, index, value, target }`), `[children]` | `setIndex(i)`, `setValue(v)`, `setList(arr)`, `toggleContent()` |
| `ListSelect` | `list` *(required)*, `[onClick]` | `setList(arr)`, `setIndex(i)` |
| `ListToggle` | `name` *(required)*, `index` *(required)*, `onClick` *(required)* | `activate()`, `deactivate()` |
| `Panel` | *(children)* | `animateIn(callback)` |
| `PanelGraph` | `[format]`, `[callback]`, `[children]` | `enable()`, `disable()`, `setRange(min,max)`, `setArray(arr)`, `setGhostArray(arr)`, `setValue(v)`, `update()` |
| `PanelItem` | `[onChange]` | `animateIn()`, `animateOut()` |
| `PanelLink` | `[onChange]` (`{ path, value, target }`) | `setValue(v)` |
| `PanelMeter` | `[format]`, `[callback]`, `[children]` | `enable()`, `disable()`, `setRange(min,max)`, `setGhostValue(v)`, `setValue(v)` |
| `PanelThumbnail` | `[onChange]`, `[children]` | `setValue(v)`, `setData(d)`, `toggleContent()` |
| `Slider` | `[onChange]`, `[children]` | `setValue(v)`, `toggleContent()` |
| `Toggle` | `[onChange]`, `[children]` | `setValue(v)`, `toggleContent()` |

---

### `ui` — top-level composite

Replaces `lib/ui/UI.js`.

| Component | Props | `ref` methods |
|---|---|---|
| `UI` | `[fps=false]`, `[fpsOpen=false]`, `[detailsButton]`, `[onDetails]`, `[onUI]` | `animateIn()`, `animateOut()`, `toggleDetails()`, `addPanel(item)`, `getPanelIndex(path)`, `getPanelValue(path)`, `setPanelIndex(path,i)`, `setPanelValue(path,v)`, `invert()`, `update()` |

---

## Motion and hooks surface

Also re-exported from `src/space/index.js`:

### `motion/`

| Export | Description |
|---|---|
| `useAnimation(initial)` | `[ref, controls]` — CSS/transform animation. `controls.set(props)`, `controls.animate(props, dur, ease, delay?, complete?)`, `controls.stop()`. |
| `useMotion(initial)` | `{ values, animate, stop }` — plain-number tween for canvas/SVG. No re-renders. |
| `useTicker(callback, enabled?)` | Subscribe `callback` to the shared render loop. |
| `useDelayedCall()` | Returns `(duration, callback)` — all pending calls cancelled on unmount. |
| `drawLine(element, progress, start, offset)` | Sets `strokeDasharray`/`strokeDashoffset` on SVG geometry. |
| `applyStyle`, `getStyleValue`, `createStyleState`, `isTransformStyle` | Low-level style helpers (rarely needed by consumers). |

### `hooks/`

| Export | Description |
|---|---|
| `useEventListener(target, type, handler)` | Subscribes and auto-cleans up a DOM event listener. |
| `useResize(callback)` | Fires `callback` on mount and on `window.resize`. |
| `useMagnetic(strength?, duration?, ease?)` | Returns a `ref` — attaches magnetic follow behaviour to the element. |

