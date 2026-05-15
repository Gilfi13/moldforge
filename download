import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import Module from 'manifold-3d';
import type { ManifoldToplevel } from 'manifold-3d';

// ---------- Scene ----------
const canvasWrap = document.getElementById('canvas-wrap') as HTMLDivElement;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x1f1d1a, 1);
canvasWrap.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 5000);
camera.position.set(120, 100, 160);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.12;
controls.rotateSpeed = 0.7;
controls.zoomSpeed = 0.9;
controls.panSpeed = 0.8;
controls.screenSpacePanning = true;
controls.minDistance = 5;
controls.maxDistance = 2000;
// Don't let users flip upside-down; the grid floor reads as down.
controls.maxPolarAngle = Math.PI * 0.95;

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
keyLight.position.set(80, 140, 100);
scene.add(keyLight);
const fillLight = new THREE.HemisphereLight(0xb6c6d6, 0x2a2a30, 0.5);
scene.add(fillLight);

// Subtle perspective grid floor.
const grid = new THREE.GridHelper(500, 40, 0x444444, 0x2a2a2a);
(grid.material as THREE.Material).transparent = true;
(grid.material as THREE.Material).opacity = 0.55;
grid.position.y = -0.01;
scene.add(grid);

function resize() {
  const w = canvasWrap.clientWidth;
  const h = canvasWrap.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

(function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
})();

// ---------- Materials ----------
const matOriginal = new THREE.MeshLambertMaterial({ color: 0xb8a274, side: THREE.DoubleSide });
const matMold = new THREE.MeshLambertMaterial({ color: 0x9aa6a0, side: THREE.DoubleSide });
const matFront = new THREE.MeshLambertMaterial({ color: 0xc77a5a, side: THREE.DoubleSide });
const matBack  = new THREE.MeshLambertMaterial({ color: 0x6e8aa3, side: THREE.DoubleSide });

// ---------- State ----------
type View = 'original' | 'mold' | 'front' | 'back';
type Half = 'front' | 'back';

let manifoldModule: ManifoldToplevel | null = null;
let inputGeom: THREE.BufferGeometry | null = null;
let inputMesh: THREE.Mesh | null = null;
let inputBaseName = 'mold';

let moldGeom: THREE.BufferGeometry | null = null;
let frontGeom: THREE.BufferGeometry | null = null;
let backGeom: THREE.BufferGeometry | null = null;

let view: View = 'original';
let previewHalf: Half = 'front';
let wireframe = false;
let busy = false;

const displayMeshes: Record<View, THREE.Mesh | null> = {
  original: null, mold: null, front: null, back: null,
};

// ---------- DOM ----------
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const fileInput = $<HTMLInputElement>('file-input');
const dropEl = $('drop');
const dropText = $('drop-text');
const posX = $<HTMLInputElement>('posX');
const posXVal = $('posXVal');
const posY = $<HTMLInputElement>('posY');
const posYVal = $('posYVal');
const resSeg = $('res-seg');
const smoothing = $<HTMLInputElement>('smoothing');
const smoothingVal = $('smoothingVal');
const autoOpt = $<HTMLInputElement>('autoOpt');
const bias = $<HTMLInputElement>('bias');
const biasVal = $('biasVal');
const biasRow = $('biasRow');
const generateBtn = $<HTMLButtonElement>('generateBtn');
const generateLabel = $('generateLabel');
const halfSeg = $('half-seg');
const dlFront = $<HTMLButtonElement>('dlFront');
const dlBack = $<HTMLButtonElement>('dlBack');
const viewSeg = $('view-seg');
const wireframeBox = $<HTMLInputElement>('wireframe');
const resetView = $<HTMLButtonElement>('resetView');
const toast = $('toast');

function showToast(msg: string, duration = 2400) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ---------- Controls wiring ----------
posX.addEventListener('input', () => posXVal.textContent = posX.value);
posY.addEventListener('input', () => posYVal.textContent = posY.value);
smoothing.addEventListener('input', () => smoothingVal.textContent = smoothing.value);
bias.addEventListener('input', () => biasVal.textContent = bias.value);

let resolution = 64;
resSeg.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest('.seg') as HTMLElement | null;
  if (!t) return;
  resolution = parseInt(t.dataset.res!, 10);
  resSeg.querySelectorAll('.seg').forEach((b) => b.classList.toggle('active', b === t));
});

