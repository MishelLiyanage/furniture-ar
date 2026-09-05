import * as THREE from 'three';

// Touch gestures for the markerless AR view:
//   - Drag starting ON the furniture   = grab-and-drag reposition (plays a drop thud)
//   - Drag starting on empty background = rotate
//   - Tap on empty background (no drag) = jump-relocate, handled by the XR "select"
//     event in markerless.js — this module only needs to suppress it after a drag.
//   - Two-finger pinch                  = resize
//
// initDragDrop(state) wires everything up against a shared state object owned by
// markerless.js: { camera, modelGroup, currentMeshNode, placed, currentRotationY,
// currentScale, suppressNextSelect, playThud }.

var ROTATE_SPEED = 0.008;
var MIN_SCALE = 0.4;
var MAX_SCALE = 2.5;

export function initDragDrop(state) {
    var gestureMoved = false;
    var pinchStartDist = 0;
    var pinchStartScale = 1;
    var lastSingleX = 0;
    var draggingFurniture = false;

    var raycaster = new THREE.Raycaster();
    var dragPlane = new THREE.Plane();
    var dragOffset = new THREE.Vector3();
    var planeIntersect = new THREE.Vector3();

    function isUiTarget(target) {
        return !!(target.closest && target.closest("#topbar, #bottom-panel"));
    }

    function touchDist(t0, t1) {
        var dx = t0.clientX - t1.clientX;
        var dy = t0.clientY - t1.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function touchToNDC(touch) {
        return new THREE.Vector2(
            (touch.clientX / window.innerWidth) * 2 - 1,
            -(touch.clientY / window.innerHeight) * 2 + 1
        );
    }

    function hitsFurniture(touch) {
        if (!state.currentMeshNode) return false;
        raycaster.setFromCamera(touchToNDC(touch), state.camera);
        if (raycaster.intersectObject(state.currentMeshNode, true).length > 0) return true;
        // Forgiving fallback: also count a tap within the furniture's bounding box,
        // since gappy geometry (e.g. chair legs) can otherwise be hard to grab precisely.
        var box = new THREE.Box3().setFromObject(state.modelGroup);
        return raycaster.ray.intersectBox(box, planeIntersect) !== null;
    }

    document.addEventListener("touchstart", function (e) {
        if (!document.body.classList.contains("ar-active") || !state.placed) return;
        if (isUiTarget(e.target)) return;
        gestureMoved = false;

        if (e.touches.length === 1) {
            if (hitsFurniture(e.touches[0])) {
                draggingFurniture = true;
                dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), state.modelGroup.position);
                raycaster.setFromCamera(touchToNDC(e.touches[0]), state.camera);
                if (raycaster.ray.intersectPlane(dragPlane, planeIntersect)) {
                    dragOffset.copy(planeIntersect).sub(state.modelGroup.position);
                } else {
                    dragOffset.set(0, 0, 0);
                }
            } else {
                draggingFurniture = false;
                lastSingleX = e.touches[0].clientX;
            }
        } else if (e.touches.length === 2) {
            draggingFurniture = false;
            pinchStartDist = touchDist(e.touches[0], e.touches[1]);
            pinchStartScale = state.currentScale;
        }
    }, { passive: true });

    document.addEventListener("touchmove", function (e) {
        if (!document.body.classList.contains("ar-active") || !state.placed) return;
        if (isUiTarget(e.target)) return;

        if (e.touches.length === 1) {
            if (draggingFurniture) {
                raycaster.setFromCamera(touchToNDC(e.touches[0]), state.camera);
                if (raycaster.ray.intersectPlane(dragPlane, planeIntersect)) {
                    state.modelGroup.position.copy(planeIntersect).sub(dragOffset);
                    gestureMoved = true;
                }
                e.preventDefault();
            } else {
                var x = e.touches[0].clientX;
                var dx = x - lastSingleX;
                if (Math.abs(dx) > 1) {
                    state.currentRotationY += dx * ROTATE_SPEED;
                    state.modelGroup.rotation.y = state.currentRotationY;
                    lastSingleX = x;
                    gestureMoved = true;
                    e.preventDefault();
                }
            }
        } else if (e.touches.length === 2) {
            var dist = touchDist(e.touches[0], e.touches[1]);
            if (pinchStartDist > 0) {
                var scale = pinchStartScale * (dist / pinchStartDist);
                state.currentScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
                state.modelGroup.scale.setScalar(state.currentScale);
            }
            gestureMoved = true;
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener("touchend", function (e) {
        if (gestureMoved) {
            state.suppressNextSelect = true;
            if (draggingFurniture) state.playThud();
        }
        if (e.touches.length === 0) {
            gestureMoved = false;
            draggingFurniture = false;
        } else if (e.touches.length === 1) {
            lastSingleX = e.touches[0].clientX;
            draggingFurniture = false;
        }
    }, { passive: true });

    document.addEventListener("touchcancel", function () {
        gestureMoved = false;
        draggingFurniture = false;
    }, { passive: true });
}
