import { lazy } from 'react';

export const groups = {
    ui: 'UI',
    fps: 'FPS',
    graphs: 'Graphs & Panels',
    audio: 'Audio',
    tests: 'Tests',
    three: '3D'
};

export const examples = [
    {
        path: '/examples/alienkitty',
        title: 'Alien Kitty',
        group: 'ui',
        Component: lazy(() => import('./ui/Alienkitty.jsx'))
    },
    {
        path: '/examples/alienkitty_canvas',
        title: 'Alien Kitty',
        group: 'ui',
        Component: lazy(() => import('./ui/AlienkittyCanvas.jsx'))
    },
    {
        path: '/examples/close',
        title: 'Close',
        group: 'ui',
        Component: lazy(() => import('./ui/Close.jsx'))
    },
    {
        path: '/examples/details',
        title: 'Details',
        group: 'ui',
        Component: lazy(() => import('./ui/Details.jsx'))
    },
    {
        path: '/examples/details_info',
        title: 'Details Info',
        group: 'ui',
        Component: lazy(() => import('./ui/DetailsInfo.jsx'))
    },
    {
        path: '/examples/details_server_status',
        title: 'Details Server Status',
        group: 'ui',
        Component: lazy(() => import('./ui/DetailsServerStatus.jsx'))
    },
    {
        path: '/examples/logo',
        title: 'Logo',
        group: 'ui',
        Component: lazy(() => import('./ui/Logo.jsx'))
    },
    {
        path: '/examples/magnetic',
        title: 'Magnetic',
        group: 'ui',
        Component: lazy(() => import('./ui/Magnetic.jsx'))
    },
    {
        path: '/examples/progress',
        title: 'Progress',
        group: 'ui',
        Component: lazy(() => import('./ui/Progress.jsx'))
    },
    {
        path: '/examples/progress_canvas',
        title: 'Progress',
        group: 'ui',
        Component: lazy(() => import('./ui/ProgressCanvas.jsx'))
    },
    {
        path: '/examples/progress_indeterminate',
        title: 'Indeterminate Progress',
        group: 'ui',
        Component: lazy(() => import('./ui/ProgressIndeterminate.jsx'))
    },
    {
        path: '/examples/thread_canvas',
        title: 'Canvas Thread',
        group: 'ui',
        Component: lazy(() => import('./ui/ThreadCanvas.jsx'))
    },
    {
        path: '/examples/thumbnail',
        title: 'Thumbnail',
        group: 'ui',
        Component: lazy(() => import('./ui/Thumbnail.jsx'))
    },
    {
        path: '/examples/tween',
        title: 'Tween',
        group: 'ui',
        Component: lazy(() => import('./ui/Tween.jsx'))
    },
    {
        path: '/examples/ui',
        title: 'UI',
        group: 'ui',
        Component: lazy(() => import('./ui/Ui.jsx'))
    },
    {
        path: '/examples/ui_audio',
        title: 'UI Audio',
        group: 'ui',
        Component: lazy(() => import('./ui/UiAudio.jsx'))
    },
    {
        path: '/examples/ui_components',
        title: 'UI Components',
        group: 'ui',
        Component: lazy(() => import('./ui/UiComponents.jsx'))
    },
    {
        path: '/examples/fps',
        title: 'FPS',
        group: 'fps',
        Component: lazy(() => import('./fps/Fps.jsx'))
    },
    {
        path: '/examples/fps_graph',
        title: 'FPS Graph',
        group: 'fps',
        Component: lazy(() => import('./fps/FpsGraph.jsx'))
    },
    {
        path: '/examples/fps_meter',
        title: 'FPS Meter',
        group: 'fps',
        Component: lazy(() => import('./fps/FpsMeter.jsx'))
    },
    {
        path: '/examples/fps_panel',
        title: 'FPS Panel',
        group: 'fps',
        Component: lazy(() => import('./fps/FpsPanel.jsx'))
    },
    {
        path: '/examples/graph',
        title: 'Standalone Graph',
        group: 'graphs',
        Component: lazy(() => import('./graphs/Graph.jsx'))
    },
    {
        path: '/examples/graph_markers',
        title: 'Graph Markers',
        group: 'graphs',
        Component: lazy(() => import('./graphs/GraphMarkers.jsx'))
    },
    {
        path: '/examples/meter',
        title: 'Standalone Meter',
        group: 'graphs',
        Component: lazy(() => import('./graphs/Meter.jsx'))
    },
    {
        path: '/examples/panel',
        title: 'Standalone Panel',
        group: 'graphs',
        Component: lazy(() => import('./graphs/Panel.jsx'))
    },
    {
        path: '/examples/radial_graph',
        title: 'Standalone Radial Graph',
        group: 'graphs',
        Component: lazy(() => import('./graphs/RadialGraph.jsx'))
    },
    {
        path: '/examples/audio_gong',
        title: 'Gong',
        group: 'audio',
        Component: lazy(() => import('./audio/AudioGong.jsx'))
    },
    {
        path: '/examples/audio_radial_graph',
        title: 'Analyser Radial Graph',
        group: 'audio',
        Component: lazy(() => import('./audio/AudioRadialGraph.jsx'))
    },
    {
        path: '/examples/audio_rhythm',
        title: 'Rhythm',
        group: 'audio',
        Component: lazy(() => import('./audio/AudioRhythm.jsx'))
    },
    {
        path: '/examples/audio_stream',
        title: 'Stream',
        group: 'audio',
        Component: lazy(() => import('./audio/AudioStream.jsx'))
    },
    {
        path: '/examples/test_cluster',
        title: 'Cluster',
        group: 'tests',
        Component: lazy(() => import('./tests/TestCluster.jsx'))
    },
    {
        path: '/examples/test_fps',
        title: 'FPS',
        group: 'tests',
        Component: lazy(() => import('./tests/TestFps.jsx'))
    },
    {
        path: '/examples/test_graph',
        title: 'Graph',
        group: 'tests',
        Component: lazy(() => import('./tests/TestGraph.jsx'))
    },
    {
        path: '/examples/test_graph_segments',
        title: 'Graph Segments',
        group: 'tests',
        Component: lazy(() => import('./tests/TestGraphSegments.jsx'))
    },
    {
        path: '/examples/test_interface',
        title: 'Interface',
        group: 'tests',
        Component: lazy(() => import('./tests/TestInterface.jsx'))
    },
    {
        path: '/examples/test_linkedlist',
        title: 'Linked List',
        group: 'tests',
        Component: lazy(() => import('./tests/TestLinkedlist.jsx'))
    },
    {
        path: '/examples/test_meter',
        title: 'Meter',
        group: 'tests',
        Component: lazy(() => import('./tests/TestMeter.jsx'))
    },
    {
        path: '/examples/test_objectpool',
        title: 'Object Pool',
        group: 'tests',
        Component: lazy(() => import('./tests/TestObjectpool.jsx'))
    },
    {
        path: '/examples/test_panel',
        title: 'Panel',
        group: 'tests',
        Component: lazy(() => import('./tests/TestPanel.jsx'))
    },
    {
        path: '/examples/test_radial_graph',
        title: 'Radial Graph',
        group: 'tests',
        Component: lazy(() => import('./tests/TestRadialGraph.jsx'))
    },
    {
        path: '/examples/test_radial_graph_segments',
        title: 'Radial Graph Segments',
        group: 'tests',
        Component: lazy(() => import('./tests/TestRadialGraphSegments.jsx'))
    },
    {
        path: '/examples/test_router',
        title: 'Router',
        group: 'tests',
        Component: lazy(() => import('./tests/TestRouter.jsx'))
    },
    {
        path: '/examples/test_sound',
        title: 'Sound',
        group: 'tests',
        Component: lazy(() => import('./tests/TestSound.jsx'))
    },
    {
        path: '/examples/test_stream',
        title: 'Stream',
        group: 'tests',
        Component: lazy(() => import('./tests/TestStream.jsx'))
    },
    {
        path: '/examples/test_svg_path_properties',
        title: 'SVG Path Properties',
        group: 'tests',
        Component: lazy(() => import('./tests/TestSvgPathProperties.jsx'))
    },
    {
        path: '/examples/test_ticker',
        title: 'Ticker',
        group: 'tests',
        Component: lazy(() => import('./tests/TestTicker.jsx'))
    },
    {
        path: '/examples/test_tween',
        title: 'Tween',
        group: 'tests',
        Component: lazy(() => import('./tests/TestTween.jsx'))
    },
    {
        path: '/examples/three/3d_lights',
        title: 'Lights',
        group: 'three',
        Component: lazy(() => import('./three/Lights.jsx'))
    },
    {
        path: '/examples/three/3d_materials',
        title: 'Materials',
        group: 'three',
        Component: lazy(() => import('./three/Materials.jsx'))
    },
    {
        path: '/examples/three/3d_materials_instancing',
        title: 'Materials Instancing',
        group: 'three',
        Component: lazy(() => import('./three/MaterialsInstancing.jsx'))
    },
    {
        path: '/examples/three/3d_materials_instancing_modified',
        title: 'Materials Instancing Modified',
        group: 'three',
        Component: lazy(() => import('./three/MaterialsInstancingModified.jsx'))
    },
    {
        path: '/examples/three/3d_materials_spherical_cube',
        title: 'Materials Spherical Cube',
        group: 'three',
        Component: lazy(() => import('./three/MaterialsSphericalCube.jsx'))
    },
    {
        path: '/examples/three/3d_radial_graph',
        title: 'Radial Graph',
        group: 'three',
        Component: lazy(() => import('./three/RadialGraph.jsx'))
    },
    {
        path: '/examples/three/3d_server_status',
        title: 'Server Status',
        group: 'three',
        Component: lazy(() => import('./three/ServerStatus.jsx'))
    },
    {
        path: '/examples/three/3d_server_status_thread',
        title: 'Server Status Thread',
        group: 'three',
        Component: lazy(() => import('./three/ServerStatusThread.jsx'))
    }
];