autoOpt.addEventListener('change', () => {
  biasRow.classList.toggle('disabled-when-auto', autoOpt.checked);
  bias.disabled = autoOpt.checked;
});
autoOpt.dispatchEvent(new Event('change'));

halfSeg.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest('.seg') as HTMLElement | null;
  if (!t) return;
  previewHalf = t.dataset.half as Half;
  halfSeg.querySelectorAll('.seg').forEach((b) => b.classList.toggle('active', b === t));
  // If currently viewing front/back, swap to the new half.
  if (view === 'front' || view === 'back') setView(previewHalf);
});

viewSeg.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest('.seg') as HTMLElement | null;
  if (!t) return;
  setView(t.dataset.view as View);
});

wireframeBox.addEventListener('change', () => {
  wireframe = wireframeBox.checked;
  applyWireframe();
});

window.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).tagName === 'INPUT') return;
  if (e.key === 'w' || e.key === 'W') {
    wireframeBox.checked = !wireframeBox.checked;
    wireframeBox.dispatchEvent(new Event('change'));
  }
});

resetView.addEventListener('click', () => frameAll());

generateBtn.addEventListener('click', () => generate());

dlFront.addEventListener('click', () => downloadSTL(frontGeom, `${inputBaseName}_front.stl`));
dlBack.addEventListener('click',  () => downloadSTL(backGeom,  `${inputBaseName}_back.stl`));

// ---------- File loading ----------
fileInput.addEventListener('change', (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) loadFile(f);
});
['dragover'].forEach((ev) => dropEl.addEventListener(ev, (e) => {
  e.preventDefault(); dropEl.classList.add('hover');
}));
dropEl.addEventListener('dragleave', () => dropEl.classList.remove('hover'));
dropEl.addEventListener('drop', (e) => {
  e.preventDefault();
  dropEl.classList.remove('hover');
  const f = (e as DragEvent).dataTransfer?.files?.[0];
  if (f) loadFile(f);
});

function loadFile(file: File) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const geom = new STLLoader().parse(reader.result as ArrayBuffer);
      inputBaseName = file.name.replace(/\.stl$/i, '').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 64) || 'mold';
      loadGeometry(geom);
      dropEl.classList.add('loaded');
      dropText.innerHTML = `<strong>${file.name}</strong>`;
    } catch (err) {
      showToast(`Failed to parse STL: ${(err as Error).message}`);
    }
  };
  reader.readAsArrayBuffer(file);
}

function loadGeometry(geom: THREE.BufferGeometry) {
  // Center + sit on ground.
  geom.computeBoundingBox();
  const bb = geom.boundingBox!;
  const center = new THREE.Vector3(); bb.getCenter(center);
  geom.translate(-center.x, -bb.min.y, -center.z);
  geom.computeVertexNormals();
  geom.computeBoundingBox();

  if (inputMesh) {
    scene.remove(inputMesh);
    inputMesh.geometry.dispose();
  }
  inputGeom = geom;
  inputMesh = new THREE.Mesh(geom, matOriginal);
  displayMeshes.original = inputMesh;

  // Clear prior outputs.
  clearOutputs();

  setView('original');
  frameAll();
  generateBtn.disabled = false;
}

function clearOutputs() {
  for (const k of ['mold', 'front', 'back'] as const) {
    const m = displayMeshes[k];
    if (m) { scene.remove(m); m.geometry.dispose(); }
    displayMeshes[k] = null;
  }
  moldGeom = frontGeom = backGeom = null;
  dlFront.disabled = true;
  dlBack.disabled = true;
}

// ---------- Camera framing ----------
function frameAll() {
  const target = activeMesh();
  if (!target) return;
  target.geometry.computeBoundingBox();
  const box = new THREE.Box3().setFromObject(target);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const dist = (maxDim / 2) / Math.tan((camera.fov * Math.PI / 180) / 2) * 1.6;
  camera.position.copy(center).add(new THREE.Vector3(0.6, 0.45, 1).normalize().multiplyScalar(dist));
  controls.target.copy(center);
  camera.near = Math.max(0.1, dist / 100);
  camera.far = Math.max(1000, dist * 50);
  camera.updateProjectionMatrix();
  controls.update();
}

function activeMesh(): THREE.Mesh | null {
  return displayMeshes[view];
}

