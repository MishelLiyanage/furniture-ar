import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { initDragDrop } from './drag-drop.js';

var MODELS = [
    { key: "chair_1", label: "Chair 1", assetPath: "assets/models/chair_1.glb" },
    { key: "rocking_chair", label: "Rocking Chair", assetPath: "assets/models/rocking_chair.glb" },
    { key: "chair_small", label: "Chair (Small)", assetPath: "assets/models/chair_small.glb" },
    { key: "adjustable_desk", label: "Adj. Desk", assetPath: "assets/models/adjustable_desk.glb" },
    { key: "coffee_table", label: "Coffee Table", assetPath: "assets/models/coffee_table.glb" },
    { key: "folding_table", label: "Folding Table", assetPath: "assets/models/folding_table.glb" }
];

var HINT_FIND_SURFACE = "&#128205; Move your phone to find a surface, then tap to place";
var HINT_MOVE = "&#128070; Drag it to move &middot; drag elsewhere to rotate &middot; pinch to resize";

var viewer = document.getElementById("viewer");
var picker = document.getElementById("model-picker");
var unsupported = document.getElementById("ar-unsupported");
var startArBtn = document.getElementById("start-ar-btn");
var arHint = document.getElementById("ar-hint");
var arCanvas = document.getElementById("ar-canvas");
var backBtn = document.getElementById("back-btn");
var resetBtn = document.getElementById("reset-btn");
var muteBtn = document.getElementById("mute-btn");

var currentModel = MODELS[0];

// Shared mutable state consumed by drag-drop.js's gesture handlers.
var state = {
    camera: null,
    modelGroup: null,
    currentMeshNode: null,
    placed: false,
    currentRotationY: 0,
    currentScale: 1,
    suppressNextSelect: false,
    playThud: function () { }
};

initDragDrop(state);

MODELS.forEach(function (model, index) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = model.label;
    btn.addEventListener("click", function () {
        currentModel = model;
        viewer.setAttribute("src", model.assetPath);
        Array.prototype.forEach.call(picker.children, function (b) {
            b.classList.remove("active");
        });
        btn.classList.add("active");
        state.currentRotationY = 0;
        state.currentScale = 1;
        loadModelInto(model.assetPath);
    });
    picker.appendChild(btn);
    if (index === 0) btn.classList.add("active");
});

backBtn.addEventListener("click", function () {
    if (xrSession) {
        xrSession.end();
    } else {
        window.location.href = "index.html";
    }
});

// ── Three.js WebXR hit-test AR setup ──────────────────────────
var renderer = null;
var scene = null;
var reticle = null;
var shadowBlob = null;
var listener = null;
var thudAudio = null;
var muted = false;
var gltfLoader = new GLTFLoader();
var xrSession = null;
var hitTestSource = null;
var hitTestSourceRequested = false;

function setPlaced(value) {
    state.placed = value;
    document.body.classList.toggle("placed", value);
    arHint.innerHTML = value ? HINT_MOVE : HINT_FIND_SURFACE;
}

