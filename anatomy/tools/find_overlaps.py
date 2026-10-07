#!/usr/bin/env python3
"""
find_overlaps.py — tell you which BodyParts3D parts are redundant with each other.

The problem this solves:
  heart5.0i ships the heart cut up at SEVERAL levels of detail at the same time.
  "Left ventricle", "anterior wall of left ventricle" and "myocardial zone 11"
  can all be in your folder, and the second two live *inside* the first. Merge
  all three and you have drawn the same muscle three times: triple the
  triangles, and surfaces that strobe against each other when you rotate
  (z-fighting).

  You want ONE complete layer, not every layer stacked.

Usage:
  python3 tools/find_overlaps.py --obj-dir ./raw_obj
  python3 tools/find_overlaps.py --obj-dir ./raw_obj --suggest-keep coarse
"""

import argparse
import itertools
from pathlib import Path

import numpy as np
import trimesh


def bbox_overlap_ratio(a, b):
    """Cheap prefilter: fraction of A's bbox volume that sits inside B's bbox."""
    lo = np.maximum(a.bounds[0], b.bounds[0])
    hi = np.minimum(a.bounds[1], b.bounds[1])
    if np.any(hi <= lo):
        return 0.0
    inter = np.prod(hi - lo)
    a_vol = np.prod(a.bounds[1] - a.bounds[0])
    return float(inter / a_vol) if a_vol > 0 else 0.0


def containment_fraction(a, b, n=600, seed=0):
    """What fraction of A's surface actually lies inside B.

    ~1.0 means A is swallowed by B -> keeping both draws A's tissue twice.
    """
    try:
        pts, _ = trimesh.sample.sample_surface(a, n, seed=seed)
    except TypeError:                      # older trimesh has no seed kwarg
        pts, _ = trimesh.sample.sample_surface(a, n)
    try:
        inside = b.contains(pts)
        return float(inside.mean())
    except Exception:                      # noqa: BLE001 - non-watertight mesh
        # Fall back to the bbox estimate rather than silently claiming 0.
        return bbox_overlap_ratio(a, b)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--obj-dir", required=True, type=Path)
    ap.add_argument("--threshold", type=float, default=0.80,
                    help="containment fraction above which A is 'inside' B")
    ap.add_argument("--suggest-keep", choices=["coarse", "fine"], default="coarse",
                    help="coarse = keep the big outer parts (recommended for a "
                         "backdrop); fine = keep the small detailed parts")
    ap.add_argument("--only", default=None,
                    help="substring filter, e.g. --only FMA84850. Comparing all "
                         "129 parts is thousands of mesh tests; scoping it to one "
                         "concept answers the question in seconds.")
    args = ap.parse_args()

    paths = sorted(args.obj_dir.rglob("*.obj"))
    if args.only:
        paths = [p for p in paths if args.only.lower() in p.name.lower()]
        print(f"filter '{args.only}' -> {len(paths)} file(s)")
    if not paths:
        raise SystemExit(f"no .obj files in {args.obj_dir}")

    meshes = {}
    print(f"loading {len(paths)} part(s)…")
    for p in paths:
        try:
            m = trimesh.load_mesh(p, process=False)
            if isinstance(m, trimesh.Scene):
                m = trimesh.util.concatenate(list(m.geometry.values()))
            if len(m.vertices):
                meshes[p.stem] = m
        except Exception as exc:                       # noqa: BLE001
            print(f"  !! {p.name}: {exc}")

    names = list(meshes)
    print(f"comparing {len(names) * (len(names) - 1) // 2} pair(s)…\n")

    contained_in = {n: set() for n in names}
    for a, b in itertools.permutations(names, 2):
        ma, mb = meshes[a], meshes[b]
        if bbox_overlap_ratio(ma, mb) < 0.25:          # cheap reject
            continue
        frac = containment_fraction(ma, mb)
        if frac >= args.threshold:
            contained_in[a].add(b)

    redundant = {a: bs for a, bs in contained_in.items() if bs}
    if not redundant:
        print("No part is substantially contained in another. "
              "Safe to merge them all.")
        return

    print("OVERLAPS FOUND — these parts sit inside other parts:\n")
    for a, bs in sorted(redundant.items()):
        print(f"  {a}")
        for b in sorted(bs):
            print(f"      is inside -> {b}")

    if args.suggest_keep == "coarse":
        drop = set(redundant)                           # drop the inner ones
        reason = "keeping the large outer shells"
    else:
        drop = {b for bs in redundant.values() for b in bs}
        reason = "keeping the fine detail parts"

    keep = [n for n in names if n not in drop]
    print(f"\nSUGGESTION ({reason}):")
    print(f"  keep {len(keep)} part(s): {', '.join(keep)}")
    print(f"  drop {len(drop)} part(s): {', '.join(sorted(drop))}")
    print("\nPaste the 'keep' list into the Heart group of vessel_map.json.")
    print("This is a starting point, not gospel — eyeball the result and adjust.")


if __name__ == "__main__":
    main()