function setView(v: View, reframe = true) {
  view = v;
  viewSeg.querySelectorAll('.seg').forEach((b) =>
    b.classList.toggle('active', (b as HTMLElement).dataset.view === v));
  for (const k of Object.keys(displayMeshes) as View[]) {
    const m = displayMeshes[k];
    if (!m) continue;
    if (k === v) {
      if (!scene.children.includes(m)) scene.add(m);
      m.visible = true;
    } else {
      m.visible = false;
    }
  }
  applyWireframe();
  if (reframe) frameAll();
}

function applyWireframe() {
  for (const k of Object.keys(displayMeshes) as View[]) {
    const m = displayMeshes[k];
    if (!m) continue;
    (m.material as THREE.MeshLambertMaterial).wireframe = wireframe;
  }
}

// ---------- Manifold init ----------
async function initManifold() {
  try {
    const mod = (await Module()) as ManifoldToplevel;
    mod.setup();
    manifoldModule = mod;
  } catch (err) {
    showToast(`Failed to init geometry engine: ${(err as Error).message}`, 5000);
  }
}
initManifold();

class ManifoldTracker {
  private items: any[] = [];
  track<T>(m: T): T {
    if (m && typeof (m as any).delete === 'function') this.items.push(m);
    return m;
  }
  deleteAll() {
    for (let i = this.items.length - 1; i >= 0; i--) {
      try { this.items[i].delete(); } catch {}
    }
    this.items = [];
  }
}

function geometryToManifoldMesh(welded: THREE.BufferGeometry) {
  const posAttr = welded.attributes.position;
  const vertProperties = new Float32Array(posAttr.array as Float32Array);
  let triVerts: Uint32Array;
  if (welded.index) {
    triVerts = new Uint32Array(welded.index.array);
  } else {
    triVerts = new Uint32Array(posAttr.count);
    for (let i = 0; i < posAttr.count; i++) triVerts[i] = i;
  }
  return new manifoldModule!.Mesh({ numProp: 3, vertProperties, triVerts });
}

function manifoldMeshToGeometry(mesh: { vertProperties: Float32Array; triVerts: Uint32Array; numProp: number }) {
  const geom = new THREE.BufferGeometry();
  const positions = mesh.numProp === 3
    ? new Float32Array(mesh.vertProperties)
    : (() => {
        const n = mesh.vertProperties.length / mesh.numProp;
        const p = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          p[i * 3 + 0] = mesh.vertProperties[i * mesh.numProp + 0];
          p[i * 3 + 1] = mesh.vertProperties[i * mesh.numProp + 1];
          p[i * 3 + 2] = mesh.vertProperties[i * mesh.numProp + 2];
        }
        return p;
      })();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setIndex(new THREE.BufferAttribute(new Uint32Array(mesh.triVerts), 1));
  geom.computeVertexNormals();
  return geom;
}

function buildRobustManifold(tracker: ManifoldTracker, geom: THREE.BufferGeometry, diag: number) {
  const M = manifoldModule!;
  const base = Math.max(1e-6, diag * 1e-6);
  for (const f of [1, 10, 100, 1000, 10000]) {
    const tol = base * f;
    const positionOnly = new THREE.BufferGeometry();
    positionOnly.setAttribute('position', geom.attributes.position);
    if (geom.index) positionOnly.setIndex(geom.index);
    const welded = mergeVertices(positionOnly, tol);
    const mesh = geometryToManifoldMesh(welded);
    const m = new M.Manifold(mesh);
    if (String(m.status()) === 'NoError' && m.numTri() > 0) {
      tracker.track(m);
      return m;
    }
    m.delete();
  }
  return null;
}

// ---------- Signed-distance via BVH ----------
// Distance is unsigned from BVH closestPointToPoint. Sign: cast a ray
// in +X from the point, count intersections; odd = inside (negative).
// Build a chamfered box as a Manifold via convex hull of 24 vertices
// (each cube corner split into 3 inset corners). Produces a low-poly
// mold envelope with sharp 45° edge bevels — way fewer triangles than
// a marching-cubes shell, and prints with crisp edges instead of the
// soft-tessellated look from voxel approaches.
function chamferedBox(w: number, h: number, d: number, c: number): Array<[number, number, number]> {
  const x = w / 2, y = h / 2, z = d / 2;
  const ch = Math.min(c, x * 0.45, y * 0.45, z * 0.45);
  const verts: Array<[number, number, number]> = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    verts.push([sx * x, sy * (y - ch), sz * (z - ch)]);
    verts.push([sx * (x - ch), sy * y, sz * (z - ch)]);
    verts.push([sx * (x - ch), sy * (y - ch), sz * z]);
  }
  return verts;
}

