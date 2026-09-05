# Furniture AR Viewer

An interactive WebXR/WebAR experience that lets users view furniture in augmented reality — either by scanning a catalog marker image or by placing 3D furniture models directly in their own room using markerless spatial tracking.

Built for **INTE 42312 – Virtual and Augmented Reality** individual assignment.

---

## Live Demo

- **Hosted App:** https://mishelliyanage.github.io/furniture-ar/
- **Repository:** https://github.com/MishelLiyanage/furniture-ar
- **Demo Video:** *(add link if available)*

---

## Features

- **Marker-Based AR** — Scan a custom catalog image to anchor a rotating 3D furniture model, powered by MindAR's natural feature tracking, with on-screen size +/- controls.
- **Markerless AR** — Detect real-world surfaces via the raw WebXR Device API hit-test and place furniture true-to-scale anywhere in your physical space, built directly on Three.js (no A-Frame or third-party hit-test component).
- **Four-gesture manipulation (markerless mode)** — tap an open surface to relocate the placed item; drag directly on the furniture to reposition it in real time; drag on empty background to rotate it; pinch with two fingers to resize it within clamped bounds.
- **Distance-based placement audio** — a placement "thud" is synthesized procedurally with the Web Audio API (no external sound files) and played through `THREE.PositionalAudio`, so it's audibly louder up close and quieter from across the room.
- **Procedural contact shadow** — a soft radial-gradient shadow is generated on an in-memory canvas and sized/oriented per model from that GLTF's own bounding box, so it forms an oval matching each item's real footprint.
- **Six furniture models** — chairs, a rocking chair, an adjustable desk, a coffee table, and a folding table, optimized for fast mobile loading.
- **Lighting & animation** — ambient and directional lighting, with idle rotation animation on marker-anchored models.

---

## Tech Stack

| Component | Technology |
|---|---|
| Marker-based mode | A-Frame 1.5.0 + MindAR (`mindar-image-aframe`) |
| Markerless mode | Three.js (r160, via CDN import map) + raw WebXR Device API hit-test |
| Markerless gestures | Custom ES module (`js/drag-drop.js`), no third-party gesture library |
| Audio | Web Audio API via `THREE.AudioListener` / `THREE.PositionalAudio` — procedurally synthesized, no audio assets |
| 3D Models | glTF/.glb, optimized with `gltf-transform` |
| Hosting | GitHub Pages (deployed from `main`) |

> Note: marker mode and markerless mode are independent pipelines with no shared component layer — they were built separately to suit their very different tracking mechanisms (image-target anchoring vs. real-world plane detection).

---

## Project Structure

```
furniture-ar/
├── index.html                # Landing page + marker-based AR scene (A-Frame + MindAR)
├── markerless.html            # Markerless AR page (markup only)
├── css/
│   ├── index.css               # Styles for index.html
│   └── markerless.css           # Styles for markerless.html
├── js/
│   ├── markerless.js            # Core markerless AR: hit-test, placement, model loading, audio, shadow
│   └── drag-drop.js             # Touch gestures: rotate, pinch-resize, grab-and-drag reposition
├── assets/
│   ├── models/
│   │   ├── chair_1.glb
│   │   ├── rocking_chair.glb
│   │   ├── chair_small.glb
│   │   ├── adjustable_desk.glb
│   │   ├── coffee_table.glb
│   │   └── folding_table.glb
│   └── markers/
│       └── targets.mind        # Compiled MindAR image target
└── README.md
```

---

## Getting Started

### Prerequisites
- A modern browser with camera access
  - Marker-based mode: works on both Android Chrome and iOS Safari
  - Markerless mode: requires **Android Chrome with ARCore** (WebXR `immersive-ar` hit-test is not supported on iOS Safari)
- HTTPS hosting for mobile testing (camera and WebXR access both require a secure context)