function initThree() {
    renderer = new THREE.WebGLRenderer({ canvas: arCanvas, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.xr.enabled = true;

    scene = new THREE.Scene();
    state.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    var hemiLight = new THREE.HemisphereLight(0xffffff, 0x444466, 0.9);
    scene.add(hemiLight);
    var dirLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight1.position.set(1, 2, 1);
    scene.add(dirLight1);
    var dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight2.position.set(-1, 0.5, -1);
    scene.add(dirLight2);

    reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x2e86de })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    state.modelGroup = new THREE.Group();
    state.modelGroup.visible = false;
    scene.add(state.modelGroup);

    shadowBlob = new THREE.Mesh(
        new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: createBlobTexture(), transparent: true, depthWrite: false })
    );
    shadowBlob.position.y = 0.002;
    shadowBlob.renderOrder = -1;
    state.modelGroup.add(shadowBlob);

    setupAudio();

    window.addEventListener("resize", function () {
        if (!renderer) return;
        state.camera.aspect = window.innerWidth / window.innerHeight;
        state.camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// ── Fake contact shadow (soft radial blob under the furniture) ──
function createBlobTexture() {
    var size = 128;
    var canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    var ctx = canvas.getContext("2d");
    var gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(0,0,0,0.7)");
    gradient.addColorStop(0.6, "rgba(0,0,0,0.4)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
}

// ── Distance-based positional audio (synthesized, no external files) ──
function createThudBuffer(context) {
    var duration = 0.35;
    var sampleRate = context.sampleRate;
    var length = Math.floor(sampleRate * duration);
    var buffer = context.createBuffer(1, length, sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < length; i++) {
        var t = i / sampleRate;
        var envelope = Math.exp(-t * 18);
        var tone = Math.sin(2 * Math.PI * 100 * t) * envelope * 0.8;
        var click = (Math.random() * 2 - 1) * Math.exp(-t * 90) * 0.5;
        data[i] = Math.max(-1, Math.min(1, tone + click));
    }
    return buffer;
}

function setupAudio() {
    listener = new THREE.AudioListener();
    state.camera.add(listener);

    thudAudio = new THREE.PositionalAudio(listener);
    // Tuned for a pronounced near/far difference within room-scale distances:
    // full volume within 0.4m, audibly quieter by a couple of metres, faint past ~6m.
    thudAudio.setRefDistance(0.4);
    thudAudio.setMaxDistance(10);
    thudAudio.setRolloffFactor(3);
    thudAudio.setDistanceModel("inverse");
    thudAudio.setBuffer(createThudBuffer(listener.context));
    thudAudio.setVolume(1);
    state.modelGroup.add(thudAudio);
}

function playThud() {
    if (!thudAudio) return;
    if (thudAudio.isPlaying) thudAudio.stop();
    thudAudio.play();
}
state.playThud = playThud;

muteBtn.addEventListener("click", function () {
    muted = !muted;
    if (listener) listener.setMasterVolume(muted ? 0 : 1);
    muteBtn.innerHTML = muted ? "&#128263;" : "&#128266;";
    muteBtn.classList.toggle("muted", muted);
});

function loadModelInto(assetPath) {
    gltfLoader.load(assetPath, function (gltf) {
        if (!state.modelGroup) return;

        // Measure the mesh's own bounding box BEFORE parenting it, while it still
        // has an identity transform — otherwise this would return world-space
        // bounds distorted by modelGroup's current position/rotation/scale.
        var box = new THREE.Box3().setFromObject(gltf.scene);
        var size = box.getSize(new THREE.Vector3());
        var center = box.getCenter(new THREE.Vector3());
        // The blob geometry is a unit circle rotated flat: its own X maps to world X,
        // and its own Y (pre-rotation) maps to world Z — so X/Z need separate scale
        // factors to make an oval that matches the furniture's actual footprint shape
        // and orientation, rather than a uniform circle.
        var footprintX = Math.max(0.28, Math.min(size.x * 0.9, 1.4));
        var footprintZ = Math.max(0.28, Math.min(size.z * 0.9, 1.4));

        if (state.currentMeshNode) {
            state.modelGroup.remove(state.currentMeshNode);
        }
        state.currentMeshNode = gltf.scene;
        state.modelGroup.add(state.currentMeshNode);

        // Many downloaded GLTF assets have their pivot at the bounding-box centre
        // rather than at the object's visual base, which is why the shadow used to
        // float up near seat/backrest height instead of sitting under the legs.
        // Anchor it to the mesh's true footprint centre and lowest point instead.
        shadowBlob.position.set(center.x, box.min.y + 0.006, center.z);
        shadowBlob.scale.set(footprintX, 1, footprintZ);
    }, undefined, function (err) {
        console.error("Failed to load model", assetPath, err);
    });
}

var _pos = new THREE.Vector3();
var _quat = new THREE.Quaternion();
var _scl = new THREE.Vector3();

function onSelect() {
    if (state.suppressNextSelect) {
        state.suppressNextSelect = false;
        return;
    }
    if (!reticle.visible) return;
    reticle.matrix.decompose(_pos, _quat, _scl);
    state.modelGroup.position.copy(_pos);
    state.modelGroup.rotation.set(0, state.currentRotationY, 0);
    state.modelGroup.scale.setScalar(state.currentScale);
    state.modelGroup.visible = true;
    setPlaced(true);
    playThud();
}

resetBtn.addEventListener("click", function () {
    if (!state.modelGroup) return;
    state.modelGroup.visible = false;
    state.currentRotationY = 0;
    state.currentScale = 1;
    setPlaced(false);
});

function onXRFrame(timestamp, frame) {
    var session = frame.session;
    var referenceSpace = renderer.xr.getReferenceSpace();

    if (!hitTestSourceRequested) {
        hitTestSourceRequested = true;
        session.requestReferenceSpace("viewer").then(function (viewerSpace) {
            session.requestHitTestSource({ space: viewerSpace }).then(function (source) {
                hitTestSource = source;
            });
        });
        session.addEventListener("end", function () {
            hitTestSourceRequested = false;
            hitTestSource = null;
        });
    }

    if (hitTestSource) {
        var hitTestResults = frame.getHitTestResults(hitTestSource);
        if (hitTestResults.length) {
            var hit = hitTestResults[0];
            var pose = hit.getPose(referenceSpace);
            reticle.visible = true;
            reticle.matrix.fromArray(pose.transform.matrix);
        } else {
            reticle.visible = false;
        }
    }

    renderer.render(scene, state.camera);
}

async function startAR() {
    if (!renderer) initThree();
    if (listener && listener.context.state === "suspended") {
        listener.context.resume();
    }

    state.modelGroup.visible = false;
    reticle.visible = false;
    state.currentRotationY = 0;
    state.currentScale = 1;
    setPlaced(false);
    loadModelInto(currentModel.assetPath);

    try {
        xrSession = await navigator.xr.requestSession("immersive-ar", {
            requiredFeatures: ["hit-test"],
            optionalFeatures: ["dom-overlay", "local-floor"],
            domOverlay: { root: document.body }
        });
    } catch (err) {
        console.error("Failed to start AR session", err);
        unsupported.style.display = "block";
        return;
    }

    document.body.classList.add("ar-active");
    await renderer.xr.setSession(xrSession);

    xrSession.addEventListener("select", onSelect);
    xrSession.addEventListener("end", function () {
        document.body.classList.remove("ar-active");
        setPlaced(false);
        xrSession = null;
        renderer.setAnimationLoop(null);
    });

    renderer.setAnimationLoop(onXRFrame);
}

startArBtn.addEventListener("click", function () {
    startAR();
});

if (navigator.xr && navigator.xr.isSessionSupported) {
    navigator.xr.isSessionSupported("immersive-ar").then(function (supported) {
        if (!supported) {
            startArBtn.disabled = true;
            unsupported.style.display = "block";
        }
    }).catch(function () {
        startArBtn.disabled = true;
        unsupported.style.display = "block";
    });
} else {
    startArBtn.disabled = true;
    unsupported.style.display = "block";
}