// ---------- Shell generation ----------
async function generate() {
  if (!manifoldModule) {
    showToast('Geometry engine not ready yet — try again in a moment.');
    return;
  }
  if (!inputGeom || !inputMesh) {
    showToast('Load an STL first.');
    return;
  }
  if (busy) return;
  busy = true;
  generateBtn.disabled = true;
  generateLabel.innerHTML = '<span class="spinner"></span> Generating…';

  // Yield so the spinner paints.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const tracker = new ManifoldTracker();
  try {
    inputGeom.computeBoundingBox();
    const bb = inputGeom.boundingBox!;
    const size = new THREE.Vector3(); bb.getSize(size);
    const center = new THREE.Vector3(); bb.getCenter(center);
    const diag = size.length();

    // Wall thickness + chamfer size scale with model size, clamped.
    const wall = Math.max(2.5, Math.min(8, diag * 0.04));
    const chamfer = Math.max(2, Math.min(6, diag * 0.025));

    const { Manifold } = manifoldModule;
    const t = <T,>(m: T): T => tracker.track(m);

    // Outer chamfered envelope: master bbox + wall on every side.
    const outerW = size.x + 2 * wall;
    const outerH = size.y + 2 * wall;
    const outerD = size.z + 2 * wall;
    const envelopeVerts = chamferedBox(outerW, outerH, outerD, chamfer);
    const envelope = t(Manifold.hull(envelopeVerts));
    // Translate the envelope from origin-centered to wrap the master.
    // Master sits at y=0..size.y; envelope sits at y=-wall..size.y+wall.
    const envelopeT = t(envelope.translate([center.x, center.y, center.z]));

    // Master manifold (for subtraction). buildRobustManifold welds + validates.
    const masterManifold = buildRobustManifold(tracker, inputGeom, diag);
    if (!masterManifold) {
      throw new Error('Master mesh is non-manifold — try repairing in Bambu Studio or Blender first.');
    }

    // Shell = envelope − master.
    const shell = t(envelopeT.subtract(masterManifold));

    // Optional Laplacian smoothing pass on the shell.
    const smoothPasses = parseInt(smoothing.value, 10);

    // Contour split: flat parting plane. X/Y sliders shift the plane.
    const dx = parseFloat(posX.value);
    const dy = parseFloat(posY.value);
    type Axis = 'x' | 'y' | 'z';
    let axis: Axis;
    if (autoOpt.checked) {
      axis = (size.x >= size.y && size.x >= size.z) ? 'x' :
             (size.y >= size.z ? 'y' : 'z');
    } else {
      const b = parseFloat(bias.value);
      axis = b < 33.33 ? 'x' : (b < 66.66 ? 'y' : 'z');
    }

    const bigDim = Math.max(size.x, size.y, size.z) * 50 + 1000;
    const cutCenter: [number, number, number] = [center.x + dx, center.y + dy, center.z];

    const cubeA = t(Manifold.cube([bigDim, bigDim, bigDim], true));
    const cubeB = t(Manifold.cube([bigDim, bigDim, bigDim], true));
    let cutA: any, cutB: any;
    if (axis === 'x') {
      cutA = t(cubeA.translate([cutCenter[0] + bigDim / 2, cutCenter[1], cutCenter[2]]));
      cutB = t(cubeB.translate([cutCenter[0] - bigDim / 2, cutCenter[1], cutCenter[2]]));
    } else if (axis === 'y') {
      cutA = t(cubeA.translate([cutCenter[0], cutCenter[1] + bigDim / 2, cutCenter[2]]));
      cutB = t(cubeB.translate([cutCenter[0], cutCenter[1] - bigDim / 2, cutCenter[2]]));
    } else {
      cutA = t(cubeA.translate([cutCenter[0], cutCenter[1], cutCenter[2] + bigDim / 2]));
      cutB = t(cubeB.translate([cutCenter[0], cutCenter[1], cutCenter[2] - bigDim / 2]));
    }

    const halfA = t(shell.intersect(cutA));
    const halfB = t(shell.intersect(cutB));
    if (halfA.numTri() === 0 || halfB.numTri() === 0) {
      throw new Error('Split produced an empty half — try a different bias or position.');
    }

    // Extract meshes BEFORE clearing prior display so a failure here
    // leaves the previous output visible.
    const meshShell = shell.getMesh();
    const meshA = halfA.getMesh();
    const meshB = halfB.getMesh();

    let gShell = manifoldMeshToGeometry(meshShell);
    let gA = manifoldMeshToGeometry(meshA);
    let gB = manifoldMeshToGeometry(meshB);

    if (smoothPasses > 0) {
      gShell = laplacianSmooth(gShell, smoothPasses);
      gA = laplacianSmooth(gA, smoothPasses);
      gB = laplacianSmooth(gB, smoothPasses);
    }

    clearOutputs();
    moldGeom = gShell;
    frontGeom = gA;
    backGeom = gB;

    displayMeshes.mold = addOutputMesh(gShell, matMold);
    displayMeshes.front = addOutputMesh(gA, matFront);
    displayMeshes.back  = addOutputMesh(gB, matBack);

    dlFront.disabled = false;
    dlBack.disabled = false;
    // Default to "Front" view after generation so the user can
    // immediately SEE the cavity carved out of the shell. Showing
    // "Mold" first looks wrong because the cavity is hidden inside.
    setView('front');
    showToast(`Shell generated (${meshShell.triVerts.length / 3} tris) · ${meshA.triVerts.length / 3 + meshB.triVerts.length / 3} tris in halves`);
  } catch (err) {
    const msg = (err as Error).message || String(err);
    console.error('Generation failed', err);
    showToast(`Generation failed: ${msg}`, 6000);
  } finally {
    tracker.deleteAll();
    busy = false;
    generateBtn.disabled = false;
    generateLabel.textContent = 'Contour Split';
  }
}