### Local Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/MishelLiyanage/furniture-ar.git
   cd furniture-ar
   ```

2. Install a local server:
   ```bash
   npm install -g live-server
   ```

3. Run the project:
   ```bash
   live-server
   ```

4. Open the local URL shown in your terminal (desktop testing works over HTTP for marker mode's inline preview; mobile testing of either AR mode requires HTTPS — see Deployment below).

### Deployment

The app is deployed on **GitHub Pages** from the `main` branch:

1. Push/merge changes to `main`.
2. In the repository, go to **Settings → Pages** and confirm the source is set to **Deploy from a branch → `main` → `/ (root)`**.
3. Check the repository's **Actions** tab for the "pages build and deployment" run after each push — a red ❌ there (or a source misconfigured to "GitHub Actions" with no workflow file present) will silently prevent updates from appearing on the hosted URL even though the merge itself succeeded.

---

## How to Use

### Marker-Based Mode
1. From the landing page, tap **"Scan Catalog"**.
2. Point your camera at the printed/displayed catalog marker image.
3. A 3D furniture model appears anchored to the marker, rotating for a full view.
4. Use the size +/- buttons or the model picker to adjust scale or switch furniture.

### Markerless Mode
1. From the landing page, tap **"Place in My Room"**.
2. Tap **"View in your room"**, then slowly move your phone to scan a surface.
3. Once the reticle appears, tap to place the furniture there.
4. **Tap** elsewhere to relocate it, **drag directly on it** to reposition in real time, **drag empty background** to rotate it, or **pinch** to resize it.
5. Use the **Reset** button (top-right, appears once placed) to clear the current item and start over.

---

## Known Technical Challenges

| Challenge | Root Cause | Solution |
|---|---|---|
| Camera passthrough rendered solid black in the custom WebXR view | `THREE.WebGLRenderer` clears to opaque black by default even with `alpha: true` on the context, blocking Chrome's alpha-blend AR compositing | Explicit `renderer.setClearColor(0x000000, 0)` |
| Contact shadow appeared floating near the backrest instead of under the legs | Several downloaded GLTF assets have their pivot at the bounding-box centre, not the visual base — an inconsistency across third-party sources | Measure each mesh's own local bounding box before parenting it, and anchor the shadow to `box.min.y` and the box's horizontal centre instead of the model's raw origin |
| Shadow shape/size still wrong after the position fix | The shadow plane's Z-axis scale was hardcoded instead of using the computed footprint, so only its width scaled correctly | Mapped the model's bounding-box width/depth to the plane's respective local axes independently |
| Grab-and-drag reposition conflicted with the existing rotate gesture (both start as a one-finger drag) | No inherent way to know a touch's intent before it moves | Raycast at touch-start to classify the touch as "on the furniture" (reposition) vs. "on the background" (rotate); suppress the trailing tap-to-place event after any drag/pinch |
| Placement sound didn't play reliably | Mobile browsers require a user gesture before starting a Web Audio `AudioContext` | Resume/create the context inside the "View in your room" button's own click handler |
| WebXR hit-test unsupported on iOS Safari | The `immersive-ar` session type with hit-test is only reliably available on Android Chrome/ARCore | Documented as a known limitation; markerless mode falls back to a non-AR rotate-only preview with an "AR not available" message on unsupported devices |

---

## Assets & Credits

3D models sourced via [Poly Pizza](https://poly.pizza), openly licensed:

- **Adjustable Desk** by Jeff Cobesign — CC-BY 3.0
- **Folding Table** by S. Paul Michael — CC-BY 3.0
- **Coffee Table** by Francisco Hui — CC-BY 3.0
- **Chair** by Quaternius — Public Domain
- **Rocking Chair** by CreativeTrio
- **Chair (variant)** by Quaternius

Marker image: custom-designed, compiled via the MindAR image target compiler.

Frameworks/libraries: [A-Frame](https://aframe.io/), [MindAR](https://hiukim.github.io/mind-ar-js-doc/), [Three.js](https://threejs.org/), [model-viewer](https://modelviewer.dev/) (inline non-AR preview).

---

## Author

Mishel
Course / Module code: INTE 42312
