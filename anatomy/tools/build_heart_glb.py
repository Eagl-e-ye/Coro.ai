#!/usr/bin/env python3
"""
build_heart_glb.py — merge a folder of BodyParts3D .obj parts into ONE .glb
whose top-level nodes are named LAD / LCX / RCA / Heart  (etc.)

Why this exists:
  BodyParts3D ships one .obj per anatomical part. A coronary artery is split
  across 6-9 of them. React Three Fiber wants ONE named mesh per thing you
  recolor. So we group, merge, recentre, rescale and export.

Usage:
  python3 build_heart_glb.py \
      --obj-dir   ./raw_obj \
      --map       ./tools/vessel_map.json \
      --scheme    SCHEME_B_heart5_0i \
      --out       ./out/heart_anatomy.glb

  # see what's in your folder first:
  python3 build_heart_glb.py --obj-dir ./raw_obj --inspect
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import trimesh

# ----------------------------------------------------------------------------
# Colors used only as a sane default in the viewer. The ML layer overrides them
# at runtime, so these are just "unknown / no prediction yet" placeholders.
# ----------------------------------------------------------------------------
DEFAULT_COLORS = {
    "LAD":        [200, 200, 205, 255],
    "LCX":        [200, 200, 205, 255],
    "RCA":        [200, 200, 205, 255],
    "LeftMain":   [200, 200, 205, 255],
    "Conduction": [230, 200, 120, 255],
    "Heart":      [196, 150, 142, 255],
}
FALLBACK_COLOR = [190, 190, 190, 255]


def find_obj(obj_dir: Path, stem: str):
    """BP9548 -> BP9548.obj, or the first file whose name contains BP9548."""
    exact = obj_dir / f"{stem}.obj"
    if exact.exists():
        return exact
    matches = sorted(p for p in obj_dir.rglob("*.obj") if stem.lower() in p.name.lower())
    return matches[0] if matches else None


def load_group(obj_dir: Path, stems, group_name: str):
    """Load every .obj in a group and concatenate into one watertight-ish mesh."""
    meshes, missing = [], []
    for stem in stems:
        path = find_obj(obj_dir, stem)
        if path is None:
            missing.append(stem)
            continue
        try:
            m = trimesh.load_mesh(path, process=False)
        except Exception as exc:                       # noqa: BLE001
            print(f"    !! {stem}: failed to load ({exc})")
            missing.append(stem)
            continue
        if isinstance(m, trimesh.Scene):
            m = m.to_geometry() if hasattr(m, "to_geometry") else trimesh.util.concatenate(
                list(m.geometry.values())
            )
        if m.vertices.shape[0] == 0:
            missing.append(stem)
            continue
        meshes.append(m)

    if missing:
        print(f"    !! {group_name}: {len(missing)} part(s) not found -> {', '.join(missing)}")
    if not meshes:
        return None

    merged = trimesh.util.concatenate(meshes)
    # trimesh >=4 renamed the cleanup helpers; support both.
    if hasattr(merged, "unique_faces"):
        merged.update_faces(merged.unique_faces())
    else:                                              # pragma: no cover
        merged.remove_duplicate_faces()
    merged.remove_unreferenced_vertices()

    rgba = DEFAULT_COLORS.get(group_name, FALLBACK_COLOR)
    merged.visual = trimesh.visual.ColorVisuals(
        mesh=merged, face_colors=np.tile(rgba, (len(merged.faces), 1))
    )
    print(f"    ok {group_name:<11} {len(meshes)} part(s) -> "
          f"{len(merged.vertices):>7,} verts  {len(merged.faces):>7,} tris")
    return merged


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--obj-dir", required=True, type=Path)
    ap.add_argument("--map", type=Path)
    ap.add_argument("--scheme", default="SCHEME_B_heart5_0i")
    ap.add_argument("--out", type=Path, default=Path("heart_anatomy.glb"))
    ap.add_argument("--target-size", type=float, default=2.0,
                    help="Longest dimension of the final model in scene units.")
    ap.add_argument("--inspect", action="store_true",
                    help="Just list the .obj files present and exit.")
    args = ap.parse_args()

    if not args.obj_dir.is_dir():
        sys.exit(f"obj-dir not found: {args.obj_dir}")

    objs = sorted(args.obj_dir.rglob("*.obj"))
    if args.inspect:
        print(f"{len(objs)} .obj file(s) in {args.obj_dir}:")
        for p in objs:
            try:
                m = trimesh.load_mesh(p, process=False)
                ext = m.extents
                print(f"  {p.name:<28} {len(m.vertices):>7,} verts  "
                      f"bbox {ext[0]:7.1f} {ext[1]:7.1f} {ext[2]:7.1f}")
            except Exception as exc:                   # noqa: BLE001
                print(f"  {p.name:<28} <unreadable: {exc}>")
        return

    if not args.map:
        sys.exit("--map is required unless you pass --inspect")
    mapping = json.loads(args.map.read_text())
    if args.scheme not in mapping:
        sys.exit(f"scheme '{args.scheme}' not in map. Available: "
                 f"{[k for k in mapping if not k.startswith('_')]}")
    # keys starting with "_" are notes/comments, and only real lists are groups
    groups = {
        k: v for k, v in mapping[args.scheme].items()
        if v and isinstance(v, list) and not k.startswith("_")
    }

    print(f"\nBuilding from {len(objs)} .obj file(s) in {args.obj_dir}")
    print(f"Scheme: {args.scheme}\n")

    scene = trimesh.Scene()
    built = {}
    for name, stems in groups.items():
        mesh = load_group(args.obj_dir, stems, name)
        if mesh is not None:
            built[name] = mesh

    if not built:
        sys.exit("\nNothing was built. Check that --scheme matches your filenames "
                 "(run with --inspect to see them).")

    # ---- recentre + rescale the WHOLE assembly together -------------------
    # Critical: compute the transform once from the combined bounds, then apply
    # the same transform to every part. Normalising parts individually would
    # destroy their relative alignment.
    all_pts = np.vstack([m.vertices for m in built.values()])
    centre = (all_pts.min(axis=0) + all_pts.max(axis=0)) / 2.0
    span = float((all_pts.max(axis=0) - all_pts.min(axis=0)).max())
    scale = args.target_size / span if span > 0 else 1.0

    print(f"\n  assembly bbox span : {span:.2f} source units")
    print(f"  centring on        : {np.round(centre, 2)}")
    print(f"  scale factor       : {scale:.6f}  -> longest side {args.target_size}")

    for name, mesh in built.items():
        mesh.apply_translation(-centre)
        mesh.apply_scale(scale)
        scene.add_geometry(mesh, geom_name=name, node_name=name)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    scene.export(args.out)
    size_mb = args.out.stat().st_size / 1e6

    print(f"\n  wrote {args.out}  ({size_mb:.2f} MB)")
    print(f"  nodes: {', '.join(built)}")
    if size_mb > 15:
        print("\n  NOTE: >15 MB will feel sluggish on a laptop without a GPU.")
        print("  Run it through gltf-transform to decimate + Draco-compress:")
        print("    npx @gltf-transform/cli optimize in.glb out.glb --compress draco")


if __name__ == "__main__":
    main()
