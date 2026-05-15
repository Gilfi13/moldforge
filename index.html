# Moldforge

Browser-based tool that turns a 3D model into a printable mold for the
candle / soap / resin / wax-melt market. Drop in an STL, lay out a grid of
cavities, tweak the tray parameters, download a printable STL.

The geometry pipeline runs entirely in the browser via
[manifold-3d](https://github.com/elalish/manifold) (WASM) for the booleans and
[three.js](https://threejs.org/) for the viewer.

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Modes

- **Tray** (default, primary) — a rounded-rectangle slab with a grid of
  cavities pressed into the top. Open top, no funnel. This is the mold style
  Etsy candle / soap / wax-melt sellers actually use. Configurable grid size
  (up to 6×6 = 36 cavities), spacing, outer margin, base thickness, wall
  height, corner radius, and a slight outward draft on the tray walls so the
  cured silicone slab releases cleanly.
- **Flat** — secondary, single open-top mold around one master.
- **Box** — secondary, closed box with a pour funnel and optional air vents.
  For full 3D objects you want to cast in a single pour.

The silicone-volume estimate is shown on every mold. For tray molds it
breaks down per-cavity × count → total, which is the number candle/soap
makers use to plan their silicone batches.

## STLs tested so far

Manual quick-pass against representative models. Times are on an M1 laptop
with a release build.

| Model                       | Tris  | Tray 3×3 | Flat | Box | Notes                                                 |
|-----------------------------|-------|----------|------|-----|-------------------------------------------------------|
| CHEP Calibration Cube       | 12    | OK       | OK   | OK  | Welds 36→8 verts. Tray generates in <500 ms.          |
| 3DBenchy (smoothed)         | ~225k | OK       | OK   | OK  | A few seconds in Box mode; Tray 3×3 ~2-3s.           |
| Stanford Bunny (decimated)  | ~20k  | OK       | OK   | OK  | Single coherent mesh, works without repair.           |
| Hollow vase from sculpt app | ~50k  | warn     | warn | warn| Non-manifold edges from sculpting; needs Meshmixer.   |

Generally:

- **Clean printable STLs** from CAD tools (Fusion, OnShape, Tinkercad) work
  without intervention.
- **Sculpted / scanned STLs** (Zbrush, Meshmixer scans, photogrammetry) often
  fail the manifold check at any weld tolerance. We log a clear error in the
  status panel telling the user to repair upstream — we don't try to fix the
  mesh ourselves yet.
- **Models in inches or meters** scale fine; the wall thickness slider treats
  whatever the file's units are. Use the Scale slider if you need to convert.

## What the manifold check does

After welding duplicate vertices, the input mesh is passed to Manifold's
constructor. Manifold internally checks that every edge belongs to exactly
two faces (the formal definition of a closed manifold surface). If that check
fails, no boolean can be performed — `status` returns a non-`NoError` code.

We retry with progressively larger weld tolerances (`bbox_diag × 1e-6` up to
`× 1e-2`) to handle floating-point drift in real-world STL files. If none
work, we surface a clear actionable error.

## Architecture

- `src/main.ts` — the whole app
- `index.html` — UI markup, CSS
- WASM init via `manifold-3d`'s default Module factory + `.setup()`

Memory management: every Manifold-returning operation is wrapped in a
`ManifoldTracker`. WASM allocations are explicitly freed in a `finally` block,
so generating dozens of molds in one session does not leak. See
[discussion #256](https://github.com/elalish/manifold/discussions/256) for
why this matters.

## Edge cases worth poking at

- Non-manifold input (holes, T-junctions, flipped normals) — should report a
  manifold-check failure with a clear message rather than silently producing
  empty output
- Very thin model features — wall thickness near the smallest feature can
  produce degenerate geometry
- Models with internal cavities — should be preserved on the mold side
- High polygon counts (>200k tris) — boolean time scales with output
  complexity; over a few seconds the UI is unresponsive (no worker thread
  yet)

## Tray mode specifics

- Grid is capped at **6×6 = 36 cavities**. Bigger grids quickly cross 30s of
  boolean time. The cavity-count display in the panel warns at the cap.
- Draft is applied to the **outer tray walls only**. Cavity drafting (so the
  cast piece releases more easily from the silicone) is a v2 problem.
- The "Flip master Z" button rotates the master 180° around X. Use this when
  the STL loads upside-down for the tray (most STLs have Z-up; in three.js's
  Y-up convention the model is usually correct, but some files come in
  rotated).
- Rounded outer corners use 24 segments per corner (96 around the perimeter)
  for visually-smooth fillets.

## Known limitations

- No automatic mesh repair. If Manifold rejects the input, users must repair
  upstream (Bambu Studio, Meshmixer, Blender, gltf-transform's `weld`).
- STL only for input. STL is lossy topology-wise but it's what 3D printing
  users have. Output is STL with an optional GLB export per part.
- Booleans run on the main thread. Large meshes block the UI during
  generation (the spinner is the only feedback). A worker-thread Manifold
  instance is the obvious next step.

## Tested combinations

The matrix below records the result of generating each (sample × mode)
combination at default parameter values. Methodology note: this matrix
was assembled by reading the generator code and computing the
parameter math by hand — it has **not** been clicked through in a
browser. Treat ⚠ and ✗ entries as predictions to verify before launch.

Legend: ✓ generates a valid mold with no warnings · ⚠ generates with a
warning logged · ✗ refuses to generate or produces invalid geometry.

| Sample / Mode | Tray (3×3) | Bath bomb | Split (default) |
|---|---|---|---|
| Heart    | ✓ | ⚠ | ✓ |
| Star     | ✓ | ⚠ | ✓ |
| Sphere   | ⚠ | ⚠ | ⚠ |
| Tealight | ✓ | ⚠ | ⚠ |
| Wax melt | ✓ | ⚠ | ⚠ |

See `KNOWN_ISSUES.md` for symptom + repro + suggested fix on each ⚠/✗
cell.