function addOutputMesh(geom: THREE.BufferGeometry, mat: THREE.Material) {
  const m = new THREE.Mesh(geom, mat);
  m.visible = false;
  scene.add(m);
  return m;
}

// ---------- Laplacian smoothing ----------
// One pass: each vertex moves toward the average of its neighbors.
// Operates on the indexed geometry's position attribute in place,
// then recomputes normals.
function laplacianSmooth(geom: THREE.BufferGeometry, passes: number): THREE.BufferGeometry {
  const idx = geom.index;
  const pos = geom.attributes.position;
  if (!idx) return geom;
  const nVerts = pos.count;
  const arr = pos.array as Float32Array;
  // Build adjacency once (set per vertex to dedupe).
  const adj: Set<number>[] = Array.from({ length: nVerts }, () => new Set<number>());
  const ix = idx.array as Uint32Array;
  for (let i = 0; i < ix.length; i += 3) {
    const a = ix[i], b = ix[i + 1], c = ix[i + 2];
    adj[a].add(b); adj[a].add(c);
    adj[b].add(a); adj[b].add(c);
    adj[c].add(a); adj[c].add(b);
  }
  const lambda = 0.5;
  let src: Float32Array = new Float32Array(arr);
  let dst: Float32Array = new Float32Array(arr.length);
  for (let pass = 0; pass < passes; pass++) {
    for (let v = 0; v < nVerts; v++) {
      const neighbors = adj[v];
      let sx = 0, sy = 0, sz = 0;
      for (const n of neighbors) {
        sx += src[n * 3 + 0]; sy += src[n * 3 + 1]; sz += src[n * 3 + 2];
      }
      const k = neighbors.size || 1;
      const ax = sx / k, ay = sy / k, az = sz / k;
      dst[v * 3 + 0] = src[v * 3 + 0] * (1 - lambda) + ax * lambda;
      dst[v * 3 + 1] = src[v * 3 + 1] * (1 - lambda) + ay * lambda;
      dst[v * 3 + 2] = src[v * 3 + 2] * (1 - lambda) + az * lambda;
    }
    const tmp = src; src = dst; dst = tmp;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(src, 3));
  out.setIndex(geom.index!.clone());
  out.computeVertexNormals();
  return out;
}

// ---------- STL export ----------
function downloadSTL(geom: THREE.BufferGeometry | null, filename: string) {
  if (!geom) return;
  const exporter = new STLExporter();
  // STLExporter wants a Mesh or Object3D, not a raw geometry.
  const tmp = new THREE.Mesh(geom);
  const stl = exporter.parse(tmp, { binary: true } as any) as DataView;
  const blob = new Blob([stl.buffer as ArrayBuffer], { type: 'model/stl' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
