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
