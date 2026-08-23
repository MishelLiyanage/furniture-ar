# Furniture AR Viewer

An interactive WebXR/WebAR experience that lets users view furniture in augmented reality — either by scanning a catalog marker image or by placing 3D furniture models directly in their own room using markerless spatial tracking.

Built for **INTE 42312 – Virtual and Augmented Reality** individual assignment.

---

## Features

- **Marker-Based AR** — Scan a custom catalog image to anchor a rotating 3D furniture model, powered by MindAR's natural feature tracking.
- **Markerless AR** — Detect real-world floor surfaces via WebXR hit-testing and place furniture models anywhere in your physical space.
- **Drag-and-Drop Interaction** — Reposition placed furniture in real time by dragging it across the detected surface.
- **Collision Detection** — Placed items detect overlap with one another and trigger a visual response.
- **Two Furniture Categories** — Chair and table models, optimized for fast mobile loading.
- **Lighting & Animation** — Ambient and directional lighting with idle rotation animation on marker-anchored models.

---

## Live Demo

- **Hosted App:** [add your Netlify/Vercel URL here]
- **Demo Video:** [add your 3-minute demo link here]

---

## Tech Stack

| Component | Technology |
|---|---|
| Framework | A-Frame 1.5.0 |
| Marker-Based Tracking | MindAR (image target tracking) |
| Markerless Tracking | WebXR Device API (hit-test) |
| 3D Models | glTF/.glb, optimized with gltf-transform |
| Hosting | Netlify / Vercel |

---

## Project Structure

```
furniture-ar/
├── index.html              # Landing page — mode selector
├── marker.html              # Marker-based AR scene (MindAR)
├── markerless.html           # Markerless AR scene (WebXR hit-test + drag-drop)
├── assets/
│   ├── models/
│   │   ├── chair1.glb
│   │   ├── chair2.glb
│   │   ├── chair3.glb
│   │   ├── table1.glb
│   │   ├── table2.glb
│   │   └── table3.glb
│   └── markers/
│       └── targets.mind      # Compiled MindAR image target
├── js/
│   ├── drag-drop.js          # Raycasting-based drag interaction
│   └── collision.js          # Bounding-box collision detection
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js and npm installed
- A modern browser with camera access (Chrome on Android, Safari on iOS)
- HTTPS hosting for mobile testing (camera access requires it)

### Local Setup

1. Clone the repository:
   ```bash
   git clone [your-repo-url]
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

4. Open the local URL shown in your terminal (desktop testing works over HTTP; mobile testing requires HTTPS — see Deployment below).

### Deployment

1. Push the project to a GitHub repository.
2. Connect the repo to [Netlify](https://netlify.com) or [Vercel](https://vercel.com), or drag-and-drop the project folder onto [netlify.com/drop](https://app.netlify.com/drop).
3. Open the generated HTTPS URL on a mobile device and grant camera permissions when prompted.

---

## How to Use

### Marker-Based Mode
1. From the landing page, tap **"Scan Catalog"**.
2. Point your camera at the printed/displayed catalog marker image.
3. A 3D furniture model appears anchored to the marker, rotating for a full view.

### Markerless Mode
1. From the landing page, tap **"Place in My Room"**.
2. Slowly move your phone to scan a flat surface (floor).
3. Once a reticle appears, tap to place a furniture model at that spot.
4. Drag placed items to reposition them; overlapping items trigger a collision indicator.
5. Use **Reset** to clear the scene and start over.

---

## Known Technical Challenges

*(Fill this in as you encounter and solve real issues during development — this section is required in the technical report and strengthens your Documentation & Troubleshooting marks.)*

| Challenge | Solution |
|---|---|
| e.g., Model appeared invisible after MindAR integration | e.g., Adjusted scale from AR.js-appropriate values (0.3) down to MindAR's expected range (0.05) |
| e.g., WebXR hit-test unsupported on iOS Safari | e.g., Documented as a known limitation; tested primarily on Chrome Android |
| ... | ... |

---

## Assets & Credits

- 3D Models: [source, e.g. Sketchfab / Poly Pizza — list each model and its license]
- Marker Image: Custom-designed, compiled via MindAR image target compiler
- Frameworks: [A-Frame](https://aframe.io/), [MindAR](https://hiukim.github.io/mind-ar-js-doc/)

---

## Author

[Your name]
[Course / Module code: INTE 42312]
[Submission date]
